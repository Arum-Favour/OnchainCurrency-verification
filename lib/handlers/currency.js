import { createRequire } from 'module';
import { json, error } from '@/lib/api/response';

const require = createRequire(import.meta.url);
const Joi = require('joi');
const Currency = require('../../backend/models/Currency');
const { generateSerialNumber, generateCurrencyQRCode } = require('../../backend/utils/qrGenerator');
const { issueCurrency } = require('../../backend/utils/blockchain');
const { composePrintableNote } = require('../../backend/utils/noteComposer');
const {
  NAIRA_DENOMINATIONS,
  getNoteFilePath,
} = require('../../backend/constants/nairaNotes');

const createCurrencySchema = Joi.object({
  denomination: Joi.number()
    .valid(...NAIRA_DENOMINATIONS)
    .required(),
  currency: Joi.string().valid('NGN').default('NGN'),
  quantity: Joi.number().integer().min(1).max(1000).default(1),
  batchNumber: Joi.string().max(50),
  qualityGrade: Joi.string().valid('A', 'B', 'C').default('A'),
  securityFeatures: Joi.array().items(Joi.string()),
  notes: Joi.string().max(500),
  expiryDate: Joi.date().greater('now'),
});

export async function listCurrencies({ request, user }) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status');
    const denomination = searchParams.get('denomination');
    const currencyCode = searchParams.get('currency');
    const issuer = searchParams.get('issuer');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const query = {};
    if (status) query.status = status;
    if (denomination) query.denomination = parseInt(denomination, 10);
    if (currencyCode) query.currency = currencyCode;
    if (issuer) query.issuer = issuer;
    if (dateFrom || dateTo) {
      query.issueDate = {};
      if (dateFrom) query.issueDate.$gte = new Date(dateFrom);
      if (dateTo) query.issueDate.$lte = new Date(dateTo);
    }
    if (search) {
      query.$or = [
        { serialNumber: { $regex: search, $options: 'i' } },
        { qrCodeHash: { $regex: search, $options: 'i' } },
        { 'metadata.batchNumber': { $regex: search, $options: 'i' } },
      ];
    }

    if (user.role === 'user') {
      query.$or = [{ issuer: user._id }, { status: 'active', isVerified: true }];
    }

    const currencies = await Currency.find(query)
      .populate('issuer', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Currency.countDocuments(query);

    return json({
      currencies,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (err) {
    console.error('Currencies fetch error:', err);
    return error('Failed to fetch currencies', 500);
  }
}

export async function createCurrency({ request, user }) {
  try {
    const body = await request.json();
    const { error: validationError, value } = createCurrencySchema.validate(body);
    if (validationError) {
      return error(validationError.details[0].message, 400);
    }

    const {
      denomination,
      quantity,
      batchNumber,
      qualityGrade,
      securityFeatures,
      notes,
      expiryDate,
    } = value;

    const createdCurrencies = [];

    for (let i = 0; i < quantity; i++) {
      const serialNumber = await generateSerialNumber();
      const qrCodeResult = await generateCurrencyQRCode({
        serialNumber,
        denomination,
        currency: 'NGN',
        issuer: user._id,
      });

      const currencyData = {
        serialNumber,
        denomination,
        currency: 'NGN',
        qrCodeHash: qrCodeResult.qrCodeHash,
        qrCodeData: qrCodeResult.qrCodeData,
        issuer: user._id,
        issuerAddress: user.issuerAddress || user.email,
        isVerified: true,
        status: 'active',
        expiryDate,
        metadata: {
          batchNumber,
          productionDate: new Date(),
          qualityGrade,
          securityFeatures: securityFeatures || [],
          notes,
          noteAsset: getNoteFilePath(denomination),
          verificationUrl: qrCodeResult.verificationUrl,
        },
      };

      const newCurrency = new Currency(currencyData);
      await newCurrency.save();
      createdCurrencies.push(newCurrency);
    }

    const blockchainResults = [];
    if (process.env.CONTRACT_ADDRESS && process.env.PRIVATE_KEY) {
      try {
        for (const curr of createdCurrencies) {
          try {
            const blockchainResult = await issueCurrency([curr], user);
            if (blockchainResult?.[0]?.transactionHash) {
              curr.blockchain = {
                transactionHash: blockchainResult[0].transactionHash,
                blockNumber: blockchainResult[0].blockNumber,
                gasUsed: blockchainResult[0].gasUsed,
                deployedAt: new Date(),
                network: process.env.SEPOLIA_URL ? 'sepolia' : 'localhost',
                contractAddress: process.env.CONTRACT_ADDRESS,
              };
              await curr.save();
              blockchainResults.push({
                serialNumber: curr.serialNumber,
                transactionHash: blockchainResult[0].transactionHash,
                success: true,
              });
            } else {
              blockchainResults.push({
                serialNumber: curr.serialNumber,
                error: 'No transaction hash returned',
                success: false,
              });
            }
          } catch (blockchainErr) {
            blockchainResults.push({
              serialNumber: curr.serialNumber,
              error: blockchainErr.message,
              success: false,
            });
          }
        }
      } catch (blockchainErr) {
        console.error('Blockchain deployment error:', blockchainErr.message);
      }
    }

    return json(
      {
        message: `${quantity} currency notes created successfully`,
        currencies: createdCurrencies.map((c) => ({
          serialNumber: c.serialNumber,
          denomination: c.denomination,
          currency: c.currency,
          qrCodeHash: c.qrCodeHash,
          status: c.status,
          blockchain: c.blockchain,
        })),
        blockchainResults,
      },
      201
    );
  } catch (err) {
    console.error('Currency creation error:', err);
    return error('Failed to create currency', 500);
  }
}

export async function getPrintableNote({ user, params }) {
  try {
    const { serialNumber } = params;
    const currency = await Currency.findBySerialNumber(serialNumber);

    if (!currency) {
      return error('Currency not found', 404);
    }

    if (
      user.role === 'issuer' &&
      currency.issuer.toString() !== user._id.toString()
    ) {
      return error('Not authorized to print this currency', 403);
    }

    const composed = await composePrintableNote({
      denomination: currency.denomination,
      serialNumber: currency.serialNumber,
      qrCodeData: currency.qrCodeData,
      qrCodePayload: currency.metadata?.verificationUrl,
    });

    return json({
      serialNumber: currency.serialNumber,
      denomination: currency.denomination,
      currency: currency.currency,
      printableImage: composed.dataUrl,
      noteAsset: composed.noteAsset,
    });
  } catch (err) {
    console.error('Printable note generation error:', err);
    return error(err.message || 'Failed to generate printable note', 500);
  }
}

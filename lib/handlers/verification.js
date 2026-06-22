import { createRequire } from 'module';
import { json, error } from '@/lib/api/response';
import { getClientIp } from '@/lib/api/auth';

const require = createRequire(import.meta.url);
const Joi = require('joi');
const Currency = require('../../backend/models/Currency');
const { checkCurrencyValidity } = require('../../backend/utils/blockchain');

const verifyCurrencySchema = Joi.object({
  serialNumber: Joi.string().required(),
  qrCodeHash: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }).optional(),
  verificationMethod: Joi.string()
    .valid('qr_scan', 'serial_lookup', 'manual')
    .default('qr_scan'),
});

export async function verifyCurrency({ request, user }) {
  try {
    const body = await request.json();
    const { error: validationError, value } = verifyCurrencySchema.validate(body);
    if (validationError) {
      return error(validationError.details[0].message, 400);
    }

    const { serialNumber, qrCodeHash, verificationMethod } = value;
    const currency = await Currency.findBySerialNumber(serialNumber);

    if (!currency) {
      return json({
        isValid: false,
        status: 'not_found',
        message: 'Currency note not found in our database',
        serialNumber,
      });
    }

    if (currency.qrCodeHash !== qrCodeHash) {
      return json({
        isValid: false,
        status: 'qr_mismatch',
        message: 'QR code does not match the currency note',
        serialNumber,
      });
    }

    if (currency.status !== 'active') {
      return json({
        isValid: false,
        status: currency.status,
        message: `Currency note is ${currency.status}`,
        serialNumber,
      });
    }

    if (currency.expiryDate && currency.expiryDate < new Date()) {
      return json({
        isValid: false,
        status: 'expired',
        message: 'Currency note has expired',
        serialNumber,
      });
    }

    await currency.addVerification(
      user ? user._id : null,
      verificationMethod,
      getClientIp(request),
      request.headers.get('user-agent') || ''
    );

    await currency.populate('issuer', 'profile.firstName profile.lastName organization');

    let blockchainData = null;
    if (
      process.env.CONTRACT_ADDRESS &&
      currency.blockchain &&
      currency.blockchain.transactionHash
    ) {
      try {
        blockchainData = await checkCurrencyValidity(currency.blockchain.transactionHash);
      } catch (blockchainErr) {
        console.log('Blockchain verification not available:', blockchainErr.message);
      }
    }

    return json({
      isValid: true,
      status: 'valid',
      message: 'Currency note is authentic and valid',
      currency: {
        serialNumber: currency.serialNumber,
        denomination: currency.denomination,
        currency: currency.currency,
        issueDate: currency.issueDate,
        issuer: currency.issuer,
        verificationCount: currency.verificationCount + 1,
        ageInDays: currency.ageInDays,
        blockchain: currency.blockchain,
        blockchainVerification: blockchainData,
      },
    });
  } catch (err) {
    console.error('Verification error:', err);
    return error('Verification failed', 500);
  }
}

export async function quickVerify({ params }) {
  try {
    const { serialNumber } = params;
    const currency = await Currency.findBySerialNumber(serialNumber);

    if (!currency) {
      return json({
        isValid: false,
        status: 'not_found',
        message: 'Currency note not found',
        serialNumber,
      });
    }

    if (currency.status !== 'active') {
      return json({
        isValid: false,
        status: currency.status,
        message: `Currency note is ${currency.status}`,
        serialNumber: currency.serialNumber,
      });
    }

    if (currency.expiryDate && currency.expiryDate < new Date()) {
      return json({
        isValid: false,
        status: 'expired',
        message: 'Currency note has expired',
        serialNumber: currency.serialNumber,
      });
    }

    return json({
      isValid: true,
      status: 'valid',
      message: 'Currency note is active and valid',
      currency: {
        serialNumber: currency.serialNumber,
        denomination: currency.denomination,
        currency: currency.currency,
        issueDate: currency.issueDate,
        verificationCount: currency.verificationCount,
      },
    });
  } catch (err) {
    console.error('Quick verification error:', err);
    return error('Verification failed', 500);
  }
}

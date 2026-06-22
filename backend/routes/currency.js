const express = require('express');
const Joi = require('joi');
const Currency = require('../models/Currency');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { generateQRCode, generateSerialNumber, generateCurrencyQRCode } = require('../utils/qrGenerator');
const { deployContract, issueCurrency } = require('../utils/blockchain');
const { composePrintableNote } = require('../utils/noteComposer');
const { NAIRA_DENOMINATIONS, getNoteFilePath } = require('../constants/nairaNotes');

const router = express.Router();

// Validation schemas
const createCurrencySchema = Joi.object({
  denomination: Joi.number().valid(...NAIRA_DENOMINATIONS).required(),
  currency: Joi.string().valid('NGN').default('NGN'),
  quantity: Joi.number().integer().min(1).max(1000).default(1),
  batchNumber: Joi.string().max(50),
  qualityGrade: Joi.string().valid('A', 'B', 'C').default('A'),
  securityFeatures: Joi.array().items(Joi.string()),
  notes: Joi.string().max(500),
  expiryDate: Joi.date().greater('now')
});

const updateCurrencySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'expired', 'recalled', 'fraudulent'),
  notes: Joi.string().max(500)
});

// Create new currency (admin only)
router.post('/create', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = createCurrencySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { denomination, currency, quantity, batchNumber, qualityGrade, securityFeatures, notes, expiryDate } = value;
    const createdCurrencies = [];

    for (let i = 0; i < quantity; i++) {
      // Generate unique serial number
      const serialNumber = await generateSerialNumber();
      
      // Generate QR code using the proper generator (includes hash in QR data)
      const qrCodeResult = await generateCurrencyQRCode({
        serialNumber,
        denomination,
        currency,
        issuer: req.user._id
      });
      
      const qrCodeData = qrCodeResult.qrCodeData;
      const qrCodeHash = qrCodeResult.qrCodeHash;
      const verificationUrl = qrCodeResult.verificationUrl;

      // Create currency record
      const currencyData = {
        serialNumber,
        denomination,
        currency: 'NGN',
        qrCodeHash,
        qrCodeData,
        issuer: req.user._id,
        issuerAddress: req.user.issuerAddress || req.user.email,
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
          verificationUrl,
        }
      };

      const newCurrency = new Currency(currencyData);
      await newCurrency.save();
      createdCurrencies.push(newCurrency);
    }

    // Deploy to blockchain (if configured)
    const blockchainResults = [];
    console.log('🔍 Blockchain config check:');
    console.log(`   CONTRACT_ADDRESS: ${process.env.CONTRACT_ADDRESS ? 'Set' : 'Not set'}`);
    console.log(`   PRIVATE_KEY: ${process.env.PRIVATE_KEY ? 'Set' : 'Not set'}`);
    
    if (process.env.CONTRACT_ADDRESS && process.env.PRIVATE_KEY) {
      try {
        console.log(`🚀 Deploying ${createdCurrencies.length} currencies to blockchain...`);
        for (const curr of createdCurrencies) {
          try {
            console.log(`   Registering ${curr.serialNumber}...`);
            const blockchainResult = await issueCurrency([curr], req.user);
            console.log('   Blockchain result:', blockchainResult);
            
            if (blockchainResult && blockchainResult[0] && blockchainResult[0].transactionHash) {
              // Update currency with blockchain data
              curr.blockchain = {
                transactionHash: blockchainResult[0].transactionHash,
                blockNumber: blockchainResult[0].blockNumber,
                gasUsed: blockchainResult[0].gasUsed,
                deployedAt: new Date(),
                network: process.env.SEPOLIA_URL ? 'sepolia' : 'localhost',
                contractAddress: process.env.CONTRACT_ADDRESS
              };
              await curr.save();
              console.log(`   ✅ ${curr.serialNumber} registered on blockchain: ${blockchainResult[0].transactionHash}`);
              blockchainResults.push({
                serialNumber: curr.serialNumber,
                transactionHash: blockchainResult[0].transactionHash,
                success: true
              });
            } else {
              console.log(`   ⚠️  ${curr.serialNumber} registration returned no transaction hash`);
              blockchainResults.push({
                serialNumber: curr.serialNumber,
                error: 'No transaction hash returned',
                success: false
              });
            }
          } catch (blockchainError) {
            console.error(`   ❌ Failed to register ${curr.serialNumber}:`, blockchainError.message);
            blockchainResults.push({
              serialNumber: curr.serialNumber,
              error: blockchainError.message,
              success: false
            });
          }
        }
        console.log(`✅ Blockchain registration complete: ${blockchainResults.filter(r => r.success).length}/${createdCurrencies.length} successful`);
      } catch (blockchainError) {
        console.error('❌ Blockchain deployment error:', blockchainError.message);
        // Continue without blockchain for now
      }
    } else {
      console.log('⚠️  Blockchain not configured. Currencies saved to MongoDB only.');
    }

    res.status(201).json({
      message: `${quantity} currency notes created successfully`,
      currencies: createdCurrencies.map(c => ({
        serialNumber: c.serialNumber,
        denomination: c.denomination,
        currency: c.currency,
        qrCodeHash: c.qrCodeHash,
        status: c.status,
        blockchain: c.blockchain
      })),
      blockchainResults
    });
  } catch (error) {
    console.error('Currency creation error:', error);
    res.status(500).json({ error: 'Failed to create currency' });
  }
});

// Get all currencies with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      denomination, 
      currency, 
      issuer, 
      dateFrom, 
      dateTo,
      search 
    } = req.query;

    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (denomination) query.denomination = parseInt(denomination);
    if (currency) query.currency = currency;
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
        { 'metadata.batchNumber': { $regex: search, $options: 'i' } }
      ];
    }

    // Restrict access based on user role
    if (req.user.role === 'user') {
      // Users can only see their own currencies or public verification data
      query.$or = [
        { issuer: req.user._id },
        { status: 'active', isVerified: true }
      ];
    } else if (req.user.role === 'admin') {
      // Admins can see all currencies
      // No additional query restriction
    }

    const currencies = await Currency.find(query)
      .populate('issuer', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Currency.countDocuments(query);

    res.json({
      currencies,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Currencies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// Get composited printable note (serial + QR embedded on note image)
router.get('/printable/:serialNumber', authenticateToken, requireRole(['admin', 'issuer']), async (req, res) => {
  try {
    const currency = await Currency.findBySerialNumber(req.params.serialNumber);

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    if (req.user.role === 'issuer' && currency.issuer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to print this currency' });
    }

    const composed = await composePrintableNote({
      denomination: currency.denomination,
      serialNumber: currency.serialNumber,
      qrCodeData: currency.qrCodeData,
      qrCodePayload: currency.metadata?.verificationUrl,
    });

    res.json({
      serialNumber: currency.serialNumber,
      denomination: currency.denomination,
      currency: currency.currency,
      printableImage: composed.dataUrl,
      noteAsset: composed.noteAsset,
    });
  } catch (error) {
    console.error('Printable note generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate printable note' });
  }
});

// Get currency by serial number
router.get('/serial/:serialNumber', authenticateToken, async (req, res) => {
  try {
    const currency = await Currency.findBySerialNumber(req.params.serialNumber)
      .populate('issuer', 'email profile.firstName profile.lastName organization');

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Check access permissions
    if (req.user.role === 'user' && currency.issuer._id.toString() !== req.user._id.toString()) {
      // Users can only see basic verification info for currencies they don't own
      return res.json({
        serialNumber: currency.serialNumber,
        denomination: currency.denomination,
        currency: currency.currency,
        status: currency.status,
        isVerified: currency.isVerified,
        issueDate: currency.issueDate,
        verificationCount: currency.verificationCount
      });
    }

    res.json(currency);
  } catch (error) {
    console.error('Currency fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
});

// Get currency by QR code hash
router.get('/qr/:qrCodeHash', authenticateToken, async (req, res) => {
  try {
    const currency = await Currency.findByQRCode(req.params.qrCodeHash)
      .populate('issuer', 'email profile.firstName profile.lastName organization');

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Check access permissions
    if (req.user.role === 'user' && currency.issuer._id.toString() !== req.user._id.toString()) {
      // Users can only see basic verification info for currencies they don't own
      return res.json({
        serialNumber: currency.serialNumber,
        denomination: currency.denomination,
        currency: currency.currency,
        status: currency.status,
        isVerified: currency.isVerified,
        issueDate: currency.issueDate,
        verificationCount: currency.verificationCount
      });
    }

    res.json(currency);
  } catch (error) {
    console.error('Currency fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
});

// Update currency (issuer/admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = updateCurrencySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const currency = await Currency.findById(req.params.id);
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Check if user is the issuer or admin
    if (req.user.role !== 'admin' && currency.issuer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this currency' });
    }

    const updatedCurrency = await Currency.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true }
    ).populate('issuer', 'email profile.firstName profile.lastName');

    res.json({
      message: 'Currency updated successfully',
      currency: updatedCurrency
    });
  } catch (error) {
    console.error('Currency update error:', error);
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

// Get currency statistics
router.get('/stats/overview', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const query = {};
    
    // Admin can see all stats
    // No role restriction needed

    const stats = await Currency.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCurrencies: { $sum: 1 },
          totalValue: { $sum: '$denomination' },
          activeCurrencies: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          verifiedCurrencies: {
            $sum: { $cond: ['$isVerified', 1, 0] }
          },
          fraudulentCurrencies: {
            $sum: { $cond: [{ $eq: ['$status', 'fraudulent'] }, 1, 0] }
          },
          avgVerificationCount: {
            $avg: { $size: '$verificationHistory' }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalCurrencies: 0,
      totalValue: 0,
      activeCurrencies: 0,
      verifiedCurrencies: 0,
      fraudulentCurrencies: 0,
      avgVerificationCount: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Statistics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get currency by batch
router.get('/batch/:batchNumber', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const query = { 'metadata.batchNumber': req.params.batchNumber };
    
    // Admin can see all batches
    // No role restriction needed

    const currencies = await Currency.find(query)
      .populate('issuer', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    res.json({ currencies });
  } catch (error) {
    console.error('Batch fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch batch currencies' });
  }
});

// Delete currency (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const currency = await Currency.findByIdAndDelete(req.params.id);
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    res.json({ message: 'Currency deleted successfully' });
  } catch (error) {
    console.error('Currency deletion error:', error);
    res.status(500).json({ error: 'Failed to delete currency' });
  }
});

module.exports = router;

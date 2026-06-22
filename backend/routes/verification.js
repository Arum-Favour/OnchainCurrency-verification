const express = require('express');
const Joi = require('joi');
const Currency = require('../models/Currency');
const { authenticateToken, requireRole, optionalAuth, rateLimitByUser } = require('../middleware/auth');
const { checkCurrencyValidity, getCurrencyDetails } = require('../utils/blockchain');

const router = express.Router();

// Validation schemas
const verifyCurrencySchema = Joi.object({
  serialNumber: Joi.string().required(),
  qrCodeHash: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  }).optional(),
  verificationMethod: Joi.string().valid('qr_scan', 'serial_lookup', 'manual').default('qr_scan')
});

const reportFraudSchema = Joi.object({
  serialNumber: Joi.string().required(),
  reason: Joi.string().required(),
  evidence: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().max(1000).optional()
});

// Verify currency by QR code or serial number
router.post('/verify', optionalAuth, rateLimitByUser(50, 15 * 60 * 1000), async (req, res) => {
  try {
    const { error, value } = verifyCurrencySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { serialNumber, qrCodeHash, location, verificationMethod } = value;

    // Find currency by serial number
    const currency = await Currency.findBySerialNumber(serialNumber);
    
    if (!currency) {
      return res.json({
        isValid: false,
        status: 'not_found',
        message: 'Currency note not found in our database',
        serialNumber
      });
    }

    // Check if QR code hash matches
    if (currency.qrCodeHash !== qrCodeHash) {
      return res.json({
        isValid: false,
        status: 'qr_mismatch',
        message: 'QR code does not match the currency note',
        serialNumber
      });
    }

    // Check if currency is active
    if (currency.status !== 'active') {
      return res.json({
        isValid: false,
        status: currency.status,
        message: `Currency note is ${currency.status}`,
        serialNumber
      });
    }

    // Check if currency has expired
    if (currency.expiryDate && currency.expiryDate < new Date()) {
      return res.json({
        isValid: false,
        status: 'expired',
        message: 'Currency note has expired',
        serialNumber
      });
    }

    // Add verification record
    // Add verification to history (method expects individual parameters)
    await currency.addVerification(
      req.user ? req.user._id : null,  // verifier
      verificationMethod,               // method
      req.ip,                           // ipAddress
      req.get('User-Agent')             // userAgent
    );

    // Get issuer information
    await currency.populate('issuer', 'profile.firstName profile.lastName organization');

    // Check blockchain verification (if available)
    let blockchainData = null;
    if (process.env.CONTRACT_ADDRESS && currency.blockchain && currency.blockchain.transactionHash) {
      try {
        const blockchainVerification = await checkCurrencyValidity(currency.blockchain.transactionHash);
        blockchainData = blockchainVerification;
      } catch (blockchainError) {
        console.log('Blockchain verification not available:', blockchainError.message);
        // Continue without blockchain verification
      }
    }

    res.json({
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
        blockchainVerification: blockchainData
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Quick verification by serial number only
router.get('/quick/:serialNumber', optionalAuth, rateLimitByUser(100, 15 * 60 * 1000), async (req, res) => {
  try {
    const currency = await Currency.findBySerialNumber(req.params.serialNumber);
    
    if (!currency) {
      return res.json({
        isValid: false,
        status: 'not_found',
        message: 'Currency note not found',
        serialNumber: req.params.serialNumber
      });
    }

    // Basic status check
    if (currency.status !== 'active') {
      return res.json({
        isValid: false,
        status: currency.status,
        message: `Currency note is ${currency.status}`,
        serialNumber: currency.serialNumber
      });
    }

    // Check expiry
    if (currency.expiryDate && currency.expiryDate < new Date()) {
      return res.json({
        isValid: false,
        status: 'expired',
        message: 'Currency note has expired',
        serialNumber: currency.serialNumber
      });
    }

    res.json({
      isValid: true,
      status: 'valid',
      message: 'Currency note is active and valid',
      currency: {
        serialNumber: currency.serialNumber,
        denomination: currency.denomination,
        currency: currency.currency,
        issueDate: currency.issueDate,
        verificationCount: currency.verificationCount
      }
    });
  } catch (error) {
    console.error('Quick verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get verification history for a currency
router.get('/history/:serialNumber', authenticateToken, async (req, res) => {
  try {
    const currency = await Currency.findBySerialNumber(req.params.serialNumber);
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Check access permissions
    if (req.user.role === 'user' && currency.issuer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view verification history' });
    }

    const verificationHistory = currency.verificationHistory.map(verification => ({
      verifiedAt: verification.verifiedAt,
      verificationMethod: verification.verificationMethod,
      result: verification.result,
      location: verification.location,
      ipAddress: verification.ipAddress
    }));

    res.json({
      serialNumber: currency.serialNumber,
      verificationHistory,
      totalVerifications: verificationHistory.length
    });
  } catch (error) {
    console.error('Verification history error:', error);
    res.status(500).json({ error: 'Failed to fetch verification history' });
  }
});

// Report fraudulent currency
router.post('/report-fraud', authenticateToken, async (req, res) => {
  try {
    const { error, value } = reportFraudSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { serialNumber, reason, evidence, description } = value;

    const currency = await Currency.findBySerialNumber(serialNumber);
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Add fraud report
    const fraudData = {
      reportedBy: req.user._id,
      reportedAt: new Date(),
      reason,
      evidence: evidence || [],
      status: 'pending',
      description
    };

    await currency.reportFraud(fraudData);

    res.json({
      message: 'Fraud report submitted successfully',
      reportId: fraudData._id
    });
  } catch (error) {
    console.error('Fraud report error:', error);
    res.status(500).json({ error: 'Failed to submit fraud report' });
  }
});

// Get fraud reports (admin only)
router.get('/fraud-reports', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { 'fraudReports.status': status || { $exists: true } };
    
    const currencies = await Currency.find(query)
      .populate('issuer', 'email profile.firstName profile.lastName')
      .populate('fraudReports.reportedBy', 'email profile.firstName profile.lastName')
      .sort({ 'fraudReports.reportedAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Currency.countDocuments(query);

    res.json({
      fraudReports: currencies,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Fraud reports fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch fraud reports' });
  }
});

// Update fraud report status (admin only)
router.put('/fraud-reports/:currencyId/:reportId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const currency = await Currency.findById(req.params.currencyId);
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    const fraudReport = currency.fraudReports.id(req.params.reportId);
    if (!fraudReport) {
      return res.status(404).json({ error: 'Fraud report not found' });
    }

    fraudReport.status = status;
    await currency.save();

    res.json({
      message: 'Fraud report status updated successfully',
      fraudReport
    });
  } catch (error) {
    console.error('Fraud report update error:', error);
    res.status(500).json({ error: 'Failed to update fraud report' });
  }
});

// Get verification statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const query = {};
    
    // Admin can see all verification stats
    // No role restriction needed

    const stats = await Currency.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalVerifications: { $sum: { $size: '$verificationHistory' } },
          totalCurrencies: { $sum: 1 },
          verifiedCurrencies: { $sum: { $cond: ['$isVerified', 1, 0] } },
          fraudulentReports: { $sum: { $size: '$fraudReports' } },
          avgVerificationsPerCurrency: {
            $avg: { $size: '$verificationHistory' }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalVerifications: 0,
      totalCurrencies: 0,
      verifiedCurrencies: 0,
      fraudulentReports: 0,
      avgVerificationsPerCurrency: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Verification stats error:', error);
    res.status(500).json({ error: 'Failed to fetch verification statistics' });
  }
});

module.exports = router;

const express = require('express');
const Joi = require('joi');
const QRCode = require('qrcode');
const { NAIRA_DENOMINATIONS } = require('../constants/nairaNotes');
const { generateQRCode, generateSerialNumber } = require('../utils/qrGenerator');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const generateQRSchema = Joi.object({
  data: Joi.string().required(),
  size: Joi.number().integer().min(100).max(1000).default(256),
  errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').default('M'),
  margin: Joi.number().integer().min(0).max(10).default(4)
});

const batchGenerateQRSchema = Joi.object({
  count: Joi.number().integer().min(1).max(100).required(),
  dataTemplate: Joi.string().required(),
  size: Joi.number().integer().min(100).max(1000).default(256),
  errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').default('M')
});

// Generate single QR code
router.post('/generate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = generateQRSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { data, size, errorCorrectionLevel, margin } = value;

    const qrCodeOptions = {
      type: 'png',
      quality: 0.92,
      margin: margin,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: size,
      errorCorrectionLevel: errorCorrectionLevel
    };

    const qrCodeDataURL = await QRCode.toDataURL(data, qrCodeOptions);
    const qrCodeHash = require('crypto').createHash('sha256').update(data).digest('hex');

    res.json({
      qrCodeDataURL,
      qrCodeHash,
      data,
      size,
      errorCorrectionLevel
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Generate batch QR codes
router.post('/generate-batch', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = batchGenerateQRSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { count, dataTemplate, size, errorCorrectionLevel } = value;
    const qrCodes = [];

    for (let i = 0; i < count; i++) {
      const serialNumber = await generateSerialNumber();
      const data = dataTemplate.replace('{serialNumber}', serialNumber);
      
      const qrCodeOptions = {
        type: 'png',
        quality: 0.92,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: size,
        errorCorrectionLevel: errorCorrectionLevel
      };

      const qrCodeDataURL = await QRCode.toDataURL(data, qrCodeOptions);
      const qrCodeHash = require('crypto').createHash('sha256').update(data).digest('hex');

      qrCodes.push({
        serialNumber,
        qrCodeDataURL,
        qrCodeHash,
        data,
        index: i + 1
      });
    }

    res.json({
      message: `${count} QR codes generated successfully`,
      qrCodes,
      total: count
    });
  } catch (error) {
    console.error('Batch QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate batch QR codes' });
  }
});

// Generate QR code for currency
router.post('/currency/:currencyId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const Currency = require('../models/Currency');
    const currency = await Currency.findById(req.params.currencyId);
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Check if user is the issuer or admin
    if (req.user.role !== 'admin' && currency.issuer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to generate QR for this currency' });
    }

    const { size = 256, errorCorrectionLevel = 'M' } = req.body;

    const qrCodeOptions = {
      type: 'png',
      quality: 0.92,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: size,
      errorCorrectionLevel: errorCorrectionLevel
    };

    const qrCodeDataURL = await QRCode.toDataURL(currency.qrCodeData, qrCodeOptions);

    res.json({
      currency: {
        serialNumber: currency.serialNumber,
        denomination: currency.denomination,
        currency: currency.currency
      },
      qrCodeDataURL,
      qrCodeHash: currency.qrCodeHash,
      data: currency.qrCodeData
    });
  } catch (error) {
    console.error('Currency QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code for currency' });
  }
});

// Decode QR code from image
router.post('/decode', authenticateToken, async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // For now, we'll return a mock response
    // In a real implementation, you would use a QR code decoder library
    // like 'jsqr' or 'qrcode-reader' to decode the image
    
    res.json({
      message: 'QR code decoding not implemented yet',
      note: 'This endpoint would decode QR codes from uploaded images'
    });
  } catch (error) {
    console.error('QR decode error:', error);
    res.status(500).json({ error: 'Failed to decode QR code' });
  }
});

// Get QR code statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const Currency = require('../models/Currency');
    
    const query = {};
    // Admin can see all QR stats
    // No role restriction needed

    const stats = await Currency.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalQRCodes: { $sum: 1 },
          uniqueQRCodes: { $addToSet: '$qrCodeHash' },
          avgVerificationsPerQR: {
            $avg: { $size: '$verificationHistory' }
          }
        }
      },
      {
        $project: {
          totalQRCodes: 1,
          uniqueQRCodes: { $size: '$uniqueQRCodes' },
          avgVerificationsPerQR: 1
        }
      }
    ]);

    const result = stats[0] || {
      totalQRCodes: 0,
      uniqueQRCodes: 0,
      avgVerificationsPerQR: 0
    };

    res.json(result);
  } catch (error) {
    console.error('QR stats error:', error);
    res.status(500).json({ error: 'Failed to fetch QR code statistics' });
  }
});

// Validate QR code format
router.post('/validate', async (req, res) => {
  try {
    const { qrCodeData } = req.body;
    
    if (!qrCodeData) {
      return res.status(400).json({ error: 'QR code data is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrCodeData);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid QR code data format' });
    }

    // Validate required fields
    const requiredFields = ['serialNumber', 'denomination', 'currency', 'issuer', 'timestamp'];
    const missingFields = requiredFields.filter(field => !parsedData[field]);
    
    if (missingFields.length > 0) {
      return res.json({
        isValid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Validate data types
    const validations = {
      serialNumber: typeof parsedData.serialNumber === 'string',
      denomination: typeof parsedData.denomination === 'number' && NAIRA_DENOMINATIONS.includes(parsedData.denomination),
      currency: typeof parsedData.currency === 'string' && parsedData.currency.length === 3,
      issuer: typeof parsedData.issuer === 'string',
      timestamp: typeof parsedData.timestamp === 'number'
    };

    const invalidFields = Object.entries(validations)
      .filter(([field, isValid]) => !isValid)
      .map(([field]) => field);

    if (invalidFields.length > 0) {
      return res.json({
        isValid: false,
        error: `Invalid data types for fields: ${invalidFields.join(', ')}`,
        invalidFields
      });
    }

    res.json({
      isValid: true,
      message: 'QR code data is valid',
      data: parsedData
    });
  } catch (error) {
    console.error('QR validation error:', error);
    res.status(500).json({ error: 'Failed to validate QR code' });
  }
});

module.exports = router;

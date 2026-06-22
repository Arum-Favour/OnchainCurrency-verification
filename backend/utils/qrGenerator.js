const QRCode = require('qrcode');
const crypto = require('crypto');
const { NAIRA_DENOMINATIONS } = require('../constants/nairaNotes');
const { buildVerificationUrl } = require('./verificationUrl');

// Generate unique serial number
const generateSerialNumber = async () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  const hash = crypto.createHash('sha256').update(timestamp + random).digest('hex');
  return hash.substring(0, 16).toUpperCase();
};

// Generate QR code with custom options
const generateQRCode = async (data, options = {}) => {
  const defaultOptions = {
    type: 'png',
    quality: 0.92,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256,
    errorCorrectionLevel: 'M'
  };

  const qrOptions = { ...defaultOptions, ...options };
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

// Generate QR code for currency — QR image encodes a verification URL
const generateCurrencyQRCode = async (currencyData, options = {}) => {
  const basicData = {
    serialNumber: currencyData.serialNumber,
    denomination: currencyData.denomination,
    currency: currencyData.currency || 'NGN',
    issuer: String(currencyData.issuer),
    timestamp: Date.now(),
    version: '2.0',
  };

  const basicDataString = JSON.stringify(basicData);
  const qrCodeHash = crypto.createHash('sha256').update(basicDataString).digest('hex');
  const verificationUrl = buildVerificationUrl(currencyData.serialNumber);

  const qrData = {
    ...basicData,
    qrCodeHash,
    verificationUrl,
  };

  const qrCodeData = JSON.stringify(qrData);
  const qrCodePayload = verificationUrl;
  const qrCodeImage = await generateQRCode(qrCodePayload, options);

  return {
    qrCodeData,
    qrCodePayload,
    qrCodeHash,
    verificationUrl,
    qrCodeImage,
    data: qrData,
  };
};

// Generate batch QR codes
const generateBatchQRCodes = async (count, dataTemplate, options = {}) => {
  const qrCodes = [];
  
  for (let i = 0; i < count; i++) {
    const serialNumber = await generateSerialNumber();
    const data = dataTemplate.replace('{serialNumber}', serialNumber);
    
    const qrCodeImage = await generateQRCode(data, options);
    const qrCodeHash = crypto.createHash('sha256').update(data).digest('hex');
    
    qrCodes.push({
      serialNumber,
      qrCodeImage,
      qrCodeHash,
      data,
      index: i + 1
    });
  }
  
  return qrCodes;
};

// Validate QR code data
const validateQRCodeData = (qrCodeData) => {
  try {
    const data = JSON.parse(qrCodeData);
    
    const requiredFields = ['serialNumber', 'denomination', 'currency', 'issuer', 'timestamp'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      };
    }
    
    // Validate data types
    const validations = {
      serialNumber: typeof data.serialNumber === 'string',
      denomination: typeof data.denomination === 'number' && NAIRA_DENOMINATIONS.includes(data.denomination),
      currency: typeof data.currency === 'string' && data.currency.length === 3,
      issuer: typeof data.issuer === 'string',
      timestamp: typeof data.timestamp === 'number'
    };
    
    const invalidFields = Object.entries(validations)
      .filter(([field, isValid]) => !isValid)
      .map(([field]) => field);
    
    if (invalidFields.length > 0) {
      return {
        isValid: false,
        error: `Invalid data types for fields: ${invalidFields.join(', ')}`,
        invalidFields
      };
    }
    
    return {
      isValid: true,
      data
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid JSON format'
    };
  }
};

// Generate QR code with logo
const generateQRCodeWithLogo = async (data, logoPath, options = {}) => {
  const defaultOptions = {
    type: 'png',
    quality: 0.92,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256,
    errorCorrectionLevel: 'H' // Higher error correction for logo
  };

  const qrOptions = { ...defaultOptions, ...options };
  
  try {
    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
    
    // In a real implementation, you would overlay the logo on the QR code
    // This requires image processing libraries like Sharp or Canvas
    // For now, return the basic QR code
    
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`QR code with logo generation failed: ${error.message}`);
  }
};

// Generate QR code for printing
const generatePrintQRCode = async (data, options = {}) => {
  const printOptions = {
    type: 'png',
    quality: 1.0,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 512, // Higher resolution for printing
    errorCorrectionLevel: 'H'
  };

  const finalOptions = { ...printOptions, ...options };
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, finalOptions);
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`Print QR code generation failed: ${error.message}`);
  }
};

// Generate QR code with custom styling
const generateStyledQRCode = async (data, styleOptions = {}) => {
  const defaultStyle = {
    type: 'png',
    quality: 0.92,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256,
    errorCorrectionLevel: 'M'
  };

  const style = { ...defaultStyle, ...styleOptions };
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, style);
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`Styled QR code generation failed: ${error.message}`);
  }
};

module.exports = {
  generateSerialNumber,
  generateQRCode,
  generateCurrencyQRCode,
  generateBatchQRCodes,
  validateQRCodeData,
  generateQRCodeWithLogo,
  generatePrintQRCode,
  generateStyledQRCode
};

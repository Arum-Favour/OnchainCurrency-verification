const mongoose = require('mongoose');
const { NAIRA_DENOMINATIONS } = require('../constants/nairaNotes');

const currencySchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  denomination: {
    type: Number,
    required: true,
    enum: NAIRA_DENOMINATIONS
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
    uppercase: true,
    enum: ['NGN']
  },
  qrCodeHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  qrCodeData: {
    type: String,
    required: true
  },
  issuer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  issuerAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'recalled', 'fraudulent'],
    default: 'active',
    index: true
  },
  isVerified: {
    type: Boolean,
    default: true,  // Automatically verified when created by authorized issuer
    index: true
  },
  issueDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiryDate: {
    type: Date,
    index: true
  },
  verificationCount: {
    type: Number,
    default: 0
  },
  verificationHistory: [{
    verifier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['qr_scan', 'serial_number', 'manual']
    },
    ipAddress: String,
    userAgent: String,
    result: {
      type: String,
      enum: ['valid', 'invalid', 'suspicious']
    }
  }],
  fraudReports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    reason: String,
    description: String,
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed'],
      default: 'pending'
    }
  }],
  blockchain: {
    transactionHash: {
      type: String,
      index: true
    },
    blockNumber: Number,
    gasUsed: String,
    deployedAt: Date,
    network: String,
    contractAddress: String
  },
  metadata: {
    batchNumber: String,
    productionDate: {
      type: Date,
      default: Date.now
    },
    qualityGrade: {
      type: String,
      enum: ['A', 'B', 'C'],
      default: 'A'
    },
    securityFeatures: [String],
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
currencySchema.index({ issuer: 1, createdAt: -1 });
currencySchema.index({ status: 1, isVerified: 1 });
currencySchema.index({ 'metadata.batchNumber': 1 });
currencySchema.index({ issueDate: 1, status: 1 });
currencySchema.index({ denomination: 1, currency: 1 });
currencySchema.index({ issuer: 1, status: 1 });

// Virtual for total value
currencySchema.virtual('totalValue').get(function() {
  return this.denomination;
});

// Virtual for age in days
currencySchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.issueDate) / (1000 * 60 * 60 * 24));
});

// Virtual for isExpired
currencySchema.virtual('isExpired').get(function() {
  return this.expiryDate && new Date(this.expiryDate) < new Date();
});

// Method to find by serial number
currencySchema.statics.findBySerialNumber = function(serialNumber) {
  return this.findOne({ serialNumber });
};

// Method to find by QR code hash
currencySchema.statics.findByQRCode = function(qrCodeHash) {
  return this.findOne({ qrCodeHash });
};

// Method to add verification record
currencySchema.methods.addVerification = function(verifier, method, ipAddress, userAgent) {
  // Add verification record to history
  this.verificationHistory.push({
    verifier,
    method,
    ipAddress,
    userAgent,
    result: 'valid'
  });
  this.verificationCount += 1;
  // Currency is already verified when created, this just tracks who checked it
  return this.save();
};

// Method to report fraud
currencySchema.methods.reportFraud = function(reportedBy, reason, description) {
  this.fraudReports.push({
    reportedBy,
    reason,
    description
  });
  this.status = 'fraudulent';
  return this.save();
};

// Method to mark as verified
currencySchema.methods.markAsVerified = function() {
  this.isVerified = true;
  return this.save();
};

// Method to deactivate
currencySchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

// Pre-save middleware to ensure serial number and qrCodeHash are unique
currencySchema.pre('save', async function(next) {
  if (!this.isNew && !this.isModified('serialNumber') && !this.isModified('qrCodeHash')) {
    return next();
  }
  
  try {
    // Check for duplicate serial number
    const existingWithSerial = await this.constructor.findOne({ serialNumber: this.serialNumber });
    if (existingWithSerial && existingWithSerial._id.toString() !== this._id.toString()) {
      return next(new Error('Serial number already exists'));
    }
    
    // Check for duplicate QR code hash
    const existingWithQR = await this.constructor.findOne({ qrCodeHash: this.qrCodeHash });
    if (existingWithQR && existingWithQR._id.toString() !== this._id.toString()) {
      return next(new Error('QR code hash already exists'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to get safe copy (hide sensitive data)
currencySchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.qrCodeData;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Currency', currencySchema);


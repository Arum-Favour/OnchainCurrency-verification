const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const Currency = require('../models/Currency');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('user', 'admin', 'verifier').required()
});

const createAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  organization: Joi.string().max(100).allow(''),
  country: Joi.string().max(50).allow(''),
  phone: Joi.string().max(20).allow('')
});

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const [
      userStats,
      currencyStats,
      verificationStats,
      fraudStats
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Currency statistics
      Currency.aggregate([
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
            }
          }
        }
      ]),
      
      // Verification statistics
      Currency.aggregate([
        {
          $group: {
            _id: null,
            totalVerifications: { $sum: { $size: '$verificationHistory' } },
            avgVerificationsPerCurrency: {
              $avg: { $size: '$verificationHistory' }
            }
          }
        }
      ]),
      
      // Fraud statistics
      Currency.aggregate([
        {
          $group: {
            _id: null,
            totalFraudReports: { $sum: { $size: '$fraudReports' } },
            pendingFraudReports: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$fraudReports',
                    cond: { $eq: ['$$this.status', 'pending'] }
                  }
                }
              }
            }
          }
        }
      ])
    ]);

    const dashboard = {
      users: {
        total: userStats.reduce((sum, stat) => sum + stat.count, 0),
        byRole: userStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      },
      currencies: currencyStats[0] || {
        totalCurrencies: 0,
        totalValue: 0,
        activeCurrencies: 0,
        verifiedCurrencies: 0,
        fraudulentCurrencies: 0
      },
      verifications: verificationStats[0] || {
        totalVerifications: 0,
        avgVerificationsPerCurrency: 0
      },
      fraud: fraudStats[0] || {
        totalFraudReports: 0,
        pendingFraudReports: 0
      }
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get all users with pagination and filtering
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      search, 
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.organization': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password -twoFactorSecret')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role
router.put('/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = updateUserRoleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { role } = value;
    const userId = req.params.id;

    // Prevent admin from changing their own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, select: '-password -twoFactorSecret' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('User role update error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Create new admin user
router.post('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = createAdminSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, firstName, lastName, organization, country, phone } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const admin = new User({
      email,
      password,
      role: 'admin',
      profile: {
        firstName,
        lastName,
        organization: organization || undefined,
        country: country || undefined,
        phone: phone || undefined,
      },
      isEmailVerified: true,
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin user created successfully',
      user: admin.getPublicProfile(),
    });
  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create new issuer (legacy)
router.post('/issuers', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = createAdminSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, firstName, lastName, organization, country, phone } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const admin = new User({
      email,
      password: password || 'tempPassword123',
      role: 'admin',
      profile: {
        firstName,
        lastName,
        organization,
        country,
        phone
      },
      isEmailVerified: false
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: admin.getPublicProfile(),
    });
  } catch (error) {
    console.error('Issuer creation error:', error);
    res.status(500).json({ error: 'Failed to create issuer' });
  }
});

// Get all currencies with admin filters
router.get('/currencies', authenticateToken, requireRole(['admin']), async (req, res) => {
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
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

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

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const currencies = await Currency.find(query)
      .populate('issuer', 'email profile.firstName profile.lastName organization')
      .sort(sortOptions)
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
    console.error('Admin currencies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// Get fraud reports
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

// Update fraud report status
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

// Get system logs (mock implementation)
router.get('/logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, level, dateFrom, dateTo } = req.query;
    
    // This would typically query a logging database
    // For now, return mock data
    const mockLogs = [
      {
        id: '1',
        level: 'info',
        message: 'User authentication successful',
        timestamp: new Date().toISOString(),
        userId: 'user123',
        ipAddress: '192.168.1.1'
      },
      {
        id: '2',
        level: 'warn',
        message: 'Failed login attempt',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        userId: 'user456',
        ipAddress: '192.168.1.2'
      }
    ];

    res.json({
      logs: mockLogs,
      totalPages: 1,
      currentPage: parseInt(page),
      total: mockLogs.length
    });
  } catch (error) {
    console.error('Logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Deactivate user
router.put('/users/:id/deactivate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true, select: '-password -twoFactorSecret' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deactivated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('User deactivation error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Activate user
router.put('/users/:id/activate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true, select: '-password -twoFactorSecret' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User activated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('User activation error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Get analytics data
router.get('/analytics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - (parseInt(period.replace('d', '')) * 24 * 60 * 60 * 1000));

    const analytics = await Currency.aggregate([
      {
        $match: {
          issueDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$issueDate' },
            month: { $month: '$issueDate' },
            day: { $dayOfMonth: '$issueDate' }
          },
          currenciesIssued: { $sum: 1 },
          totalValue: { $sum: '$denomination' },
          verifications: { $sum: { $size: '$verificationHistory' } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      period,
      startDate,
      endDate: now,
      analytics
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;

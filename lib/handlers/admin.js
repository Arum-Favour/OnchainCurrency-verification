import { createRequire } from 'module';
import { json, error } from '@/lib/api/response';

const require = createRequire(import.meta.url);
const Joi = require('joi');
const User = require('../../backend/models/User');
const Currency = require('../../backend/models/Currency');

const createAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  organization: Joi.string().max(100).allow(''),
  country: Joi.string().max(50).allow(''),
  phone: Joi.string().max(20).allow(''),
});

export async function getDashboard() {
  try {
    const [userStats, currencyStats, verificationStats, fraudStats] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Currency.aggregate([
        {
          $group: {
            _id: null,
            totalCurrencies: { $sum: 1 },
            totalValue: { $sum: '$denomination' },
            activeCurrencies: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            verifiedCurrencies: { $sum: { $cond: ['$isVerified', 1, 0] } },
            fraudulentCurrencies: {
              $sum: { $cond: [{ $eq: ['$status', 'fraudulent'] }, 1, 0] },
            },
          },
        },
      ]),
      Currency.aggregate([
        {
          $group: {
            _id: null,
            totalVerifications: { $sum: { $size: '$verificationHistory' } },
            avgVerificationsPerCurrency: { $avg: { $size: '$verificationHistory' } },
          },
        },
      ]),
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
                    cond: { $eq: ['$$this.status', 'pending'] },
                  },
                },
              },
            },
          },
        },
      ]),
    ]);

    return json({
      users: {
        total: userStats.reduce((sum, stat) => sum + stat.count, 0),
        byRole: userStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
      },
      currencies: currencyStats[0] || {
        totalCurrencies: 0,
        totalValue: 0,
        activeCurrencies: 0,
        verifiedCurrencies: 0,
        fraudulentCurrencies: 0,
      },
      verifications: verificationStats[0] || {
        totalVerifications: 0,
        avgVerificationsPerCurrency: 0,
      },
      fraud: fraudStats[0] || {
        totalFraudReports: 0,
        pendingFraudReports: 0,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return error('Failed to fetch dashboard statistics', 500);
  }
}

export async function getUsers({ request }) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const query = {};
    if (role) query.role = role;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.organization': { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password -twoFactorSecret')
      .sort(sortOptions)
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    return json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (err) {
    console.error('Users fetch error:', err);
    return error('Failed to fetch users', 500);
  }
}

export async function createUser({ request }) {
  try {
    const body = await request.json();
    const { error: validationError, value } = createAdminSchema.validate(body);
    if (validationError) {
      return error(validationError.details[0].message, 400);
    }

    const { email, password, firstName, lastName, organization, country, phone } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error('User with this email already exists', 400);
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

    return json(
      {
        message: 'Admin user created successfully',
        user: admin.getPublicProfile(),
      },
      201
    );
  } catch (err) {
    console.error('Admin creation error:', err);
    return error('Failed to create admin user', 500);
  }
}

export async function deleteUser({ user, params }) {
  try {
    const { id } = params;

    if (id === user._id.toString()) {
      return error('Cannot delete your own account', 400);
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return error('User not found', 404);
    }

    return json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('User deletion error:', err);
    return error('Failed to delete user', 500);
  }
}

export async function getCurrencies({ request }) {
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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

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

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const currencies = await Currency.find(query)
      .populate('issuer', 'email profile.firstName profile.lastName organization')
      .sort(sortOptions)
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
    console.error('Admin currencies fetch error:', err);
    return error('Failed to fetch currencies', 500);
  }
}

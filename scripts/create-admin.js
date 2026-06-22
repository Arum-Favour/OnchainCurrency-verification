const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User schema (simplified version of your backend model)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'issuer', 'admin'], default: 'user' },
  profile: {
    firstName: String,
    lastName: String,
    organization: String,
    country: String,
    phone: String
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/currency-verification');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin account already exists!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      return;
    }

    // Create admin account
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = new User({
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        organization: 'Currency Verification System',
        country: 'Global'
      },
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('Role: admin');

  } catch (error) {
    console.error('Error creating admin account:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Create custom admin account
async function createCustomAdmin(email, password, firstName, lastName) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/currency-verification');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`Admin account with email ${email} already exists!`);
      return;
    }

    // Create custom admin account
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const admin = new User({
      email,
      password: hashedPassword,
      role: 'admin',
      profile: {
        firstName,
        lastName,
        organization: 'Currency Verification System',
        country: 'Global'
      },
      isActive: true
    });

    await admin.save();
    console.log('✅ Custom admin account created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('Role: admin');

  } catch (error) {
    console.error('Error creating custom admin account:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.length >= 4) {
  // Create custom admin
  const [email, password, firstName, lastName] = args;
  createCustomAdmin(email, password, firstName, lastName);
} else {
  // Create default admin
  createAdmin();
}

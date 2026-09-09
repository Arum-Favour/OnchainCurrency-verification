const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');


// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const currencyRoutes = require('./routes/currency');
const adminRoutes = require('./routes/admin');
const verificationRoutes = require('./routes/verification');
const qrRoutes = require('./routes/qr');
const blockchainRoutes = require('./routes/blockchain');
const { getBlockchainStatus } = require('./utils/blockchain');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Render/load balancer so express-rate-limit can use X-Forwarded-For
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected successfully');
  
  // Check blockchain connection
  getBlockchainStatus()
    .then(status => {
      if (status.connected) {
        console.log('Blockchain connected:');
        console.log(`   Network: ${status.network.name} (chainId: ${status.network.chainId})`);
        console.log(`   Wallet: ${status.wallet.address}`);
        console.log(`   Balance: ${status.wallet.balance} ETH`);
        console.log(`   Contract: ${status.contractAddress || 'Not deployed'}`);
        console.log(`   Block: ${status.blockNumber}`);
      } else {
        console.log('⚠️  Blockchain not configured:', status.message);
        console.log('   App will run with MongoDB only (blockchain features disabled)');
      }
    })
    .catch(err => {
      console.log('⚠️  Blockchain connection error:', err.message);
      console.log('   App will run with MongoDB only (blockchain features disabled)');
    });
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

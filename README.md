# Currency Verification System

A comprehensive blockchain-powered currency verification platform that enables secure issuance, tracking, and verification of digital currencies with QR code integration.

## 🚀 Features

### Core Functionality
- **Currency Issuance**: Authorized issuers can create currencies with unique serial numbers and QR codes
- **Blockchain Integration**: All currency transactions are recorded on the blockchain for transparency
- **QR Code Verification**: Users can scan QR codes to instantly verify currency authenticity
- **Serial Number Lookup**: Manual verification using serial numbers
- **Fraud Detection**: Advanced fraud reporting and detection system

### Role-Based Access Control
- **Admin**: Full system access, user management, fraud monitoring
- **Issuer**: Create and manage currencies, view issuance statistics
- **Verifier**: Verify currencies, report fraud
- **User**: Verify currencies, basic functionality

### Security Features
- **Blockchain Security**: Tamper-proof currency records
- **QR Code Encryption**: Secure QR code generation with hash validation
- **Role-Based Permissions**: Granular access control
- **Fraud Detection**: Real-time fraud monitoring and reporting

## 🏗️ Architecture

### Frontend (Next.js)
- **React Components**: Modular, reusable UI components
- **Role-Based Dashboards**: Customized interfaces for different user roles
- **QR Code Scanner**: Camera-based QR code scanning
- **Responsive Design**: Mobile-first, accessible design

### Backend (Node.js/Express)
- **RESTful API**: Comprehensive API endpoints
- **Authentication**: JWT-based authentication system
- **Database Integration**: MongoDB for data persistence
- **Security Middleware**: Rate limiting, CORS, helmet

### Smart Contracts (Solidity)
- **ERC20 Token**: Standard token implementation
- **Currency Verification**: On-chain verification logic
- **Issuer Management**: Authorized issuer registration
- **Audit Trail**: Immutable transaction records

## 📁 Project Structure

```
currency-verification-app/
├── contracts/                 # Smart contracts
│   └── CurrencyVerification.sol
├── backend/                   # Backend API
│   ├── server.js
│   ├── models/               # Database models
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   └── utils/               # Utility functions
├── app/                     # Next.js frontend
│   ├── components/          # React components
│   ├── api/                # API routes
│   ├── page.js             # Main page
│   └── layout.js           # App layout
├── scripts/                 # Deployment scripts
├── hardhat.config.js       # Hardhat configuration
└── package.json            # Dependencies
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (local or MongoDB Atlas)
- Git
- Hardhat (for smart contracts)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd currency-verification-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp env.example .env.local
```

Update `.env.local` with your configuration:
```env
# Blockchain Configuration
CONTRACT_ADDRESS=
PRIVATE_KEY=
SEPOLIA_URL=
ETHERSCAN_API_KEY=

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/currency-verification

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 4. Database Setup
```bash
# Start MongoDB
mongod

# Or use MongoDB Atlas for cloud database
```

### 5. Smart Contract Deployment
```bash
# Compile contracts
npm run compile

# Deploy to local network
npm run deploy
```

### 6. Start Development Servers

#### Quick Start (Windows)
```bash
# Run the batch file to start both servers
start-dev.bat
```

#### Quick Start (Linux/Mac)
```bash
# Make the script executable
chmod +x start-dev.sh

# Run the script to start both servers
./start-dev.sh
```

#### Manual Start

**Backend Server** (Terminal 1):
```bash
cd backend
node server.js
```

**Frontend Server** (Terminal 2):
```bash
npm run dev
```

Access the app at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 7. Create an Admin User

```bash
# Create an admin user in MongoDB
node scripts/create-admin.js
```

See `SETUP_MONGODB.md` for detailed MongoDB setup instructions.

## 🔧 Configuration

### Smart Contract Configuration
- **Network**: Configured for local development and Sepolia testnet
- **Gas Optimization**: Optimized for cost efficiency
- **Security**: OpenZeppelin security standards

### Backend Configuration
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston for comprehensive logging

### Frontend Configuration
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context
- **API Integration**: Axios for HTTP requests

## 📱 Usage

### For Users
1. **Register/Login**: Create account or login with existing credentials
2. **Verify Currency**: Scan QR codes or enter serial numbers
3. **View Results**: Get instant verification results with currency details

### For Issuers
1. **Login**: Access issuer dashboard
2. **Issue Currency**: Create new currencies with denominations
3. **Manage Currencies**: View and manage issued currencies
4. **Track Statistics**: Monitor issuance and verification metrics

### For Admins
1. **Full Access**: Complete system administration
2. **User Management**: Manage users and roles
3. **Currency Oversight**: Monitor all currency activities
4. **Fraud Detection**: Review and manage fraud reports

## 🔐 Security Features

### Blockchain Security
- **Immutable Records**: All currency data stored on blockchain
- **Smart Contract Logic**: Automated verification and validation
- **Transaction Transparency**: Public audit trail

### Application Security
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Granular permission system
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data validation

### QR Code Security
- **Hash Validation**: SHA-256 hash verification
- **Unique Serial Numbers**: Cryptographically secure serial generation
- **Tamper Detection**: Blockchain-based integrity checks

## 🚀 Deployment

### Production Deployment
1. **Environment Setup**: Configure production environment variables
2. **Database**: Set up production MongoDB instance
3. **Blockchain**: Deploy to mainnet or production testnet
4. **Backend**: Deploy to cloud platform (AWS, GCP, Azure)
5. **Frontend**: Deploy to Vercel, Netlify, or similar

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🧪 Testing

### Smart Contract Testing
```bash
npm run test
```

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
npm run test
```

## 📊 Monitoring & Analytics

### Dashboard Metrics
- **User Statistics**: User registration and activity
- **Currency Metrics**: Issuance and verification rates
- **Fraud Detection**: Fraud reports and resolution
- **System Health**: Performance and uptime monitoring

### Blockchain Analytics
- **Transaction Tracking**: Monitor blockchain transactions
- **Gas Usage**: Optimize gas consumption
- **Network Status**: Blockchain connectivity monitoring

## 🔄 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Currency Endpoints
- `POST /api/currency/create` - Create new currency
- `GET /api/currency` - List currencies
- `GET /api/currency/:id` - Get currency details

### Verification Endpoints
- `POST /api/verification/verify` - Verify currency
- `GET /api/verification/quick/:serialNumber` - Quick verification
- `POST /api/verification/report-fraud` - Report fraud

### Admin Endpoints
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/currencies` - Currency management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

### Planned Features
- **Mobile App**: Native mobile applications
- **Advanced Analytics**: Machine learning fraud detection
- **Multi-Currency Support**: Support for multiple fiat currencies
- **Integration APIs**: Third-party service integrations
- **Advanced Reporting**: Comprehensive reporting dashboard

### Technical Improvements
- **Performance Optimization**: Enhanced scalability
- **Security Hardening**: Additional security measures
- **UI/UX Improvements**: Enhanced user experience
- **API Versioning**: Backward compatibility support

---

**Built with ❤️ for secure currency verification**
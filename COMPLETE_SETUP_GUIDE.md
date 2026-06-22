# Complete Setup Guide - MongoDB + Blockchain Integration

## 🎯 Overview

This app now uses a **hybrid architecture** combining:
- **MongoDB** - Fast, flexible database for all operations
- **Blockchain** - Immutable, verifiable records for audit trail

Both work together seamlessly!

## 🚀 Quick Start

### Step 1: Start Local Hardhat Blockchain
```bash
# Terminal 1
npx hardhat node
```

This starts a local blockchain on http://localhost:8545

### Step 2: Deploy Smart Contract
```bash
# Terminal 2
npx hardhat run scripts/deploy.js --network localhost
```

This will:
- Deploy the contract
- Save the address to `backend/.env`
- Save the address to `.env.local`

**Output:**
```
CurrencyVerification deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ Contract address saved to backend/.env
✅ Contract address saved to .env.local
```

### Step 3: Start Backend
```bash
# Terminal 3
cd backend
node server.js
```

**Look for:**
```
MongoDB connected successfully
Contract connected: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Server running on port 3001
```

### Step 4: Start Frontend
```bash
# Terminal 4
npm run dev
```

## 📋 Complete Testing Flow

### 1. Register User (MongoDB)
- Go to http://localhost:3000
- Click "Register"
- Fill in details
- Submit
- **Result:** User saved to MongoDB

### 2. Login (MongoDB)
- Click "Login"
- Enter credentials
- **Result:** Authenticated via MongoDB, JWT issued

### 3. Create Currency (MongoDB + Blockchain)
- Login as issuer
- Go to "Issue Currency"
- Enter: Denomination: 100, Quantity: 3
- Submit
- **Result:**
  - ✅ Saved to MongoDB immediately
  - ✅ Registered on blockchain (takes ~15 seconds)
  - ✅ MongoDB updated with blockchain transaction hash

### 4. Verify Currency (MongoDB + Blockchain)
- Go to "Verify Currency"
- Enter serial number
- **Result:**
  - ✅ Quick check from MongoDB
  - ✅ Immutable verification from blockchain
  - ✅ Combined results returned

## 🔍 Verification

### Check MongoDB
```javascript
use currency-verification;

// View all currencies
db.currencies.find().pretty();

// Find one with blockchain data
db.currencies.findOne({}, { serialNumber: 1, blockchain: 1 });
```

Expected output:
```json
{
  "_id": ObjectId("..."),
  "serialNumber": "CUR1234567890",
  "blockchain": {
    "transactionHash": "0xabc123...",
    "blockNumber": 12345,
    "gasUsed": "123456",
    "deployedAt": ISODate("2024-01-01T..."),
    "network": "localhost",
    "contractAddress": "0x5FbDB..."
  }
}
```

### Check Blockchain
```bash
# In Hardhat console
npx hardhat console --network localhost

> const Contract = await ethers.getContractFactory("CurrencyVerification")
> const contract = await Contract.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3")
> await contract.totalNotesIssued()
BigNumber { value: "3" }

> await contract.getSystemStats()
[
  BigNumber { value: "3" },  // totalNotes
  BigNumber { value: "300" }, // totalValue
  BigNumber { value: "3" }     // activeNotes
]
```

## 🏗️ Architecture Explained

### When Creating Currency:

```
1. User Submits Form
   ↓
2. Save to MongoDB (Fast! ~10ms)
   ↓
3. Return Success to User Immediately
   ↓
4. In Background: Register on Blockchain (Slow ~15 seconds)
   ↓
5. Update MongoDB with Blockchain Transaction Hash
   ↓
6. Now both databases have the data!
```

### When Verifying Currency:

```
1. User Requests Verification
   ↓
2. Quick Check in MongoDB (~5ms)
   ↓
3. Blockchain Verification (if available ~100ms)
   ↓
4. Return Combined Results
   ↓
5. Record Verification in Both
```

## 📊 What Gets Stored Where

### MongoDB Stores:
- ✅ Complete currency information
- ✅ User accounts and authentication
- ✅ QR codes
- ✅ Verification history
- ✅ Fraud reports
- ✅ Analytics and statistics
- ✅ **Blockchain transaction references**

### Blockchain Stores:
- ✅ Immutable currency records
- ✅ Serial number to hash mapping
- ✅ Issuer information
- ✅ Verification records
- ✅ **Tamper-proof audit trail**

## 🎯 Benefits of Hybrid Approach

| Feature | MongoDB | Blockchain |
|---------|---------|------------|
| Speed | ⚡ Instant | 🐢 15s |
| Cost | 💰 Free | 💰 Gas fees |
| Flexibility | ✅ Any structure | ⚙️ Fixed schema |
| Query Power | ✅ Complex queries | 📝 Simple lookups |
| Immutability | ❌ Can be modified | ✅ Immutable |
| Decentralization | ❌ Centralized | ✅ Decentralized |
| Verification | 📋 Database check | 🔒 Cryptographic |

**Solution:** Use both!
- MongoDB for speed and flexibility
- Blockchain for immutability and trust

## 🔐 Security Features

1. **MongoDB Security**
   - Password hashing (bcrypt)
   - JWT authentication
   - Role-based access control
   - Rate limiting
   - Input validation

2. **Blockchain Security**
   - Immutable records
   - Cryptographic verification
   - Decentralized storage
   - Public audit trail
   - No single point of failure

3. **Combined Security**
   - Double verification (MongoDB + Blockchain)
   - Fallback if blockchain is down
   - Fraud prevention (both systems)
   - Complete audit trail

## 🛠️ Environment Variables

**backend/.env:**
```env
# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=B7xP4mR9tL2Q
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# Blockchain (Added after deployment)
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
SEPOLIA_URL=http://localhost:8545
```

**Root `.env.local`:**
```env
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## 📝 Deployment Checklist

### Development (Local)
- [ ] Start Hardhat node: `npx hardhat node`
- [ ] Deploy contract: `npx hardhat run scripts/deploy.js`
- [ ] Copy contract address to `.env`
- [ ] Start backend: `cd backend && node server.js`
- [ ] Start frontend: `npm run dev`
- [ ] Test: Register, create currency, verify

### Production (Sepolia)
- [ ] Get Sepolia testnet ETH
- [ ] Update `.env` with Sepolia RPC URL
- [ ] Deploy: `npx hardhat run scripts/deploy.js --network sepolia`
- [ ] Save contract address
- [ ] Configure backend with Sepolia URL
- [ ] Test on testnet

### Production (Mainnet)
- [ ] Deploy to mainnet
- [ ] Update all environment variables
- [ ] Configure production MongoDB
- [ ] Set up monitoring
- [ ] Launch!

## 🎉 Success Indicators

You know everything is working when:

1. ✅ **MongoDB**: Users and currencies saved successfully
2. ✅ **Blockchain**: Currencies have transaction hashes in MongoDB
3. ✅ **Verification**: Returns both MongoDB and blockchain data
4. ✅ **Admin Dashboard**: Shows real-time stats from both systems
5. ✅ **No Errors**: Backend logs show blockchain integration

## 📚 Next Steps

1. **Test the integration**
   - Create currencies
   - Check MongoDB
   - Check blockchain
   - Verify functionality

2. **Monitor both systems**
   - MongoDB: Fast queries
   - Blockchain: Immutable records

3. **Production deployment**
   - Deploy to Sepolia testnet
   - Test thoroughly
   - Deploy to mainnet
   - Launch!

## 🆘 Troubleshooting

### Blockchain not connecting?
- Check Hardhat node is running: `npx hardhat node`
- Verify contract address in `.env`
- Check private key is correct

### MongoDB works but blockchain doesn't?
- System continues with MongoDB only
- Blockchain is optional enhancement
- All core features work without blockchain

### Gas errors?
- For local: Automatically provided by Hardhat
- For Sepolia: Get testnet ETH from faucet
- For mainnet: Ensure sufficient ETH

## 🎯 Summary

Your app now has:
- ✅ **MongoDB** - Fast, flexible database
- ✅ **Blockchain** - Immutable, verifiable records
- ✅ **Hybrid Architecture** - Best of both worlds
- ✅ **Graceful Degradation** - Works without blockchain
- ✅ **Complete Integration** - Both systems working together

**Everything is integrated and ready to use!** 🚀


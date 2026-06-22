const express = require('express');
const { ethers } = require('ethers');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Initialize blockchain connection
let provider, contract, wallet;

const initializeBlockchain = async () => {
  try {
    if (process.env.SEPOLIA_URL && process.env.PRIVATE_KEY) {
      provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_URL);
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    } else {
      // Use local hardhat network
      provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    }

    if (process.env.CONTRACT_ADDRESS) {
      const contractABI = [
        "function issueCurrency(uint256 _serialNumber, uint256 _denomination, string memory _qrCodeHash, string memory _metadata) external",
        "function verifyCurrency(uint256 _serialNumber, string memory _qrCodeHash) external returns (bool)",
        "function checkCurrencyValidity(uint256 _serialNumber) external view returns (bool isValid, string memory status)",
        "function getCurrencyDetails(uint256 _serialNumber) external view returns (uint256 serialNumber, uint256 denomination, address issuer, uint256 issueDate, bool isActive, bool isVerified, string memory metadata)",
        "function registerIssuer(address _issuer, string memory _name, string memory _country) external",
        "function addAuthorizedVerifier(address _verifier) external",
        "function getSystemStats() external view returns (uint256 totalNotes, uint256 totalValue, uint256 activeNotes)"
      ];

      contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
    }
  } catch (error) {
    console.error('Blockchain initialization error:', error);
  }
};

// Initialize blockchain on startup
initializeBlockchain();

// Get blockchain status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    if (!provider || !wallet) {
      return res.json({
        connected: false,
        message: 'Blockchain not configured'
      });
    }

    const network = await provider.getNetwork();
    const balance = await provider.getBalance(wallet.address);
    const blockNumber = await provider.getBlockNumber();

    res.json({
      connected: true,
      network: {
        name: network.name,
        chainId: network.chainId.toString()
      },
      wallet: {
        address: wallet.address,
        balance: ethers.utils.formatEther(balance)
      },
      blockNumber,
      contractAddress: process.env.CONTRACT_ADDRESS || null
    });
  } catch (error) {
    console.error('Blockchain status error:', error);
    res.status(500).json({ error: 'Failed to get blockchain status' });
  }
});

// Register issuer on blockchain
router.post('/register-issuer', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    if (!contract) {
      return res.status(400).json({ error: 'Smart contract not deployed' });
    }

    const { issuerAddress, name, country } = req.body;

    if (!issuerAddress || !name || !country) {
      return res.status(400).json({ error: 'Issuer address, name, and country are required' });
    }

    const tx = await contract.registerIssuer(issuerAddress, name, country);
    await tx.wait();

    res.json({
      message: 'Issuer registered successfully on blockchain',
      transactionHash: tx.hash,
      issuerAddress,
      name,
      country
    });
  } catch (error) {
    console.error('Issuer registration error:', error);
    res.status(500).json({ error: 'Failed to register issuer on blockchain' });
  }
});

// Issue currency on blockchain
router.post('/issue-currency', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    if (!contract) {
      return res.status(400).json({ error: 'Smart contract not deployed' });
    }

    const { serialNumber, denomination, qrCodeHash, metadata } = req.body;

    if (!serialNumber || !denomination || !qrCodeHash) {
      return res.status(400).json({ error: 'Serial number, denomination, and QR code hash are required' });
    }

    const tx = await contract.issueCurrency(
      serialNumber,
      denomination,
      qrCodeHash,
      metadata || ''
    );
    
    const receipt = await tx.wait();

    res.json({
      message: 'Currency issued successfully on blockchain',
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      serialNumber,
      denomination,
      qrCodeHash
    });
  } catch (error) {
    console.error('Currency issuance error:', error);
    res.status(500).json({ error: 'Failed to issue currency on blockchain' });
  }
});

// Verify currency on blockchain
router.post('/verify-currency', authenticateToken, requireRole(['verifier', 'admin']), async (req, res) => {
  try {
    if (!contract) {
      return res.status(400).json({ error: 'Smart contract not deployed' });
    }

    const { serialNumber, qrCodeHash } = req.body;

    if (!serialNumber || !qrCodeHash) {
      return res.status(400).json({ error: 'Serial number and QR code hash are required' });
    }

    const tx = await contract.verifyCurrency(serialNumber, qrCodeHash);
    await tx.wait();

    res.json({
      message: 'Currency verified successfully on blockchain',
      transactionHash: tx.hash,
      serialNumber,
      qrCodeHash,
      verified: true
    });
  } catch (error) {
    console.error('Currency verification error:', error);
    res.status(500).json({ error: 'Failed to verify currency on blockchain' });
  }
});

// Check currency validity on blockchain
router.get('/check-validity/:serialNumber', async (req, res) => {
  try {
    if (!contract) {
      return res.status(400).json({ error: 'Smart contract not deployed' });
    }

    const { serialNumber } = req.params;

    const [isValid, status] = await contract.checkCurrencyValidity(serialNumber);

    res.json({
      serialNumber,
      isValid,
      status,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Currency validity check error:', error);
    res.status(500).json({ error: 'Failed to check currency validity' });
  }
});

// Get currency details from blockchain
router.get('/currency-details/:serialNumber', async (req, res) => {
  try {
    if (!contract) {
      return res.status(400).json({ error: 'Smart contract not deployed' });
    }

    const { serialNumber } = req.params;

    const details = await contract.getCurrencyDetails(serialNumber);

    res.json({
      serialNumber: details.serialNumber.toString(),
      denomination: details.denomination.toString(),
      issuer: details.issuer,
      issueDate: new Date(parseInt(details.issueDate.toString()) * 1000).toISOString(),
      isActive: details.isActive,
      isVerified: details.isVerified,
      metadata: details.metadata
    });
  } catch (error) {
    console.error('Currency details fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch currency details from blockchain' });
  }
});

// Get system statistics from blockchain
router.get('/system-stats', async (req, res) => {
  try {
    if (!contract) {
      return res.status(400).json({ error: 'Smart contract not deployed' });
    }

    const stats = await contract.getSystemStats();

    res.json({
      totalNotes: stats.totalNotes.toString(),
      totalValue: stats.totalValue.toString(),
      activeNotes: stats.activeNotes.toString(),
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('System stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics from blockchain' });
  }
});

// Add authorized verifier
router.post('/add-verifier', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    if (!contract) {
      return res.status(400).json({ error: 'Smart contract not deployed' });
    }

    const { verifierAddress } = req.body;

    if (!verifierAddress) {
      return res.status(400).json({ error: 'Verifier address is required' });
    }

    const tx = await contract.addAuthorizedVerifier(verifierAddress);
    await tx.wait();

    res.json({
      message: 'Authorized verifier added successfully',
      transactionHash: tx.hash,
      verifierAddress
    });
  } catch (error) {
    console.error('Add verifier error:', error);
    res.status(500).json({ error: 'Failed to add authorized verifier' });
  }
});

// Get transaction history
router.get('/transactions/:address', authenticateToken, async (req, res) => {
  try {
    if (!provider) {
      return res.status(400).json({ error: 'Blockchain not configured' });
    }

    const { address } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // This is a simplified implementation
    // In a real application, you would use a service like Alchemy or Infura
    // to get transaction history
    
    res.json({
      message: 'Transaction history not implemented',
      note: 'This would require integration with a blockchain explorer API'
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// Deploy contract (admin only)
router.post('/deploy-contract', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet not configured' });
    }

    // This would deploy the contract
    // For now, return a mock response
    res.json({
      message: 'Contract deployment not implemented in this endpoint',
      note: 'Use the deployment script instead: npm run deploy'
    });
  } catch (error) {
    console.error('Contract deployment error:', error);
    res.status(500).json({ error: 'Failed to deploy contract' });
  }
});

module.exports = router;

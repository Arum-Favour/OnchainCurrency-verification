const { ethers } = require('ethers');

let provider, contract, wallet;

const normalizePrivateKey = (key) => {
  if (!key) return null;
  const trimmed = String(key).trim();
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
};

const resolveRpcUrl = () => {
  const sepoliaUrl = process.env.SEPOLIA_URL?.trim();
  if (sepoliaUrl) return sepoliaUrl;
  return 'http://127.0.0.1:8545';
};

const isLocalRpc = (url) =>
  url.includes('127.0.0.1') || url.includes('localhost');

// Initialize blockchain connection
const initializeBlockchain = async () => {
  try {
    const rpcUrl = resolveRpcUrl();
    const privateKey = normalizePrivateKey(process.env.PRIVATE_KEY);

    if (!privateKey) {
      console.log('Blockchain: PRIVATE_KEY not set — blockchain signing disabled');
      return;
    }

    const network = isLocalRpc(rpcUrl)
      ? { name: 'localhost', chainId: 1337 }
      : { name: 'sepolia', chainId: 11155111 };

    provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
    wallet = new ethers.Wallet(privateKey, provider);

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
    console.error('Blockchain initialization error:', error.message);
    console.error(`   RPC URL: ${resolveRpcUrl()}`);
  }
};

// Deploy contract
const deployContract = async () => {
  try {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    // Contract deployment would go here
    // This is a placeholder for the actual deployment logic
    console.log('Contract deployment not implemented in utils');
    return null;
  } catch (error) {
    console.error('Contract deployment error:', error);
    throw error;
  }
};

// Issue currency on blockchain
const issueCurrency = async (currencies, issuer) => {
  try {
    if (!contract) {
      console.log('Contract not deployed, skipping blockchain registration');
      return [];
    }

    const results = [];
    
    for (const currency of currencies) {
      try {
        // Convert serial number to uint256 (use a hash or numeric conversion)
        const serialNumberUint = ethers.BigNumber.from(ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(currency.serialNumber)
        ));
        
        const tx = await contract.issueCurrency(
          serialNumberUint,
          currency.denomination,
          currency.qrCodeHash,
          currency.metadata?.notes || JSON.stringify({
            batchNumber: currency.metadata?.batchNumber,
            qualityGrade: currency.metadata?.qualityGrade
          })
        );
        
        const receipt = await tx.wait();
        
        results.push({
          serialNumber: currency.serialNumber,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        });
      } catch (error) {
        console.error(`Failed to issue currency ${currency.serialNumber} on blockchain:`, error);
        results.push({
          serialNumber: currency.serialNumber,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Currency issuance error:', error);
    throw error;
  }
};

// Verify currency on blockchain
const verifyCurrency = async (serialNumber, qrCodeHash) => {
  try {
    if (!contract) {
      throw new Error('Contract not deployed');
    }

    const tx = await contract.verifyCurrency(serialNumber, qrCodeHash);
    const receipt = await tx.wait();
    
    return {
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      verified: true
    };
  } catch (error) {
    console.error('Currency verification error:', error);
    throw error;
  }
};

// Check currency validity on blockchain
const checkCurrencyValidity = async (serialNumber) => {
  try {
    if (!contract) {
      return null;
    }

    // Convert serial number to uint256
    const serialNumberUint = ethers.BigNumber.from(ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(serialNumber)
    ));

    const [isValid, status] = await contract.checkCurrencyValidity(serialNumberUint);
    
    return {
      isValid,
      status,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Currency validity check error:', error);
    return null;
  }
};

// Get currency details from blockchain
const getCurrencyDetails = async (serialNumber) => {
  try {
    if (!contract) {
      return null;
    }

    // Convert serial number to uint256
    const serialNumberUint = ethers.BigNumber.from(ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(serialNumber)
    ));

    const details = await contract.getCurrencyDetails(serialNumberUint);
    
    return {
      serialNumber: details.serialNumber.toString(),
      denomination: details.denomination.toString(),
      issuer: details.issuer,
      issueDate: new Date(parseInt(details.issueDate.toString()) * 1000).toISOString(),
      isActive: details.isActive,
      isVerified: details.isVerified,
      metadata: details.metadata
    };
  } catch (error) {
    console.error('Currency details fetch error:', error);
    return null;
  }
};

// Register issuer on blockchain
const registerIssuer = async (issuerAddress, name, country) => {
  try {
    if (!contract) {
      throw new Error('Contract not deployed');
    }

    const tx = await contract.registerIssuer(issuerAddress, name, country);
    const receipt = await tx.wait();
    
    return {
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('Issuer registration error:', error);
    throw error;
  }
};

// Add authorized verifier
const addAuthorizedVerifier = async (verifierAddress) => {
  try {
    if (!contract) {
      throw new Error('Contract not deployed');
    }

    const tx = await contract.addAuthorizedVerifier(verifierAddress);
    const receipt = await tx.wait();
    
    return {
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('Add verifier error:', error);
    throw error;
  }
};

// Get system statistics from blockchain
const getSystemStats = async () => {
  try {
    if (!contract) {
      throw new Error('Contract not deployed');
    }

    const stats = await contract.getSystemStats();
    
    return {
      totalNotes: stats.totalNotes.toString(),
      totalValue: stats.totalValue.toString(),
      activeNotes: stats.activeNotes.toString(),
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('System stats fetch error:', error);
    throw error;
  }
};

// Get blockchain status
const getBlockchainStatus = async () => {
  try {
    if (!provider || !wallet) {
      return {
        connected: false,
        message: 'Blockchain not configured'
      };
    }

    const network = await provider.getNetwork();
    const balance = await provider.getBalance(wallet.address);
    const blockNumber = await provider.getBlockNumber();

    return {
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
    };
  } catch (error) {
    const rpcUrl = resolveRpcUrl();
    console.error('Blockchain status error:', error.message);
    console.error(`   RPC URL: ${rpcUrl}`);
    if (isLocalRpc(rpcUrl)) {
      console.error('   Tip: Start a local node with `npx hardhat node`');
    } else {
      console.error('   Tip: Check SEPOLIA_URL in backend/.env and your internet/API key');
    }
    throw error;
  }
};

// Initialize blockchain on module load
initializeBlockchain();

module.exports = {
  deployContract,
  issueCurrency,
  verifyCurrency,
  checkCurrencyValidity,
  getCurrencyDetails,
  registerIssuer,
  addAuthorizedVerifier,
  getSystemStats,
  getBlockchainStatus
};

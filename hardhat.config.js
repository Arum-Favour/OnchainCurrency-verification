require("@nomicfoundation/hardhat-toolbox");
const path = require("path");

// Load env from multiple locations (Hardhat only reads .env by default)
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

const getEnv = (key, fallback = undefined) => {
  const value = process.env[key];
  if (value === undefined || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim();
};

const normalizePrivateKey = (key) => {
  if (!key) return undefined;
  return key.startsWith("0x") ? key : `0x${key}`;
};

// Prefer DEPLOYER_PRIVATE_KEY for Hardhat; fall back to PRIVATE_KEY
const deployerKey = normalizePrivateKey(
  getEnv("DEPLOYER_PRIVATE_KEY") || getEnv("PRIVATE_KEY")
);

const sepoliaUrl = getEnv(
  "SEPOLIA_URL",
  "https://eth-sepolia.g.alchemy.com/v2/TymeyPi4fDPjSIkaJ9LhjgrZfffN2X5e"
);

if (!deployerKey) {
  console.warn(
    "\n⚠️  Warning: No PRIVATE_KEY or DEPLOYER_PRIVATE_KEY found in .env, .env.local, or backend/.env."
  );
  console.warn("   Sepolia deployment will fail without a funded wallet private key.\n");
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: deployerKey ? [deployerKey] : undefined,
    },
    sepolia: {
      url: sepoliaUrl,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  etherscan: {
    apiKey: getEnv("ETHERSCAN_API_KEY"),
  },
};

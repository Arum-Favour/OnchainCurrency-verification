const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  console.log(`Deploying CurrencyVerification contract to: ${networkName}\n`);

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  if (!deployer) {
    throw new Error(
      [
        "No deployer wallet configured.",
        "Hardhat could not find a private key for this network.",
        "",
        "Fix:",
        "1. Add DEPLOYER_PRIVATE_KEY (or PRIVATE_KEY) to .env.local at the project root",
        "2. Use a wallet funded with Sepolia ETH (not a Hardhat local-only account)",
        "3. Set SEPOLIA_URL to your Sepolia RPC URL (Alchemy, Infura, etc.)",
        "",
        "Example .env.local:",
        "  SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY",
        "  DEPLOYER_PRIVATE_KEY=0xYOUR_SEPOLIA_WALLET_PRIVATE_KEY",
      ].join("\n")
    );
  }

  let balance;
  try {
    balance = await deployer.getBalance();
  } catch (networkError) {
    throw new Error(
      [
        `Cannot reach Sepolia RPC at: ${hre.network.config.url}`,
        `Details: ${networkError.message}`,
        "",
        "Fix:",
        "1. Check SEPOLIA_URL in .env.local is correct",
        "2. Verify your Alchemy/Infura API key is active",
        "3. Ensure you have internet access",
      ].join("\n")
    );
  }
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

  if (networkName === "sepolia" && balance.isZero()) {
    throw new Error(
      "Deployer wallet has 0 Sepolia ETH. Get test ETH from a Sepolia faucet, then retry."
    );
  }

  const CurrencyVerification = await hre.ethers.getContractFactory("CurrencyVerification");

  console.log("Deploying...");
  const currencyVerification = await CurrencyVerification.deploy();
  await currencyVerification.deployed();

  const contractAddress = currencyVerification.address;
  console.log("\n✅ CurrencyVerification deployed to:", contractAddress);

  const backendEnvPath = path.join(__dirname, "..", "backend", ".env");
  let envContent = "";

  if (fs.existsSync(backendEnvPath)) {
    envContent = fs.readFileSync(backendEnvPath, "utf8");
  } else {
    const envExamplePath = path.join(__dirname, "..", "backend", "env.example");
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, "utf8");
    }
  }

  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
  }

  fs.writeFileSync(backendEnvPath, envContent);
  console.log("✅ Contract address saved to backend/.env");

  const rootEnvPath = path.join(__dirname, "..", ".env.local");
  let rootEnvContent = "";

  if (fs.existsSync(rootEnvPath)) {
    rootEnvContent = fs.readFileSync(rootEnvPath, "utf8");
  }

  if (rootEnvContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
    rootEnvContent = rootEnvContent.replace(
      /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    rootEnvContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
  }

  if (rootEnvContent.includes("CONTRACT_ADDRESS=")) {
    rootEnvContent = rootEnvContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    rootEnvContent += `CONTRACT_ADDRESS=${contractAddress}\n`;
  }

  fs.writeFileSync(rootEnvPath, rootEnvContent);
  console.log("✅ Contract address saved to .env.local");

  console.log("\n🎉 Deployment completed!");
  console.log("\nNext steps:");
  console.log("1. Restart your backend server");
  console.log("2. Create a currency to test blockchain integration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment error:", error.message || error);
    process.exit(1);
  });

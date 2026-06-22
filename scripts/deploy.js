const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying CurrencyVerification contract...\n");

  const CurrencyVerification = await hre.ethers.getContractFactory("CurrencyVerification");
  
  console.log("Deploying...");
  const currencyVerification = await CurrencyVerification.deploy();
  await currencyVerification.deployed();

  const contractAddress = currencyVerification.address;
  console.log("\n✅ CurrencyVerification deployed to:", contractAddress);
  
  // Save contract address to backend .env
  const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
  let envContent = '';
  
  // Check if file exists and read existing content
  if (fs.existsSync(backendEnvPath)) {
    envContent = fs.readFileSync(backendEnvPath, 'utf8');
  } else {
    // Read from env.example
    const envExamplePath = path.join(__dirname, '..', 'backend', 'env.example');
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
    }
  }
  
  // Update or add CONTRACT_ADDRESS
  if (envContent.includes('CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
  }
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log("✅ Contract address saved to backend/.env");

  // Also save to root .env.local
  const rootEnvPath = path.join(__dirname, '..', '.env.local');
  let rootEnvContent = '';
  
  if (fs.existsSync(rootEnvPath)) {
    rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
  }
  
  if (rootEnvContent.includes('NEXT_PUBLIC_CONTRACT_ADDRESS=')) {
    rootEnvContent = rootEnvContent.replace(/NEXT_PUBLIC_CONTRACT_ADDRESS=.*/, `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    rootEnvContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
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
    console.error("Deployment error:", error);
    process.exit(1);
  });

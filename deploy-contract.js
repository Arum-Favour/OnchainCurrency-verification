const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying CurrencyVerification contract...\n");

  const CurrencyVerification = await hre.ethers.getContractFactory("CurrencyVerification");
  
  console.log("⏳ Deploying...");
  const currencyVerification = await CurrencyVerification.deploy();
  await currencyVerification.deployed();

  const contractAddress = currencyVerification.address;
  console.log("\n✅ CurrencyVerification deployed to:", contractAddress);
  
  // Save to backend/.env
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  const backendEnvExample = path.join(__dirname, 'backend', 'env.example');
  
  let envContent = fs.existsSync(backendEnvPath) 
    ? fs.readFileSync(backendEnvPath, 'utf8')
    : fs.existsSync(backendEnvExample) 
      ? fs.readFileSync(backendEnvExample, 'utf8')
      : '';
  
  if (envContent.includes('CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    envContent += `CONTRACT_ADDRESS=${contractAddress}\n`;
  }
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log("✅ Saved to backend/.env");

  // Save to root .env.local
  const rootEnvPath = path.join(__dirname, '.env.local');
  let rootEnvContent = fs.existsSync(rootEnvPath) ? fs.readFileSync(rootEnvPath, 'utf8') : '';
  
  if (rootEnvContent.includes('NEXT_PUBLIC_CONTRACT_ADDRESS=')) {
    rootEnvContent = rootEnvContent.replace(/NEXT_PUBLIC_CONTRACT_ADDRESS=.*/g, `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    rootEnvContent += `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
  }
  
  fs.writeFileSync(rootEnvPath, rootEnvContent);
  console.log("✅ Saved to .env.local");

  console.log("\n🎉 Deployment completed!");
  console.log("\n📝 Next steps:");
  console.log("  1. cd backend && node server.js (restart backend)");
  console.log("  2. Create a test currency");
  console.log("  3. Check MongoDB for blockchain transaction hash");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment error:", error.message);
    process.exit(1);
  });


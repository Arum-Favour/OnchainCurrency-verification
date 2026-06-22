const hre = require("hardhat");

async function main() {
  console.log("🔐 Registering Issuer...\n");

  // Get the contract address from environment
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Get the deployed contract
  const CurrencyVerification = await hre.ethers.getContractFactory("CurrencyVerification");
  const contract = CurrencyVerification.attach(CONTRACT_ADDRESS);

  // Get the deployer (owner) account
  const [owner] = await hre.ethers.getSigners();
  
  // The first default Hardhat account that will be used as issuer
  const issuerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Owner:", owner.address);
  console.log("Registering issuer:", issuerAddress);
  console.log();

  // Register the issuer
  const tx = await contract.registerIssuer(
    issuerAddress,
    "Default Issuer",
    "USA"
  );

  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");
  
  const receipt = await tx.wait();
  
  console.log("✅ Issuer registered successfully!");
  console.log("   Block:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString());
  
  // Verify the issuer was registered
  const issuerInfo = await contract.issuers(issuerAddress);
  console.log("\n📋 Issuer Details:");
  console.log("   Address:", issuerInfo.issuerAddress);
  console.log("   Name:", issuerInfo.name);
  console.log("   Country:", issuerInfo.country);
  console.log("   Authorized:", issuerInfo.isAuthorized);
  console.log("   Total Issued:", issuerInfo.totalIssued.toString());
  
  console.log("\n🎉 Done! You can now create currencies.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });


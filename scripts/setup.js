const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 Setting up HYPEY Token Ecosystem...\n");

  // Get contract addresses from environment
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  const vestingAddress = process.env.VESTING_ADDRESS;
  const multisigAddress = process.env.MULTISIG_ADDRESS;

  if (!tokenAddress || !treasuryAddress || !vestingAddress || !multisigAddress) {
    throw new Error("Missing contract addresses in .env file. Run deploy.js first.");
  }

  // Get signers
  const [deployer] = await ethers.getSigners();
  
  console.log("📋 Setup Configuration:");
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Treasury: ${treasuryAddress}`);
  console.log(`   Vesting: ${vestingAddress}`);
  console.log(`   Multisig: ${multisigAddress}`);
  console.log(`   Deployer: ${await deployer.getAddress()}`);
  console.log("");

  // Check if deployer is the same as multisig
  const deployerAddress = await deployer.getAddress();
  if (deployerAddress.toLowerCase() !== multisigAddress.toLowerCase()) {
    console.log("⚠️  Warning: Deployer is not the multisig address.");
    console.log("   For testnet, make sure you're using the correct private key.");
    console.log("   Attempting to continue with deployer account...");
  }

  // Get contract instances
  const token = await ethers.getContractAt("HYPEYToken", tokenAddress);
  const treasury = await ethers.getContractAt("HYPEYTreasury", treasuryAddress);
  const vesting = await ethers.getContractAt("HypeyVesting", vestingAddress);

  // Check current owner
  const currentOwner = await token.owner();
  console.log(`   Current token owner: ${currentOwner}`);
  
  if (currentOwner.toLowerCase() !== deployerAddress.toLowerCase()) {
    console.log("❌ Cannot proceed: Deployer is not the token owner.");
    console.log("   The token owner is the multisig address.");
    console.log("   To run setup, you need to:");
    console.log("   1. Use the multisig private key, or");
    console.log("   2. Have the multisig call these functions manually");
    return;
  }

  // Setup initial token distribution
  console.log("💰 Setting up initial token distribution...");
  
  // Distribute tokens to treasury (500M HYPEY)
  const treasuryAmount = ethers.parseEther("500000000");
  console.log(`   Distributing ${ethers.formatEther(treasuryAmount)} HYPEY to Treasury...`);
  await token.distributeInitialSupply(treasuryAddress, treasuryAmount);
  
  // Distribute tokens to vesting (1B HYPEY)
  const vestingAmount = ethers.parseEther("1000000000");
  console.log(`   Distributing ${ethers.formatEther(vestingAmount)} HYPEY to Vesting...`);
  await token.distributeInitialSupply(vestingAddress, vestingAmount);
  
  // Keep remaining in contract for future use (1.5B HYPEY)
  console.log("   ✅ Initial distribution complete");

  // Setup burn exemptions
  console.log("\n🔥 Setting up burn exemptions...");
  await token.setExemptFromBurn(treasuryAddress, true);
  await token.setExemptFromBurn(vestingAddress, true);
  await token.setExemptFromBurn(tokenAddress, true); // Contract itself
  console.log("   ✅ Burn exemptions set for system contracts");

  // Verify setup
  console.log("\n🔍 Verifying setup...");
  
  const treasuryBalance = await token.balanceOf(treasuryAddress);
  const vestingBalance = await token.balanceOf(vestingAddress);
  const contractBalance = await token.balanceOf(tokenAddress);
  
  console.log(`   Treasury Balance: ${ethers.formatEther(treasuryBalance)} HYPEY`);
  console.log(`   Vesting Balance: ${ethers.formatEther(vestingBalance)} HYPEY`);
  console.log(`   Contract Balance: ${ethers.formatEther(contractBalance)} HYPEY`);
  
  const treasuryExempt = await token.exemptFromBurn(treasuryAddress);
  const vestingExempt = await token.exemptFromBurn(vestingAddress);
  
  console.log(`   Treasury Burn Exempt: ${treasuryExempt ? '✅' : '❌'}`);
  console.log(`   Vesting Burn Exempt: ${vestingExempt ? '✅' : '❌'}`);

  console.log("\n🎉 Setup Complete!");
  console.log("The HYPEY ecosystem is ready for use.");
}

// Execute setup
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    });
}

module.exports = main;
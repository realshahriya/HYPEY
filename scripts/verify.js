import { run } from "hardhat";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Verification helper function
async function verifyContract(contractName, address, constructorArgs = []) {
  console.log(`\n=== Verifying ${contractName} ===`);
  console.log(`📍 Address: ${address}`);
  
  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ ${contractName} verified successfully!`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`ℹ️  ${contractName} is already verified`);
      return true;
    } else {
      console.error(`❌ ${contractName} verification failed:`, error.message);
      return false;
    }
  }
}

// Check if Etherscan API key is configured
function checkEtherscanConfig() {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.error("\n❌ ETHERSCAN_API_KEY not found in environment variables");
    console.error("Please add ETHERSCAN_API_KEY to your .env file");
    process.exit(1);
  }
  console.log("✅ Etherscan API key configured");
}

async function main() {
  console.log("🔍 Starting Contract Verification\n");
  
  // Check Etherscan configuration
  checkEtherscanConfig();
  
  const networkName = hre.network.name;
  const deploymentFile = join(__dirname, "..", "deployments", `${networkName}.json`);
  
  console.log(`🌐 Network: ${networkName}`);
  console.log(`📁 Looking for deployment file: ${deploymentFile}`);
  
  if (!existsSync(deploymentFile)) {
    console.error(`\n❌ Deployment file not found: ${deploymentFile}`);
    console.error("Please run deployment first with: npm run deploy");
    process.exit(1);
  }

  let deploymentData;
  try {
    deploymentData = JSON.parse(readFileSync(deploymentFile, "utf8"));
  } catch (error) {
    console.error(`\n❌ Failed to parse deployment file: ${error.message}`);
    process.exit(1);
  }
  
  // Check if deployment was successful
  if (deploymentData.status === "FAILED") {
    console.error(`\n❌ Cannot verify contracts from a failed deployment`);
    console.error("Please run a successful deployment first");
    process.exit(1);
  }
  
  console.log(`\n📋 Deployment Info:`);
  console.log(`  ⏰ Deployed: ${deploymentData.timestamp}`);
  console.log(`  👤 Deployer: ${deploymentData.deployer}`);
  console.log(`  🏢 Multisig: ${deploymentData.multisig}`);
  
  console.log(`\n🔍 Verifying contracts on ${networkName}...`);

  const verificationResults = [];
  const startTime = Date.now();
  
  try {
    // Verify all implementation contracts
    const contracts = [
      {
        name: "HYPEYToken Implementation",
        address: deploymentData.contracts.token.implementation,
        args: []
      },
      {
        name: "HYPEYTreasury Implementation",
        address: deploymentData.contracts.treasury.implementation,
        args: []
      },
      {
        name: "HypeyVesting Implementation",
        address: deploymentData.contracts.vesting.implementation,
        args: []
      }
    ];
    
    // Verify each contract
    for (const contract of contracts) {
      const success = await verifyContract(contract.name, contract.address, contract.args);
      verificationResults.push({
        name: contract.name,
        address: contract.address,
        success: success
      });
      
      // Add delay between verifications to avoid rate limiting
      if (contracts.indexOf(contract) < contracts.length - 1) {
        console.log("⏳ Waiting 3 seconds before next verification...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    const endTime = Date.now();
    const verificationDuration = (endTime - startTime) / 1000;
    
    // Display comprehensive results
    console.log("\n🎉 === Verification Summary ===");
    console.log(`⏱️  Duration: ${verificationDuration}s`);
    console.log(`🌐 Network: ${networkName}`);
    
    const successCount = verificationResults.filter(r => r.success).length;
    const totalCount = verificationResults.length;
    
    console.log(`\n📊 Results: ${successCount}/${totalCount} contracts verified`);
    
    verificationResults.forEach(result => {
      const status = result.success ? "✅" : "❌";
      console.log(`  ${status} ${result.name}`);
      console.log(`     📍 ${result.address}`);
    });
    
    console.log("\n📋 Proxy Addresses (Main Contract Addresses):");
    console.log(`  🪙 HYPEYToken: ${deploymentData.contracts.token.proxy}`);
    console.log(`  🏦 HYPEYTreasury: ${deploymentData.contracts.treasury.proxy}`);
    console.log(`  ⏰ HypeyVesting: ${deploymentData.contracts.vesting.proxy}`);
    
    console.log("\n🔗 Etherscan Links:");
    const baseUrl = getEtherscanBaseUrl(networkName);
    if (baseUrl) {
      console.log(`  🪙 Token: ${baseUrl}/address/${deploymentData.contracts.token.proxy}`);
      console.log(`  🏦 Treasury: ${baseUrl}/address/${deploymentData.contracts.treasury.proxy}`);
      console.log(`  ⏰ Vesting: ${baseUrl}/address/${deploymentData.contracts.vesting.proxy}`);
    }
    
    if (successCount === totalCount) {
      console.log("\n✅ All contracts verified successfully!");
    } else {
      console.log(`\n⚠️  ${totalCount - successCount} contract(s) failed verification`);
      console.log("Check the error messages above for details");
    }

  } catch (error) {
    console.error("\n❌ Verification process failed:", error.message);
    console.error("\n🔍 Error details:", error);
    process.exit(1);
  }
}

// Helper function to get Etherscan base URL
function getEtherscanBaseUrl(networkName) {
  const urls = {
    mainnet: "https://etherscan.io",
    goerli: "https://goerli.etherscan.io",
    sepolia: "https://sepolia.etherscan.io",
    polygon: "https://polygonscan.com",
    mumbai: "https://mumbai.polygonscan.com",
    bsc: "https://bscscan.com",
    bscTestnet: "https://testnet.bscscan.com",
    arbitrum: "https://arbiscan.io",
    arbitrumGoerli: "https://goerli.arbiscan.io",
    optimism: "https://optimistic.etherscan.io",
    optimismGoerli: "https://goerli-optimism.etherscan.io"
  };
  
  return urls[networkName] || null;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
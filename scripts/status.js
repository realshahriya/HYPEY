import hre from "hardhat";
const { ethers } = hre;
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Contract status checker
async function checkContractStatus(contractName, address) {
  console.log(`\n=== ${contractName} Status ===`);
  console.log(`📍 Address: ${address}`);
  
  try {
    // Check if contract exists
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      console.log(`❌ No contract found at address`);
      return false;
    }
    
    console.log(`✅ Contract deployed`);
    
    // Get contract instance
    const contractFactory = await ethers.getContractFactory(contractName.replace(" Proxy", ""));
    const contract = contractFactory.attach(address);
    
    // Check basic functionality
    if (contractName.includes("Token")) {
      const name = await contract.name();
      const symbol = await contract.symbol();
      const totalSupply = await contract.totalSupply();
      const owner = await contract.owner();
      
      console.log(`  🏷️  Name: ${name}`);
      console.log(`  🔤 Symbol: ${symbol}`);
      console.log(`  💰 Total Supply: ${ethers.formatEther(totalSupply)} tokens`);
      console.log(`  👤 Owner: ${owner}`);
    } else if (contractName.includes("Treasury")) {
      const owner = await contract.owner();
      const paused = await contract.paused();
      
      console.log(`  👤 Owner: ${owner}`);
      console.log(`  ⏸️  Paused: ${paused}`);
    } else if (contractName.includes("Vesting")) {
      const token = await contract.token();
      const owner = await contract.owner();
      const paused = await contract.paused();
      
      console.log(`  🪙 Token: ${token}`);
      console.log(`  👤 Owner: ${owner}`);
      console.log(`  ⏸️  Paused: ${paused}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error checking contract: ${error.message}`);
    return false;
  }
}

// Check network connectivity and gas prices
async function checkNetworkStatus() {
  console.log(`\n=== Network Status ===`);
  
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    const feeData = await ethers.provider.getFeeData();
    
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`📦 Latest Block: ${blockNumber}`);
    console.log(`⛽ Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
    
    if (feeData.maxFeePerGas) {
      console.log(`⛽ Max Fee: ${ethers.formatUnits(feeData.maxFeePerGas, "gwei")} gwei`);
      console.log(`⛽ Priority Fee: ${ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei")} gwei`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("📊 HYPEY Protocol Status Check\n");
  
  const networkName = hre.network.name;
  const deploymentFile = join(__dirname, "..", "deployments", `${networkName}.json`);
  
  // Check network status first
  const networkOk = await checkNetworkStatus();
  if (!networkOk) {
    console.error("\n❌ Network connectivity issues detected");
    process.exit(1);
  }
  
  // Check if deployment file exists
  if (!existsSync(deploymentFile)) {
    console.error(`\n❌ No deployment found for ${networkName}`);
    console.error(`Expected file: ${deploymentFile}`);
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
  
  console.log(`\n📋 Deployment Info:`);
  console.log(`  ⏰ Deployed: ${deploymentData.timestamp}`);
  console.log(`  👤 Deployer: ${deploymentData.deployer}`);
  console.log(`  🏢 Multisig: ${deploymentData.multisig}`);
  
  if (deploymentData.status === "FAILED") {
    console.error(`\n❌ Last deployment failed`);
    console.error(`Error: ${deploymentData.error}`);
    process.exit(1);
  }
  
  // Check all contracts
  const contracts = [
    { name: "HYPEYToken Proxy", address: deploymentData.contracts.token.proxy },
    { name: "HYPEYTreasury Proxy", address: deploymentData.contracts.treasury.proxy },
    { name: "HypeyVesting Proxy", address: deploymentData.contracts.vesting.proxy }
  ];
  
  const results = [];
  for (const contract of contracts) {
    const success = await checkContractStatus(contract.name, contract.address);
    results.push({ name: contract.name, success });
  }
  
  // Summary
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n🎯 === Status Summary ===`);
  console.log(`📊 Contracts: ${successCount}/${totalCount} operational`);
  
  if (successCount === totalCount) {
    console.log(`✅ All systems operational!`);
  } else {
    console.log(`⚠️  ${totalCount - successCount} contract(s) have issues`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Status check failed:", error.message);
    process.exit(1);
  });
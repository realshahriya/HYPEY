import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { upgrades } from "hardhat";

// Validate upgrade configuration
function validateUpgradeConfig() {
  const requiredVars = {
    MULTISIG_ADDRESS: process.env.MULTISIG_ADDRESS,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY
  };
  
  const missing = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missing.push(key);
    } else if (key.includes("ADDRESS") && !ethers.isAddress(value)) {
      throw new Error(`Invalid ${key}: ${value}`);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  
  console.log(`✅ Configuration validated`);
}

// Estimate gas for upgrade
async function estimateUpgradeGas(proxyAddress, newImplementation) {
  try {
    const gasEstimate = await ethers.provider.estimateGas({
      to: proxyAddress,
      data: newImplementation.interface.encodeFunctionData("upgradeTo", [await newImplementation.getAddress()])
    });
    
    const feeData = await ethers.provider.getFeeData();
    const gasCost = gasEstimate * feeData.gasPrice;
    
    console.log(`  ⛽ Estimated Gas: ${gasEstimate.toString()}`);
    console.log(`  💰 Estimated Cost: ${ethers.formatEther(gasCost)} ETH`);
    
    return { gasEstimate, gasCost };
  } catch (error) {
    console.log(`  ⚠️  Gas estimation failed: ${error.message}`);
    return null;
  }
}

// Upgrade a single contract
async function upgradeContract(contractName, proxyAddress, deployer) {
  console.log(`\n🔄 Upgrading ${contractName}...`);
  console.log(`📍 Proxy Address: ${proxyAddress}`);
  
  try {
    // Deploy new implementation
    console.log(`  📦 Deploying new implementation...`);
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    // Estimate gas for deployment
    const deployTx = await ContractFactory.getDeployTransaction();
    const deployGasEstimate = await ethers.provider.estimateGas(deployTx);
    const feeData = await ethers.provider.getFeeData();
    const deployGasCost = deployGasEstimate * feeData.gasPrice;
    
    console.log(`  ⛽ Deploy Gas: ${deployGasEstimate.toString()}`);
    console.log(`  💰 Deploy Cost: ${ethers.formatEther(deployGasCost)} ETH`);
    
    // Perform upgrade
    const upgraded = await upgrades.upgradeProxy(proxyAddress, ContractFactory);
    await upgraded.waitForDeployment();
    
    const newImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    
    console.log(`  ✅ Implementation: ${newImplAddress}`);
    console.log(`  🔗 Proxy: ${proxyAddress}`);
    
    // Verify upgrade worked
    const contract = ContractFactory.attach(proxyAddress);
    
    // Basic functionality check
    if (contractName === "HYPEYToken") {
      const name = await contract.name();
      const symbol = await contract.symbol();
      console.log(`  🏷️  Verified: ${name} (${symbol})`);
    } else if (contractName === "HYPEYTreasury") {
      const owner = await contract.owner();
      console.log(`  👤 Verified Owner: ${owner}`);
    } else if (contractName === "HypeyVesting") {
      const token = await contract.token();
      console.log(`  🪙 Verified Token: ${token}`);
    }
    
    return {
      success: true,
      proxy: proxyAddress,
      implementation: newImplAddress,
      gasUsed: deployGasEstimate
    };
    
  } catch (error) {
    console.log(`  ❌ Upgrade failed: ${error.message}`);
    return {
      success: false,
      proxy: proxyAddress,
      error: error.message
    };
  }
}

// Validate upgrade compatibility
async function validateUpgrade(contractName, proxyAddress) {
  console.log(`\n🔍 Validating ${contractName} upgrade compatibility...`);
  
  try {
    const ContractFactory = await ethers.getContractFactory(contractName);
    await upgrades.validateUpgrade(proxyAddress, ContractFactory);
    console.log(`  ✅ Upgrade validation passed`);
    return true;
  } catch (error) {
    console.log(`  ❌ Upgrade validation failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🚀 HYPEY Protocol Upgrade Tool\n");
  
  const networkName = hre.network.name;
  const deploymentFile = join(__dirname, "..", "deployments", `${networkName}.json`);
  
  // Validate configuration
  validateUpgradeConfig();
  
  // Check deployment file
  if (!existsSync(deploymentFile)) {
    console.error(`❌ No deployment found for ${networkName}`);
    console.error(`Expected file: ${deploymentFile}`);
    process.exit(1);
  }
  
  let deploymentData;
  try {
    deploymentData = JSON.parse(readFileSync(deploymentFile, "utf8"));
  } catch (error) {
    console.error(`❌ Failed to parse deployment file: ${error.message}`);
    process.exit(1);
  }
  
  if (deploymentData.status === "FAILED") {
    console.error(`❌ Cannot upgrade from failed deployment`);
    process.exit(1);
  }
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Upgrader: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.warn(`⚠️  Low balance detected. Ensure sufficient ETH for upgrades.`);
  }
  
  // Contracts to upgrade
  const contracts = [
    { name: "HYPEYToken", proxy: deploymentData.contracts.token.proxy },
    { name: "HYPEYTreasury", proxy: deploymentData.contracts.treasury.proxy },
    { name: "HypeyVesting", proxy: deploymentData.contracts.vesting.proxy }
  ];
  
  // Validate all upgrades first
  console.log(`\n🔍 === Validation Phase ===`);
  const validationResults = [];
  
  for (const contract of contracts) {
    const isValid = await validateUpgrade(contract.name, contract.proxy);
    validationResults.push({ ...contract, valid: isValid });
  }
  
  const invalidContracts = validationResults.filter(c => !c.valid);
  if (invalidContracts.length > 0) {
    console.error(`\n❌ Upgrade validation failed for:`);
    invalidContracts.forEach(c => console.error(`  - ${c.name}`));
    console.error(`\nPlease fix compatibility issues before upgrading.`);
    process.exit(1);
  }
  
  console.log(`✅ All contracts passed validation`);
  
  // Perform upgrades
  console.log(`\n🔄 === Upgrade Phase ===`);
  const upgradeResults = [];
  const startTime = Date.now();
  
  for (const contract of contracts) {
    const result = await upgradeContract(contract.name, contract.proxy, deployer);
    upgradeResults.push({ ...contract, ...result });
    
    // Wait between upgrades to avoid nonce issues
    if (contracts.indexOf(contract) < contracts.length - 1) {
      console.log(`  ⏳ Waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  // Update deployment file with upgrade info
  const upgradeData = {
    ...deploymentData,
    lastUpgrade: {
      timestamp: new Date().toISOString(),
      upgrader: deployer.address,
      duration: `${duration}s`,
      results: upgradeResults.map(r => ({
        contract: r.name,
        success: r.success,
        implementation: r.implementation,
        error: r.error
      }))
    }
  };
  
  // Update implementation addresses
  upgradeResults.forEach(result => {
    if (result.success) {
      if (result.name === "HYPEYToken") {
        upgradeData.contracts.token.implementation = result.implementation;
      } else if (result.name === "HYPEYTreasury") {
        upgradeData.contracts.treasury.implementation = result.implementation;
      } else if (result.name === "HypeyVesting") {
        upgradeData.contracts.vesting.implementation = result.implementation;
      }
    }
  });
  
  writeFileSync(deploymentFile, JSON.stringify(upgradeData, null, 2));
  
  // Summary
  const successCount = upgradeResults.filter(r => r.success).length;
  const totalCount = upgradeResults.length;
  
  console.log(`\n🎯 === Upgrade Summary ===`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Success: ${successCount}/${totalCount}`);
  console.log(`🌐 Network: ${networkName}`);
  
  if (successCount === totalCount) {
    console.log(`\n✅ All contracts upgraded successfully!`);
    
    console.log(`\n📋 Next Steps:`);
    console.log(`1. Verify new implementations: npm run verify`);
    console.log(`2. Test upgraded contracts: npm test`);
    console.log(`3. Update frontend with new ABIs if needed`);
    
    if (!process.env.ETHERSCAN_API_KEY) {
      console.warn(`\n⚠️  Set ETHERSCAN_API_KEY to verify contracts automatically`);
    }
  } else {
    console.log(`\n❌ ${totalCount - successCount} upgrade(s) failed`);
    upgradeResults.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Upgrade failed:", error.message);
    process.exit(1);
  });
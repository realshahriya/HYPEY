const { ethers, upgrades } = require("hardhat");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const { join } = require("path");

// Configuration validation
function validateConfiguration() {
  const config = {
    MULTISIG_ADDRESS: process.env.MULTISIG_ADDRESS,
    RESERVE_BURN_ADDRESS: process.env.RESERVE_BURN_ADDRESS,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
  };

  const errors = [];
  
  if (!config.MULTISIG_ADDRESS) {
    errors.push("MULTISIG_ADDRESS environment variable is required");
  }
  
  if (!config.RESERVE_BURN_ADDRESS) {
    errors.push("RESERVE_BURN_ADDRESS environment variable is required");
  }
  
  if (!ethers.isAddress(config.MULTISIG_ADDRESS || "")) {
    errors.push("MULTISIG_ADDRESS must be a valid Ethereum address");
  }
  
  if (!ethers.isAddress(config.RESERVE_BURN_ADDRESS || "")) {
    errors.push("RESERVE_BURN_ADDRESS must be a valid Ethereum address");
  }

  if (errors.length > 0) {
    console.error("\n❌ Configuration Validation Failed:");
    errors.forEach(error => console.error(`  - ${error}`));
    console.error("\nPlease check your .env file and try again.");
    process.exit(1);
  }

  return config;
}

// Gas estimation helper
async function estimateGasAndWait(contract, methodName, ...args) {
  try {
    const gasEstimate = await contract[methodName].estimateGas(...args);
    const gasPrice = await ethers.provider.getFeeData();
    
    console.log(`  📊 Gas estimate for ${methodName}: ${gasEstimate.toString()}`);
    console.log(`  💰 Estimated cost: ${ethers.formatEther(gasEstimate * gasPrice.gasPrice)} ETH`);
    
    const tx = await contract[methodName](...args);
    const receipt = await tx.wait();
    
    console.log(`  ✅ ${methodName} completed - Gas used: ${receipt.gasUsed.toString()}`);
    return receipt;
  } catch (error) {
    console.error(`  ❌ ${methodName} failed:`, error.message);
    throw error;
  }
}

// Contract deployment helper
async function deployContract(contractName, initArgs, deployer) {
  console.log(`\n=== Deploying ${contractName} ===`);
  
  try {
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    console.log(`  🚀 Deploying ${contractName} proxy...`);
    
    const contract = await upgrades.deployProxy(
      ContractFactory,
      initArgs,
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(contractAddress);
    
    console.log(`  ✅ ${contractName} deployed successfully`);
    console.log(`  📍 Proxy: ${contractAddress}`);
    console.log(`  📍 Implementation: ${implementationAddress}`);
    
    return {
      contract,
      proxy: contractAddress,
      implementation: implementationAddress,
    };
  } catch (error) {
    console.error(`  ❌ ${contractName} deployment failed:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting HYPEY Protocol Deployment\n");
  // Validate configuration
  const config = validateConfiguration();
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  // Check minimum balance (0.1 ETH)
  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low balance detected. Deployment may fail due to insufficient gas.");
  }
  
  console.log("\n=== Deployment Configuration ===");
  console.log("🏢 Multisig Address:", config.MULTISIG_ADDRESS);
  console.log("🔥 Reserve Burn Address:", config.RESERVE_BURN_ADDRESS);
  console.log("🌐 Network:", hre.network.name);
  console.log("⛽ Chain ID:", hre.network.config.chainId);

  const deploymentResults = {};
  const startTime = Date.now();

  try {
    // 0. Deploy TimelockController
    const TIMELOCK_DELAY = 24 * 60 * 60; // 24 hours in seconds
    const proposers = [config.MULTISIG_ADDRESS];
    const executors = [config.MULTISIG_ADDRESS];
    console.log("\n=== Deploying TimelockController ===");
    const TimelockController = await ethers.getContractFactory("TimelockControllerUpgradeable");
    const timelock = await upgrades.deployProxy(
      TimelockController,
      [TIMELOCK_DELAY, proposers, executors, deployer.address],
      { initializer: "initialize", kind: "uups" }
    );
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();
    console.log("  ⏰ TimelockController deployed at:", timelockAddress);

    // 1. Deploy HYPEYToken
    const tokenDeployment = await deployContract(
      "HYPEYToken",
      [config.RESERVE_BURN_ADDRESS],
      deployer
    );
    
    // Initialize owner
    console.log("  🔧 Setting token owner to:", config.MULTISIG_ADDRESS);
    await estimateGasAndWait(tokenDeployment.contract, "initializeOwner", config.MULTISIG_ADDRESS);
    
    deploymentResults.token = {
      proxy: tokenDeployment.proxy,
      implementation: tokenDeployment.implementation,
    };

    // 2. Deploy HYPEYTreasury
    const treasuryDeployment = await deployContract(
      "HYPEYTreasury",
      [config.MULTISIG_ADDRESS, timelockAddress],
      deployer
    );
    
    deploymentResults.treasury = {
      proxy: treasuryDeployment.proxy,
      implementation: treasuryDeployment.implementation,
    };

    // 3. Deploy HypeyVesting
    const vestingDeployment = await deployContract(
      "HypeyVesting",
      [tokenDeployment.proxy, config.MULTISIG_ADDRESS, timelockAddress],
      deployer
    );
    
    deploymentResults.vesting = {
      proxy: vestingDeployment.proxy,
      implementation: vestingDeployment.implementation,
    };

    // 4. Post-deployment configuration
    console.log("\n=== Post-Deployment Configuration ===");
    
    // Check deployer's token balance and transfer to treasury
    const deployerBalance = await tokenDeployment.contract.balanceOf(deployer.address);
    console.log("  📊 Deployer token balance:", ethers.formatEther(deployerBalance), "HYPEY");
    const tokenBalance = deployerBalance;
    
    if (tokenBalance > 0) {
      console.log("  🔄 Transferring tokens to treasury...");
      // Account for burn mechanism - transfer 90% to ensure we don't exceed balance
      const transferAmount = (tokenBalance * 9n) / 10n;
      await estimateGasAndWait(
        tokenDeployment.contract.connect(deployer), 
        "transfer", 
        treasuryDeployment.proxy, 
        transferAmount
      );
      console.log("  ✅ Transferred", ethers.formatEther(transferAmount), "HYPEY to treasury");
    } else {
      console.log("  ℹ️  No tokens to transfer (balance is 0)");
    }
    
    // Verify contract ownership
    console.log("\n=== Ownership Verification ===");
    const tokenOwner = await tokenDeployment.contract.owner();
    const treasuryOwner = await treasuryDeployment.contract.owner();
    const vestingOwner = await vestingDeployment.contract.owner();
    
    console.log("  🏢 Token Owner:", tokenOwner);
    console.log("  🏢 Treasury Owner:", treasuryOwner);
    console.log("  🏢 Vesting Owner:", vestingOwner);
    
    const allOwnersCorrect = [
      tokenOwner === config.MULTISIG_ADDRESS,
      treasuryOwner === config.MULTISIG_ADDRESS,
      vestingOwner === config.MULTISIG_ADDRESS
    ].every(Boolean);
    
    if (allOwnersCorrect) {
      console.log("  ✅ All contracts have correct ownership");
    } else {
      console.warn("  ⚠️  Warning: Some contracts may not have correct ownership");
    }

    // 5. Save deployment results
    const endTime = Date.now();
    const deploymentDuration = (endTime - startTime) / 1000;
    
    const deploymentData = {
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      deployer: deployer.address,
      multisig: config.MULTISIG_ADDRESS,
      reserveBurnAddress: config.RESERVE_BURN_ADDRESS,
      timestamp: new Date().toISOString(),
      deploymentDuration: `${deploymentDuration}s`,
      gasUsed: {
        total: "Tracked in individual transactions"
      },
      contracts: deploymentResults,
      verification: {
        etherscanApiKey: config.ETHERSCAN_API_KEY ? "✅ Available" : "❌ Missing",
        readyForVerification: !!config.ETHERSCAN_API_KEY
      }
    };

    const deploymentsDir = join(__dirname, "..", "deployments");
    if (!existsSync(deploymentsDir)) {
      mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = join(deploymentsDir, `${hre.network.name}.json`);
    writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("\n💾 Deployment data saved to:", deploymentFile);

    // 6. Display comprehensive summary
    console.log("\n🎉 === Deployment Summary ===");
    console.log(`⏱️  Duration: ${deploymentDuration}s`);
    console.log(`🌐 Network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`🏢 Multisig: ${config.MULTISIG_ADDRESS}`);
    
    console.log("\n📋 Contract Addresses:");
    console.log(`  🪙 HYPEYToken Proxy: ${deploymentResults.token.proxy}`);
    console.log(`  🏦 HYPEYTreasury Proxy: ${deploymentResults.treasury.proxy}`);
    console.log(`  ⏰ HypeyVesting Proxy: ${deploymentResults.vesting.proxy}`);
    
    console.log("\n🔧 Implementation Addresses:");
    console.log(`  🪙 HYPEYToken Impl: ${deploymentResults.token.implementation}`);
    console.log(`  🏦 HYPEYTreasury Impl: ${deploymentResults.treasury.implementation}`);
    console.log(`  ⏰ HypeyVesting Impl: ${deploymentResults.vesting.implementation}`);
    
    console.log("\n📝 Next Steps:");
    console.log("  1. 🔍 Verify contracts: npm run verify");
    console.log("  2. ⏰ Set up vesting schedules via multisig");
    console.log("  3. 🎯 Configure platform and NFT approvals");
    console.log("  4. 🧪 Run integration tests against deployed contracts");
    console.log("  5. 📊 Monitor contract events and functionality");
    
    if (!config.ETHERSCAN_API_KEY) {
      console.log("\n⚠️  Warning: ETHERSCAN_API_KEY not set. Contract verification will not be available.");
    }
    
    console.log("\n✅ Deployment completed successfully!");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error("\n🔍 Error details:", error);
    
    // Save partial deployment data for debugging
    if (Object.keys(deploymentResults).length > 0) {
      const partialData = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        status: "FAILED",
        error: error.message,
        partialResults: deploymentResults,
      };
      
      const deploymentsDir = join(__dirname, "..", "deployments");
      if (!existsSync(deploymentsDir)) {
        mkdirSync(deploymentsDir, { recursive: true });
      }
      
      const failedDeploymentFile = join(deploymentsDir, `${hre.network.name}-failed-${Date.now()}.json`);
      writeFileSync(failedDeploymentFile, JSON.stringify(partialData, null, 2));
      console.log("\n💾 Partial deployment data saved to:", failedDeploymentFile);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
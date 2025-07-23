import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// Environment template
const ENV_TEMPLATE = `# HYPEY Protocol Environment Configuration
# Copy this file to .env and fill in your values

# Deployment Configuration
MULTISIG_ADDRESS=0x1234567890123456789012345678901234567890
RESERVE_BURN_ADDRESS=0x0000000000000000000000000000000000000000

# Network Configuration
INFURA_PROJECT_ID=your_infura_project_id_here
ALCHEMY_API_KEY=your_alchemy_api_key_here

# Verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Private Keys (NEVER commit these to version control)
# Use for testnet deployments only
PRIVATE_KEY=your_private_key_here
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here

# Gas Configuration
GAS_PRICE=20000000000  # 20 gwei
GAS_LIMIT=8000000

# Development
FORK_MAINNET=false
FORK_BLOCK_NUMBER=
`;

// Package.json scripts to add
const SCRIPTS_TO_ADD = {
  "deploy": "hardhat run scripts/deploy.js",
  "deploy:localhost": "hardhat run scripts/deploy.js --network localhost",
  "deploy:sepolia": "hardhat run scripts/deploy.js --network sepolia",
  "deploy:mainnet": "hardhat run scripts/deploy.js --network mainnet",
  "verify": "hardhat run scripts/verify.js",
  "verify:sepolia": "hardhat run scripts/verify.js --network sepolia",
  "verify:mainnet": "hardhat run scripts/verify.js --network mainnet",
  "status": "hardhat run scripts/status.js",
  "status:sepolia": "hardhat run scripts/status.js --network sepolia",
  "status:mainnet": "hardhat run scripts/status.js --network mainnet",
  "upgrade": "hardhat run scripts/upgrade.js",
  "upgrade:sepolia": "hardhat run scripts/upgrade.js --network sepolia",
  "upgrade:mainnet": "hardhat run scripts/upgrade.js --network mainnet",
  "node": "hardhat node",
  "clean": "hardhat clean",
  "compile": "hardhat compile",
  "test": "hardhat test",
  "test:coverage": "hardhat coverage",
  "test:gas": "REPORT_GAS=true hardhat test",
  "lint": "eslint . --ext .js,.ts",
  "lint:fix": "eslint . --ext .js,.ts --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
};

// Gitignore entries to ensure
const GITIGNORE_ENTRIES = [
  "# Environment files",
  ".env",
  ".env.local",
  ".env.*.local",
  "",
  "# Dependencies",
  "node_modules/",
  "npm-debug.log*",
  "yarn-debug.log*",
  "yarn-error.log*",
  "",
  "# Build outputs",
  "artifacts/",
  "cache/",
  "typechain-types/",
  "coverage/",
  "coverage.json",
  "",
  "# IDE",
  ".vscode/",
  ".idea/",
  "*.swp",
  "*.swo",
  "",
  "# OS",
  ".DS_Store",
  "Thumbs.db",
  "",
  "# Deployment files (keep structure, ignore sensitive data)",
  "deployments/*.json",
  "!deployments/.gitkeep",
  "",
  "# Gas reports",
  "gas-report.txt"
];

// Check if required dependencies are installed
function checkDependencies() {
  console.log("📦 Checking dependencies...");
  
  const packageJsonPath = join(process.cwd(), "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("package.json not found. Please run this script from the project root.");
  }
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const requiredDeps = [
    "@openzeppelin/contracts",
    "@openzeppelin/contracts-upgradeable",
    "@openzeppelin/hardhat-upgrades",
    "hardhat",
    "@nomicfoundation/hardhat-toolbox"
  ];
  
  const missing = [];
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    console.log(`⚠️  Missing dependencies: ${missing.join(", ")}`);
    console.log(`Installing missing dependencies...`);
    
    try {
      execSync(`npm install ${missing.join(" ")}`, { stdio: "inherit" });
      console.log(`✅ Dependencies installed`);
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  } else {
    console.log(`✅ All required dependencies found`);
  }
}

// Setup directory structure
function setupDirectories() {
  console.log("📁 Setting up directory structure...");
  
  const dirs = [
    "contracts",
    "scripts",
    "test",
    "deployments",
    "docs",
    "artifacts",
    "cache"
  ];
  
  for (const dir of dirs) {
    const dirPath = join(process.cwd(), dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      console.log(`  📂 Created ${dir}/`);
    }
  }
  
  // Create .gitkeep for deployments
  const gitkeepPath = join(process.cwd(), "deployments", ".gitkeep");
  if (!existsSync(gitkeepPath)) {
    writeFileSync(gitkeepPath, "# Keep this directory in git\n");
    console.log(`  📄 Created deployments/.gitkeep`);
  }
  
  console.log(`✅ Directory structure ready`);
}

// Setup environment file
function setupEnvironment() {
  console.log("🔧 Setting up environment...");
  
  const envPath = join(process.cwd(), ".env");
  const envExamplePath = join(process.cwd(), ".env.example");
  
  // Create .env.example
  writeFileSync(envExamplePath, ENV_TEMPLATE);
  console.log(`  📄 Created .env.example`);
  
  // Create .env if it doesn't exist
  if (!existsSync(envPath)) {
    writeFileSync(envPath, ENV_TEMPLATE);
    console.log(`  📄 Created .env`);
    console.log(`  ⚠️  Please edit .env with your actual values`);
  } else {
    console.log(`  ✅ .env already exists`);
  }
}

// Setup gitignore
function setupGitignore() {
  console.log("📝 Setting up .gitignore...");
  
  const gitignorePath = join(process.cwd(), ".gitignore");
  let existingContent = "";
  
  if (existsSync(gitignorePath)) {
    existingContent = readFileSync(gitignorePath, "utf8");
  }
  
  const newEntries = [];
  for (const entry of GITIGNORE_ENTRIES) {
    if (!existingContent.includes(entry) && entry.trim() !== "") {
      newEntries.push(entry);
    }
  }
  
  if (newEntries.length > 0) {
    const updatedContent = existingContent + "\n" + GITIGNORE_ENTRIES.join("\n") + "\n";
    writeFileSync(gitignorePath, updatedContent);
    console.log(`  📄 Updated .gitignore with ${newEntries.length} new entries`);
  } else {
    console.log(`  ✅ .gitignore is up to date`);
  }
}

// Setup package.json scripts
function setupScripts() {
  console.log("⚙️  Setting up npm scripts...");
  
  const packageJsonPath = join(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  let addedCount = 0;
  for (const [name, command] of Object.entries(SCRIPTS_TO_ADD)) {
    if (!packageJson.scripts[name]) {
      packageJson.scripts[name] = command;
      addedCount++;
    }
  }
  
  if (addedCount > 0) {
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`  📄 Added ${addedCount} npm scripts`);
  } else {
    console.log(`  ✅ All scripts already exist`);
  }
}

// Create README if it doesn't exist
function setupReadme() {
  console.log("📖 Setting up README...");
  
  const readmePath = join(process.cwd(), "README.md");
  
  if (!existsSync(readmePath)) {
    const readmeContent = `# HYPEY Protocol

A comprehensive DeFi protocol built on Ethereum with upgradeable smart contracts.

## Features

- **HYPEYToken**: ERC-20 token with advanced features
- **HYPEYTreasury**: Secure treasury management
- **HypeyVesting**: Token vesting and distribution

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to localhost
npm run deploy:localhost

# Check deployment status
npm run status
\`\`\`

## Environment Setup

1. Copy \`.env.example\` to \`.env\`
2. Fill in your configuration values
3. Never commit \`.env\` to version control

## Available Scripts

- \`npm run deploy\` - Deploy contracts
- \`npm run verify\` - Verify contracts on Etherscan
- \`npm run status\` - Check contract status
- \`npm run upgrade\` - Upgrade contracts
- \`npm test\` - Run tests
- \`npm run test:coverage\` - Run tests with coverage

## Networks

- \`localhost\` - Local development
- \`sepolia\` - Ethereum testnet
- \`mainnet\` - Ethereum mainnet

## Security

- All contracts are upgradeable using OpenZeppelin's proxy pattern
- Multi-signature wallet controls critical functions
- Comprehensive test coverage

## License

MIT
`;
    
    writeFileSync(readmePath, readmeContent);
    console.log(`  📄 Created README.md`);
  } else {
    console.log(`  ✅ README.md already exists`);
  }
}

// Validate hardhat config
function validateHardhatConfig() {
  console.log("🔧 Validating Hardhat configuration...");
  
  const configPath = join(process.cwd(), "hardhat.config.js");
  if (!existsSync(configPath)) {
    console.log(`  ⚠️  hardhat.config.js not found`);
    console.log(`  Please ensure Hardhat is properly configured`);
    return;
  }
  
  try {
    // Try to load the config
    const config = require(configPath);
    console.log(`  ✅ Hardhat configuration is valid`);
  } catch (error) {
    console.log(`  ❌ Hardhat configuration error: ${error.message}`);
  }
}

async function main() {
  console.log("🚀 HYPEY Protocol Setup\n");
  
  try {
    // Run setup steps
    setupDirectories();
    setupEnvironment();
    setupGitignore();
    checkDependencies();
    setupScripts();
    setupReadme();
    validateHardhatConfig();
    
    console.log(`\n✅ === Setup Complete ===`);
    console.log(`\n📋 Next Steps:`);
    console.log(`1. Edit .env with your configuration`);
    console.log(`2. Review and update hardhat.config.js if needed`);
    console.log(`3. Compile contracts: npm run compile`);
    console.log(`4. Run tests: npm test`);
    console.log(`5. Deploy to localhost: npm run deploy:localhost`);
    
    console.log(`\n🔧 Available Commands:`);
    console.log(`  npm run deploy        - Deploy contracts`);
    console.log(`  npm run verify        - Verify on Etherscan`);
    console.log(`  npm run status        - Check contract status`);
    console.log(`  npm run upgrade       - Upgrade contracts`);
    console.log(`  npm test              - Run tests`);
    console.log(`  npm run test:coverage - Test coverage`);
    
    console.log(`\n⚠️  Important:`);
    console.log(`- Never commit .env to version control`);
    console.log(`- Use testnet for development`);
    console.log(`- Test thoroughly before mainnet deployment`);
    
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Setup error:", error.message);
    process.exit(1);
  });
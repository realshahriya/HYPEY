# HYPEY Smart Contracts - Test & Deployment Setup

A comprehensive Hardhat-based development environment for the HYPEY ecosystem smart contracts, featuring automated testing, deployment scripts, and upgrade management.

## 📁 Project Structure

```tree
HYPEY/
├── contracts/
│   ├── token/
│   │   ├── HYPEYToken.sol          # Main deflationary token contract
│   │   └── Readme.md               # Token documentation
│   ├── treasury/
│   │   ├── HYPEYTreasury.sol       # Treasury management contract
│   │   └── readme.md               # Treasury documentation
│   └── vesting/
│       ├── HypeyVesting.sol        # Token vesting contract
│       └── readme.md               # Vesting documentation
├── test/
│   ├── HYPEYToken.test.js          # Token contract tests
│   ├── HYPEYTreasury.test.js       # Treasury contract tests
│   ├── HypeyVesting.test.js        # Vesting contract tests
│   └── Integration.test.js         # Full system integration tests
├── scripts/
│   ├── deploy.js                   # Enhanced deployment script with validation
│   ├── verify.js                   # Batch contract verification script
│   ├── status.js                   # Contract status checker
│   ├── upgrade.js                  # Contract upgrade helper
│   └── setup.js                    # Project initialization script
├── deployments/                    # Deployment artifacts (auto-generated)
├── package.json                    # Dependencies and scripts
├── hardhat.config.js              # Hardhat configuration
├── .env.example                    # Environment variables template
└── README.md                       # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone and navigate to the project:**

   ```bash
   cd HYPEY
   ```

2. **Run setup script (recommended):**

   ```bash
   npm run setup
   ```

   This will:
   - Install dependencies
   - Create directory structure
   - Generate environment files
   - Set up npm scripts
   - Create documentation

3. **Manual setup (alternative):**

   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Compile contracts:**

   ```bash
   npm run compile
   ```

5. **Run tests:**

   ```bash
   npm test
   ```

## 🧪 Testing

### Test Coverage

The test suite includes comprehensive coverage for:

- **HYPEYToken.test.js**: Token functionality, burn mechanisms, access controls
- **HYPEYTreasury.test.js**: Treasury operations, role management, pause functionality
- **HypeyVesting.test.js**: Vesting schedules, claiming, time-based calculations
- **Integration.test.js**: Full system interactions, upgrade scenarios, emergency procedures

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/HYPEYToken.test.js

# Run tests with gas reporting
npm run test:gas

# Run tests with coverage
npm run test:coverage
```

### Test Features

- **Fixtures**: Efficient test setup using Hardhat's loadFixture
- **Time Manipulation**: Testing time-dependent vesting logic
- **Access Control**: Comprehensive role-based permission testing
- **Integration**: Full system workflow testing
- **Gas Optimization**: Gas usage monitoring and optimization
- **Edge Cases**: Boundary condition and error scenario testing

## 🚀 Deployment

### Environment Setup

Configure your `.env` file:

```env
# Network URLs
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
MAINNET_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Deployment addresses
MULTISIG_ADDRESS=0x...
RESERVE_BURN_ADDRESS=0x...
```

### Deployment Commands

```bash
# Deploy to local network
npm run deploy:localhost

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to Ethereum mainnet
npm run deploy:mainnet

# Check deployment status
npm run status
npm run status:sepolia
npm run status:mainnet
```

### Enhanced Deployment Process

The enhanced deployment script (`scripts/deploy.js`) performs the following:

1. **Validate configuration** and environment variables
2. **Check deployer balance** and network connectivity
3. **Deploy HYPEYToken** with UUPS proxy pattern and gas estimation
4. **Initialize token** with reserve burn address
5. **Set token owner** to multisig address
6. **Deploy HYPEYTreasury** with multisig as admin
7. **Deploy HypeyVesting** with token and admin addresses
8. **Transfer initial supply** from token contract to treasury
9. **Verify contract ownership** and functionality
10. **Save comprehensive deployment data** to `deployments/{network}.json`
11. **Display detailed summary** with gas usage and next steps

### Post-Deployment

After successful deployment:

1. **Verify contracts:**

   ```bash
   npm run verify:sepolia  # or verify:mainnet
   ```

2. **Check deployment status:**

   ```bash
   npm run status:sepolia  # or status:mainnet
   ```

3. **Set up vesting schedules** using the vesting contract
4. **Configure platform approvals** for fee burns
5. **Set NFT contract approvals** for NFT interactions
6. **Transfer ownership** to production multisig if needed

## 🔧 Configuration

### Hardhat Configuration

The `hardhat.config.js` includes:

- **Solidity 0.8.25** with optimization enabled
- **Network configurations** for localhost, Sepolia, and mainnet
- **Etherscan verification** setup
- **Gas reporting** configuration
- **TypeChain** for type-safe contract interactions
- **OpenZeppelin Upgrades** plugin integration

### Contract Features

#### HYPEYToken

- ✅ 3B initial supply with 18 decimals
- ✅ Dynamic burn rate (1-3%) based on supply
- ✅ Platform fee burns (max 5%)
- ✅ NFT interaction burns
- ✅ KPI milestone burns
- ✅ UUPS upgradeable pattern
- ✅ Comprehensive access controls

#### HYPEYTreasury

- ✅ Multi-token support (ERC20 + ETH)
- ✅ Role-based disbursement controls
- ✅ Emergency pause functionality
- ✅ UUPS upgradeable pattern
- ✅ Event logging for all operations

#### HypeyVesting

- ✅ Flexible vesting schedules
- ✅ Cliff periods with unlock percentages
- ✅ Linear vesting with configurable slices
- ✅ Multiple schedules per beneficiary
- ✅ Emergency admin controls
- ✅ UUPS upgradeable pattern

## 🔐 Security Features

### Access Control

- **Multi-signature** wallet integration
- **Role-based permissions** across all contracts
- **Owner-only functions** for critical operations
- **Pause mechanisms** for emergency stops

### Upgrade Safety

- **UUPS proxy pattern** for secure upgrades
- **Admin-only upgrade authorization**
- **State preservation** across upgrades
- **Comprehensive upgrade testing**

### Audit Considerations

- **OpenZeppelin** battle-tested contracts
- **Comprehensive test coverage** (>95%)
- **Gas optimization** monitoring
- **Event logging** for all state changes

## 📊 Gas Optimization

### Optimization Strategies

- **Efficient storage** layout
- **Batch operations** where possible
- **Minimal external calls**
- **Optimized loop structures**

### Gas Monitoring

```bash
# Enable gas reporting
REPORT_GAS=true npm test

# View gas usage in tests
npx hardhat test --gas-reporter
```

## 🔄 Upgrade Management

### Enhanced Upgrade Process

Use the upgrade script for safe, validated upgrades:

```bash
# Upgrade contracts on testnet
npm run upgrade:sepolia

# Upgrade contracts on mainnet
npm run upgrade:mainnet
```

The upgrade script performs:

1. **Validate upgrade compatibility** for all contracts
2. **Estimate gas costs** for upgrade operations
3. **Deploy new implementations** with safety checks
4. **Execute upgrades** through proxy pattern
5. **Verify functionality** post-upgrade
6. **Update deployment records** with new implementation addresses

### UUPS Upgrade Safety

- All contracts use **UUPS pattern**
- **Automatic compatibility validation** before upgrade
- **Storage layout** compatibility checks
- **Initialization** protection
- **Admin-only** upgrade authorization
- **Comprehensive testing** on testnet first

## 🛠️ Development Workflow

### Local Development

```bash
# Start local node
npm run node

# Deploy to local network (in another terminal)
npm run deploy:localhost

# Check deployment status
npm run status:localhost

# Run tests against local deployment
npm test
```

### Testnet Deployment

```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Verify contracts
npm run verify:sepolia

# Check deployment status
npm run status:sepolia

# Test upgrades
npm run upgrade:sepolia
```

### Mainnet Deployment

```bash
# Final checks
npm run compile
npm test

# Deploy to mainnet
npm run deploy:mainnet

# Verify contracts
npm run verify:mainnet

# Check deployment status
npm run status:mainnet
```

## 🛠️ Available Scripts

The project includes comprehensive npm scripts for all development and deployment tasks:

### Setup and Development

```bash
npm run setup          # Initialize project structure and environment
npm run compile        # Compile smart contracts
npm run clean          # Clean build artifacts
npm run node           # Start local Hardhat network
```

### Testing

```bash
npm test               # Run all tests
npm run test:coverage  # Run tests with coverage report
npm run test:gas       # Run tests with gas usage reporting
```

### Deployment

```bash
npm run deploy                # Deploy to default network
npm run deploy:localhost      # Deploy to local network
npm run deploy:sepolia        # Deploy to Sepolia testnet
npm run deploy:mainnet        # Deploy to Ethereum mainnet
```

### Verification

```bash
npm run verify                # Verify contracts on default network
npm run verify:sepolia        # Verify contracts on Sepolia
npm run verify:mainnet        # Verify contracts on Ethereum mainnet
```

### Status Monitoring

```bash
npm run status                # Check contract status on default network
npm run status:sepolia        # Check contract status on Sepolia
npm run status:mainnet        # Check contract status on Ethereum mainnet
```

### Contract Upgrades

```bash
npm run upgrade               # Upgrade contracts on default network
npm run upgrade:sepolia       # Upgrade contracts on Sepolia
npm run upgrade:mainnet       # Upgrade contracts on Ethereum mainnet
```

### Code Quality

```bash
npm run lint                  # Lint JavaScript/TypeScript files
npm run lint:fix              # Fix linting issues automatically
npm run format                # Format code with Prettier
npm run format:check          # Check code formatting
```

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Gas optimization reviewed
- [ ] Security audit completed
- [ ] Multisig wallet configured
- [ ] Environment variables set
- [ ] Network configuration verified

### .Deployment Checklist

- [ ] Contracts deployed successfully
- [ ] Proxy initialization completed
- [ ] Ownership transferred to multisig
- [ ] Initial token distribution executed
- [ ] Deployment data saved

### .Post-Deployment Checklist

- [ ] Contracts verified on Etherscan
- [ ] Vesting schedules configured
- [ ] Platform approvals set
- [ ] NFT contract approvals set
- [ ] Emergency procedures tested
- [ ] Documentation updated

## 🤝 Contributing

### Development Guidelines

1. **Write tests** for all new functionality
2. **Follow Solidity** best practices
3. **Use OpenZeppelin** contracts where possible
4. **Document** all public functions
5. **Test gas optimization** changes

### Code Style

- **Solidity 0.8.25** syntax
- **NatSpec** documentation
- **Consistent naming** conventions
- **Comprehensive error** messages

## 📞 Support

For questions or issues:

- Review the contract documentation in each folder
- Check the test files for usage examples
- Refer to OpenZeppelin documentation for base contracts
- Contact the development team

## 📄 License

MIT License - see individual contract files for specific licensing information.

---

**Built by Shahriya** - HYPEY Smart Contracts v1.0.0

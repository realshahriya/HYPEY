# HYPEYTreasury Contract

A secure, upgradeable treasury contract for managing ERC20 tokens and ETH with owner-based access control and emergency pause functionality. Manages project-controlled reserves, enabling secure and auditable disbursements for LP provisioning, launchpads, partners, marketing, and other ecosystem needs.

---

## Features

* **ERC20 & ETH Support:** Holds HYPEY, stablecoins, and native ETH with supported token management.
* **Owner-based Control:** Only contract owner can disburse funds and manage supported tokens.
* **Supported Token Management:** Dynamic addition/removal of supported tokens with comprehensive tracking.
* **Pausable:** Emergency stop functionality by owner for all disbursement operations.
* **UUPS Upgradeable:** Supports future upgrades via OpenZeppelin's UUPS proxy pattern.
* **SafeERC20:** Handles non-standard tokens securely with OpenZeppelin's SafeERC20.
* **Events:** Emits comprehensive logs for all deposits, withdrawals, and disbursements.
* **Balance Queries:** Anyone can check contract's token and ETH balances.
* **Two-Step Ownership:** Secure ownership initialization after deployment.
* **Builder Attribution:** Built by Shahriya.
* **Full Auditability:** All flows in and out are logged with detailed events.

---

## Contract Deployment & Initialization

### Using Enhanced Deployment Scripts

```bash
# Deploy to testnet
npm run deploy:sepolia

# Deploy to mainnet
npm run deploy:mainnet

# Check deployment status
npm run status:sepolia
npm run status:mainnet
```

### Manual Deployment (Development)

1. **Deploy with UUPS Upgrades:**

   ```javascript
   const { deployProxy } = require('@openzeppelin/hardhat-upgrades');
   
   const HYPEYTreasury = await ethers.getContractFactory("HYPEYTreasury");
   const treasury = await deployProxy(HYPEYTreasury, [multisigAddress], {
     kind: 'uups'
   });
   ```

2. **Initialize the Contract:**

   ```solidity
   treasury.initialize(multisigAddress);
   ```

   * Sets the multisig as the admin with all roles
   * This function can only be called once and prevents re-initialization

---

## Key Functions

### Supported Token Management

#### `addSupportedToken`

Add a token to the supported tokens list.

```solidity
function addSupportedToken(address token) external onlyOwner
```

* Requires non-zero address and token not already supported
* Emits `TokenSupported(token, true)`

#### `removeSupportedToken`

Remove a token from the supported tokens list.

```solidity
function removeSupportedToken(address token) external onlyOwner
```

* Requires token to be currently supported
* Emits `TokenSupported(token, false)`

#### `getSupportedTokens`

Get list of all supported tokens.

```solidity
function getSupportedTokens() external view returns (address[] memory)
```

---

### Token Disbursement

#### `disburseToken`

Disburse any supported ERC20 token to an address (for LPs, launchpads, partners, etc).

```solidity
function disburseToken(address token, address to, uint256 amount)
    external onlyOwner whenNotPaused
```

* Requires token to be supported and valid recipient
* Emits `TokensWithdrawn(token, to, amount)`

#### `disburseETH`

Disburse native ETH to an address.

```solidity
function disburseETH(address payable to, uint256 amount)
    external onlyOwner whenNotPaused
```

* Requires valid recipient and sufficient ETH balance
* Emits `ETHWithdrawn(to, amount)`

---

### Token/ETH Deposits

#### `depositToken`

Anyone can deposit supported ERC20 tokens into the treasury (must approve first).

```solidity
function depositToken(address token, uint256 amount) external
```

* Requires token to be supported
* Caller must approve the treasury contract first
* Emits `TokensDeposited(token, from, amount)`

#### ETH Deposits

* ETH sent to the contract is accepted via `receive()` or `fallback()`.
* Emits `ETHDeposited(from, amount)` for all ETH deposits.

---

### Balance Queries

#### `getERC20Balance`

Query current ERC20 token balance.

```solidity
function getERC20Balance(address token) external view returns (uint256)
```

#### `getETHBalance`

Query current ETH balance.

```solidity
function getETHBalance() external view returns (uint256)
```

---

### Emergency Controls

#### `pause`

Pause all disbursement operations in emergencies.

```solidity
function pause() external onlyOwner
```

#### `unpause`

Unpause all disbursement operations.

```solidity
function unpause() external onlyOwner
```

#### `builder`

Returns the builder attribution.

```solidity
function builder() external pure returns (string memory)
```

* Returns "Shahriya"
* Pure function, no state changes

---

### .`builder`

Returns the contract author.

```solidity
function builder() external pure returns (string memory)
```

* Always returns `"Shahriya"`

---

### UUPS Upgrade Logic

The contract implements UUPS (Universal Upgradeable Proxy Standard) upgradeability:

* **Upgrade Authorization**: Only the multisig admin can authorize upgrades
* **Upgrade Safety**: OpenZeppelin's upgrade safety validations are enforced
* **Storage Layout**: Must maintain storage layout compatibility between versions

```solidity
function _authorizeUpgrade(address newImplementation) internal override onlyRole(MULTISIG_ADMIN_ROLE) {}
```

### Contract Upgrades

Use the enhanced upgrade scripts for safe contract upgrades:

```bash
# Upgrade on testnet
npm run upgrade:sepolia

# Upgrade on mainnet
npm run upgrade:mainnet

# Check upgrade status
npm run status:sepolia
npm run status:mainnet
```

The upgrade scripts include:

* Compatibility validation
* Gas estimation
* Deployment record updates
* Comprehensive logging

---

## Events

* `TokensWithdrawn(address token, address to, uint256 amount)`
* `ETHWithdrawn(address to, uint256 amount)`
* `TokensDeposited(address token, address from, uint256 amount)`
* `ETHDeposited(address from, uint256 amount)`

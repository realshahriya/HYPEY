# HypeyVesting Contract

A secure, upgradeable token vesting contract supporting multiple vesting schedules per beneficiary with flexible cliff periods, linear vesting, and comprehensive management features.

---

## Features

* **Multiple Vesting Schedules:** Each beneficiary can have multiple independent vesting schedules
* **Flexible Cliff Periods:** Configurable cliff duration with customizable unlock percentages
* **Linear Vesting:** Smooth token release over configurable time slices
* **Owner-based Control:** Only contract owner can create schedules and manage the contract
* **Pausable:** Emergency stop functionality for all claiming operations
* **UUPS Upgradeable:** Supports future upgrades via OpenZeppelin's UUPS proxy pattern
* **Merkle Root Support:** Built-in support for Merkle tree verification (extensible)
* **Pool Management:** Comprehensive token deposit and withdrawal functionality
* **Two-Step Ownership:** Secure ownership initialization after deployment
* **Builder Attribution:** Built by Shahriya
* **Comprehensive Events:** Detailed logging for all vesting and claiming activities

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
   
   const HypeyVesting = await ethers.getContractFactory("HypeyVesting");
   const vesting = await deployProxy(HypeyVesting, [tokenAddress, multisigAddress], {
     kind: 'uups'
   });
   ```

2. **Initialize the Contract:**

   ```solidity
   vesting.initialize(tokenAddress, multisigAddress);
   ```

   * Sets the HYPEY token address and multisig as the admin
   * This function can only be called once and prevents re-initialization

---

## Key Functions

### Vesting Schedule Management

#### `addVestingSchedule`

Create a new vesting schedule for a beneficiary.

```solidity
function addVestingSchedule(
    address beneficiary,
    uint256 totalAmount,
    uint256 start,
    uint256 cliffDuration,
    uint256 duration,
    uint256 slicePeriodSeconds,
    uint256 cliffUnlockPercent
) external onlyOwner
```

**Parameters:**

* `beneficiary` - Address that will receive the vested tokens
* `totalAmount` - Total tokens to be vested
* `start` - Start timestamp for vesting
* `cliffDuration` - Duration of cliff period in seconds
* `duration` - Total vesting duration in seconds
* `slicePeriodSeconds` - Time slice for linear vesting calculations
* `cliffUnlockPercent` - Percentage unlocked at cliff (0-100)

**Requirements:**

* Duration and slice period must be greater than 0
* Cliff unlock percentage must be ≤ 100
* Emits `VestingCreated(beneficiary, index, totalAmount)`

---

### Vesting Information

#### `getVestingInfo`

Get all vesting schedules and releasable amounts for a beneficiary.

```solidity
function getVestingInfo(address beneficiary) external view returns (
    VestingSchedule[] memory schedules,
    uint256[] memory releasable
)
```

* Returns all schedules and currently claimable amounts
* Useful for frontend integration and user dashboards

#### `computeReleasableAmount`

Calculate releasable amount for a specific vesting schedule.

```solidity
function computeReleasableAmount(VestingSchedule memory schedule) public view returns (uint256)
```

**Vesting Logic:**

* Before cliff: 0 tokens releasable
* At cliff: Cliff unlock percentage becomes available
* After cliff: Linear vesting of remaining tokens
* After full duration: All remaining tokens available

---

### Token Claiming

#### `claim`

Claim vested tokens for caller's specific schedule.

```solidity
function claim(uint256 index) external whenNotPaused
```

* `index` - Index of the vesting schedule to claim from
* Only callable when contract is not paused
* Emits `TokensClaimed(beneficiary, index, amount)`

#### `claimFor`

Claim vested tokens for another address (permissionless).

```solidity
function claimFor(address beneficiary, uint256 index) public whenNotPaused
```

* Anyone can trigger claims for any beneficiary
* Useful for automated claiming systems
* Tokens are sent directly to the beneficiary

---

### Pool Management

#### `getPoolBalance`

Get current token balance of the vesting contract.

```solidity
function getPoolBalance() external view returns (uint256)
```

#### `getTotalLocked`

Get total locked tokens for a specific beneficiary.

```solidity
function getTotalLocked(address beneficiary) external view returns (uint256 total)
```

* Returns sum of all unreleased tokens across all schedules

#### `getUserPoolStatus`

Get comprehensive pool status for a beneficiary.

```solidity
function getUserPoolStatus(address beneficiary) external view returns (
    uint256 poolBalance,
    uint256 totalLocked
)
```

* Returns both pool balance and user's total locked amount

#### `depositTokens`

Deposit tokens into the vesting pool.

```solidity
function depositTokens(uint256 amount) external
```

* Anyone can deposit tokens (must approve first)
* Emits `TokensDeposited(from, amount)`

#### `adminWithdraw`

Emergency withdrawal of tokens by owner.

```solidity
function adminWithdraw(address to, uint256 amount) external onlyOwner
```

* Owner can withdraw excess tokens
* Requires sufficient pool balance
* Emits `AdminWithdraw(to, amount)`

---

### Merkle Root Management

#### `setMerkleRoot`

Set Merkle root for future verification features.

```solidity
function setMerkleRoot(bytes32 newRoot) external onlyOwner
```

* Emits `MerkleRootUpdated(newMerkleRoot)`
* Extensible for future Merkle-based claiming

---

### Emergency Controls

#### `pause`

Pause all claiming operations.

```solidity
function pause() external onlyOwner
```

#### `unpause`

Unpause all claiming operations.

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

## Vesting Schedule Structure

```solidity
struct VestingSchedule {
    bool initialized;           // Whether schedule is active
    uint256 totalAmount;       // Total tokens to vest
    uint256 released;          // Tokens already released
    uint256 start;             // Vesting start timestamp
    uint256 cliff;             // Cliff end timestamp
    uint256 duration;          // Total vesting duration
    uint256 slicePeriodSeconds; // Time slice for calculations
    uint256 cliffUnlockPercent; // Percentage unlocked at cliff
}
```

---

## Usage Examples

### Creating Vesting Schedules

```js
// Team allocation: 2-year vesting, 6-month cliff, 25% unlock at cliff
await vesting.addVestingSchedule(
    teamMemberAddress,
    ethers.utils.parseEther("100000"), // 100k tokens
    startTimestamp,
    6 * 30 * 24 * 60 * 60, // 6 months cliff
    2 * 365 * 24 * 60 * 60, // 2 years total
    24 * 60 * 60, // Daily slices
    25 // 25% at cliff
);

// Advisor allocation: 1-year vesting, 3-month cliff, 10% unlock at cliff
await vesting.addVestingSchedule(
    advisorAddress,
    ethers.utils.parseEther("50000"), // 50k tokens
    startTimestamp,
    3 * 30 * 24 * 60 * 60, // 3 months cliff
    365 * 24 * 60 * 60, // 1 year total
    24 * 60 * 60, // Daily slices
    10 // 10% at cliff
);
```

### Querying Vesting Information

```js
// Get all schedules for a user
const [schedules, releasable] = await vesting.getVestingInfo(userAddress);

console.log(`User has ${schedules.length} vesting schedules`);
for (let i = 0; i < schedules.length; i++) {
    console.log(`Schedule ${i}: ${ethers.utils.formatEther(releasable[i])} tokens claimable`);
}

// Get pool status
const [poolBalance, totalLocked] = await vesting.getUserPoolStatus(userAddress);
console.log(`Pool balance: ${ethers.utils.formatEther(poolBalance)}`);
console.log(`User locked: ${ethers.utils.formatEther(totalLocked)}`);
```

### Claiming Tokens

```js
// User claims their first schedule
await vesting.connect(user).claim(0);

// Or claim for another user (permissionless)
await vesting.claimFor(userAddress, 0);
```

---

## Security Features

* **Owner-only Management:** Only contract owner can create schedules and manage the contract
* **Pausable Claims:** Emergency stop for all claiming operations
* **Safe Token Handling:** Uses OpenZeppelin's IERC20Upgradeable for secure transfers
* **Comprehensive Validation:** All inputs validated with proper error messages
* **Event Logging:** All operations emit events for transparency and monitoring
* **Upgrade Safety:** UUPS pattern with owner-only upgrade authorization
* **Multiple Schedule Support:** Prevents single point of failure with diversified vesting

---

## UUPS Upgrade Logic

The contract implements UUPS (Universal Upgradeable Proxy Standard) upgradeability:

* **Upgrade Authorization**: Only the owner (multisig) can authorize upgrades
* **Upgrade Safety**: OpenZeppelin's upgrade safety validations are enforced
* **Storage Layout**: Must maintain storage layout compatibility between versions

```solidity
function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
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

## Integration Guidelines

### Frontend Integration

1. **Use `getVestingInfo`** to display user's vesting schedules
2. **Monitor events** for real-time updates
3. **Implement claiming UI** with proper error handling
4. **Show pool status** for transparency

### Backend Integration

1. **Index events** for analytics and reporting
2. **Monitor pool balance** to ensure sufficient funding
3. **Implement automated claiming** using `claimFor`
4. **Set up alerts** for low pool balance or emergency pauses

### Security Considerations

1. **Use multisig** for owner operations
2. **Test upgrades** on testnet first
3. **Monitor for anomalies** in claiming patterns
4. **Implement emergency procedures** for pause/unpause
5. **Regular audits** of vesting schedules and pool balance

---

## Events Reference

```solidity
event VestingCreated(address indexed beneficiary, uint256 index, uint256 totalAmount);
event TokensClaimed(address indexed beneficiary, uint256 index, uint256 amount);
event MerkleRootUpdated(bytes32 newMerkleRoot);
event TokensDeposited(address indexed from, uint256 amount);
event AdminWithdraw(address indexed to, uint256 amount);
```

---

## Contact

For integration help, custom features, or technical support, contact the HYPEY development team.

**Built by Shahriya** - HYPEY Vesting Contract v1.0.0

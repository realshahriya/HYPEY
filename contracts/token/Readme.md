# HYPEYToken Contract

A modular, upgradeable, deflationary ERC20 token for the HYPEY ecosystem, featuring dynamic multi-layer burn mechanisms, reserve controls, platform/NFT integrations, and UUPS upgradeable architecture.

---

## Features

* **Initial Supply:** 3,000,000,000 HYPEY (18 decimals), minted to the contract at deployment
* **Deflationary:** Dynamic burn (1–3%) on most transfers, with half burned instantly, half reserved for future burns
* **Burn Exempt:** Small transfers (<100 HYPEY) are exempt from burn
* **Dynamic Burn Rate:** Burn rate auto-adjusts based on total supply (3%, 2%, or 1%)
* **Manual Burn Controls:** Owner can set burn rate (max 3%), set reserve address
* **Platform Fee Burns:** Approved platforms can trigger fee burns (max 5%)
* **NFT Interactions:** Approved NFT contracts can burn tokens (mint, upgrade, etc)
* **KPI/Milestone Burns:** Owner can burn tokens for major events or milestones
* **Two-Step Ownership:** Secure ownership initialization after deployment
* **Access Control:** OnlyOwner with comprehensive approval mappings
* **Upgradeable:** Uses UUPS proxy pattern with owner-only upgrade authorization
* **Events:** Standard ERC20 events for transfers/burns
* **Builder Attribution:** Built by Shahriya

---

## Contract Deployment & Initialization

The contract uses OpenZeppelin Upgrades for deployment. Use the enhanced deployment scripts for production deployments:

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

   * Use OpenZeppelin Upgrades plugins (Hardhat/Foundry) for deployment and future upgrades.
2. **Initialize token and supply:**

   * Pass a valid reserve burn address to `initialize(address _reserveBurnAddress)`
   * The contract mints the full 3B supply to itself.
   * Sets default burn rate to 1% (100 basis points).
3. **Assign Owner (Two-Step Process):**

   * After deployment, call `initializeOwner(address _owner)` **once** to set contract ownership (e.g., to a multisig).
   * This function can only be called once and prevents re-initialization.

```javascript
const { deployProxy } = require('@openzeppelin/hardhat-upgrades');

const HYPEYToken = await ethers.getContractFactory("HYPEYToken");
const token = await deployProxy(HYPEYToken, [], {
  initializer: false,
  kind: 'uups'
});
await token.initializeOwner(multisigAddress);
```

---

## Key Functions

### Transfers & Burn Logic

* All standard transfers and transferFrom calls route through `_transferWithBurn`.
* For small transfers (<100 HYPEY) or when burn rate is 0, burn is skipped.
* Dynamic burn rate updates automatically on each transfer based on current supply.
* Burn amount is split: 50% burned immediately, 50% sent to reserve address.
* Transfer amount = original amount - total burn amount.

### Dynamic Burn Rate

* `burnRateBasisPoints` (1% = 100, 3% = 300)
* Burn rate auto-adjusts based on total supply:
  * Supply > 2.5B: 3% burn rate
  * Supply > 2B: 2% burn rate  
  * Supply ≤ 2B: 1% burn rate
* Owner can also set rate manually (max 3%)

---

### `setBurnRate`

Set burn rate manually (max 3%, in basis points).

```solidity
function setBurnRate(uint256 _basisPoints) external onlyOwner
```

* Requires `_basisPoints <= 300` (max 3%)

---

### `setReserveBurnAddress`

Set the address for reserve burns.

```solidity
function setReserveBurnAddress(address _addr) external onlyOwner
```

* Requires non-zero address

---

### `setPlatformApproved`

Approve or revoke a platform for fee burns.

```solidity
function setPlatformApproved(address platform, bool approved) external onlyOwner
```

---

### `setNFTContractApproved`

Approve or revoke an NFT contract for NFT burns.

```solidity
function setNFTContractApproved(address nftContract, bool approved) external onlyOwner
```

---

## Specialized Burn Functions

### `burnPlatformFee`

Burn and reserve a portion of platform fee. Only callable by approved platforms.

```solidity
function burnPlatformFee(uint256 amount, uint256 basisPoints) external
```

* Requires caller to be an approved platform
* Maximum 5% fee (500 basis points)
* Burns half immediately, sends half to reserve address
* Caller must have sufficient token balance

---

### `burnForNFT`

Burn tokens via NFT contract (mint/upgrade/etc). Only callable by approved NFT contracts.

```solidity
function burnForNFT(address user, uint256 amount) external
```

* Requires caller to be an approved NFT contract
* Burns tokens directly from user's balance
* No reserve allocation (full burn)

---

### `burnKPIEvent`

Owner-only: burn tokens for milestones or KPI events.

```solidity
function burnKPIEvent(uint256 amount) external onlyOwner
```

* Burns tokens from owner's balance
* No reserve allocation (full burn)
* Used for milestone celebrations or KPI achievements

---

## UUPS Upgrade Logic

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

## builder

Returns the contract author.

```solidity
function builder() external pure returns (string memory)
```

* Always returns `"Shahriya"`

### `builder`

Returns the builder attribution.

```solidity
function builder() external pure returns (string memory)
```

* Returns "Shahriya"
* Pure function, no state changes

---

## Security and Compliance Notes

* OnlyOwner can adjust burn rate, reserve address, platform/NFT permissions, and upgrades
* Two-step ownership initialization prevents unauthorized ownership claims
* All critical state changes should be covered by automated tests (see test/ folder)
* Upgrades must be managed by a multisig wallet for MiCA compliance
* Use OpenZeppelin's proxy admin tools to manage upgrades
* All transfers and burns emit standard ERC20 events for analytics and auditing
* UUPS upgrade authorization restricted to owner only

---

## Example Test Coverage

* Mint, transfer, and approve flows
* Burn scenarios (direct transfer, platform, NFT, KPI)
* Reserve logic
* Ownership assignment and reverts
* Upgrade (UUPS proxy) flow
* Fuzz testing on edge cases (e.g., small transfers, burn-exempt)

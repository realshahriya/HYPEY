// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract HYPEYToken is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public constant INITIAL_SUPPLY = 3_000_000_000 * 10**18;
    uint256 public constant MIN_EXEMPT_AMOUNT = 100 * 10**18;

    uint256 public burnRateBasisPoints; // 1% = 100, 3% = 300
    address public reserveBurnAddress;
    mapping(address => bool) public exemptFromBurn; // VSC5: Exempt wallets

    bool public ownerInitialized;
    mapping(address => bool) public approvedPlatforms;
    mapping(address => bool) public approvedNFTContracts;
    
    // Events for audit compliance
    event ReserveBurnAddressChanged(address indexed oldAddress, address indexed newAddress);
    event BurnRateChanged(uint256 oldRate, uint256 newRate);
    event ExemptStatusChanged(address indexed wallet, bool exempt);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// Step 1: Initialize token and supply
    function initialize(address _reserveBurnAddress) public initializer {
        require(_reserveBurnAddress != address(0), "Invalid reserve burn address");

        __ERC20_init("HYPEY Token", "HYPEY");
        __Ownable_init(); // Required for layout but doesn't set owner
        __UUPSUpgradeable_init();

        reserveBurnAddress = _reserveBurnAddress;
        burnRateBasisPoints = 100; // Default to 1%

        _mint(address(this), INITIAL_SUPPLY); // Mint 3B to contract
    }

    /// Step 2: Assign ownership after deployment (once only)
    function initializeOwner(address _owner) external {
        require(!ownerInitialized, "Owner already initialized");
        require(_owner != address(0), "Invalid owner address");

        _transferOwnership(_owner);
        ownerInitialized = true;
    }

    // --- Transfer Overrides with Burn Logic ---

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transferWithBurn(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _spendAllowance(sender, _msgSender(), amount);
        _transferWithBurn(sender, recipient, amount);
        return true;
    }

    bool public dynamicBurnEnabled;

    function _transferWithBurn(address sender, address recipient, uint256 amount) internal {
        if (exemptFromBurn[sender] || exemptFromBurn[recipient]) {
            super._transfer(sender, recipient, amount);
            return;
        }
        uint256 senderBalance = balanceOf(sender);
        uint256 minBurnAmount = senderBalance * 5 / 1000;
        if (minBurnAmount < MIN_EXEMPT_AMOUNT) {
            minBurnAmount = MIN_EXEMPT_AMOUNT;
        }
        if (amount < minBurnAmount || burnRateBasisPoints == 0) {
            super._transfer(sender, recipient, amount);
            return;
        }
        if (dynamicBurnEnabled) {
            _updateDynamicBurnRate();
        }
        uint256 burnAmount = (amount * burnRateBasisPoints) / 10000;
        uint256 burnNow = burnAmount / 2;
        uint256 toReserve = burnAmount - burnNow;
        uint256 sendAmount = amount - burnAmount;
        _burn(sender, burnNow);
        super._transfer(sender, reserveBurnAddress, toReserve);
        super._transfer(sender, recipient, sendAmount);
    }

    function _updateDynamicBurnRate() internal {
        // Optional auto-burn scaling (can be removed if only manual control desired)
        uint256 supply = totalSupply();

        if (supply > 2_500_000_000 * 1e18) {
            burnRateBasisPoints = 300; // 3%
        } else if (supply > 2_000_000_000 * 1e18) {
            burnRateBasisPoints = 200; // 2%
        } else {
            burnRateBasisPoints = 100; // 1%
        }
    }

    // --- Manual Admin Burn Settings ---

    function setBurnRate(uint256 _basisPoints) external onlyOwner {
        require(_basisPoints <= 300, "Burn rate must be between 0 and 3%");
        uint256 oldRate = burnRateBasisPoints;
        burnRateBasisPoints = _basisPoints;
        emit BurnRateChanged(oldRate, _basisPoints);
    }

    function setReserveBurnAddress(address _addr) external onlyOwner {
        require(_addr != address(0), "Invalid address");
        require(_addr != address(this), "Cannot be contract address"); // VSC2: Prevent hijacking
        address oldAddress = reserveBurnAddress;
        reserveBurnAddress = _addr;
        emit ReserveBurnAddressChanged(oldAddress, _addr);
    }
    
    // VSC5: Exempt wallet management
    function setExemptFromBurn(address wallet, bool exempt) external onlyOwner {
        require(wallet != address(0), "Invalid wallet address");
        exemptFromBurn[wallet] = exempt;
        emit ExemptStatusChanged(wallet, exempt);
    }
    
    // VSC4: Dynamic rate manipulation protection
    function setDynamicBurnEnabled(bool enabled) external onlyOwner {
        dynamicBurnEnabled = enabled;
    }

    /// @notice Allows owner to distribute initial supply from contract
    function distributeInitialSupply(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(balanceOf(address(this)) >= amount, "Insufficient contract balance");
        super._transfer(address(this), recipient, amount);
    }

    function setPlatformApproved(address platform, bool approved) external onlyOwner {
        require(platform != address(0), "Invalid platform address");
        require(platform != address(this), "Cannot approve self");
        approvedPlatforms[platform] = approved;
    }

    function setNFTContractApproved(address nftContract, bool approved) external onlyOwner {
        require(nftContract != address(0), "Invalid NFT contract address");
        require(nftContract != address(this), "Cannot approve self");
        approvedNFTContracts[nftContract] = approved;
    }

    // --- Burn via Platform Fees (ads, subscriptions, etc) ---

    function burnPlatformFee(uint256 amount, uint256 basisPoints) external {
        require(approvedPlatforms[msg.sender], "Not an approved platform");
        require(basisPoints <= 500, "Max 5%");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        uint256 burnAmount = (amount * basisPoints) / 10000;
        uint256 burnNow = burnAmount / 2;
        uint256 toReserve = burnAmount - burnNow;

        _burn(msg.sender, burnNow);
        super._transfer(msg.sender, reserveBurnAddress, toReserve);
    }

    // --- Burn via NFT Interactions (mint, upgrade, etc) ---

    function burnForNFT(address user, uint256 amount) external {
        require(approvedNFTContracts[msg.sender], "Not approved NFT contract");
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= balanceOf(user), "Insufficient user balance");
        // VSC3: Limit NFT burn to reasonable amounts (max 1% of user's balance per call)
        require(amount <= balanceOf(user) / 100, "NFT burn amount too high");
        _burn(user, amount);
    }

    // --- Burn via KPI Milestones (manual trigger by owner) ---

    function burnKPIEvent(uint256 amount) external onlyOwner {
        _burn(_msgSender(), amount);
    }
    
    function builder() external pure returns (string memory) {
        return "TOPAY DEV TEAM";
    }
    
    // --- UUPS Upgrade Authorization ---

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        require(msg.sender == address(timelock), "Upgrade only via timelock");
        require(hasRole(MULTISIG_ADMIN_ROLE, msg.sender), "Upgrade requires multisig admin");
    }
}
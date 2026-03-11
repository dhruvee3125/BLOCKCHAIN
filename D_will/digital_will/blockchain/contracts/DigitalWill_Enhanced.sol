// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DigitalWill_Enhanced
 * @dev Enhanced digital will contract with proper on-chain/off-chain separation
 * 
 * ON-CHAIN (Smart Contract):
 * - HASH OF THE DIGITAL WILL
 * - TRANSACTION RECORDS (Events)
 * - VERIFICATION STATUS
 * 
 * OFF-CHAIN (Backend/IPFS):
 * - FULL DIGITAL WILL DOCUMENT
 * - PERSONAL INFORMATION
 * - BENEFICIARY PERSONAL DETAILS
 * - CERTIFICATES
 * - LOGIN CREDENTIALS & SYSTEM LOGS
 */
contract DigitalWill_Enhanced {
    
    // Custom errors
    error UnauthorizedOwner();
    error UnauthorizedBeneficiary();
    error WillNotExecuted();
    error InvalidBeneficiary();
    error LockPeriodNotElapsed();
    error WillAlreadyExecuted();
    error WillNotVerified();

    // ON-CHAIN: Hash and verification status only
    struct WillMetadata {
        bytes32 willHash;               // Hash of full will document
        string ipfsCID;                 // Encrypted off-chain document
        uint256 lockPeriod;             // Lock time before claiming
        uint256 createdAt;              // Creation timestamp
        uint256 executedAt;             // Execution timestamp
        bool executed;                  // Execution status
        bool verified;                  // Verification status
        bool claimed;                   // Claim status
    }

    // State variables
    address public owner;
    address public beneficiary;
    address public legalAdvisor;        // Can verify the will
    WillMetadata public metadata;

    // Verification tracking
    mapping(address => bool) public verifiedBy;
    address[] public verifiers;

    // Events for transaction records (TRANSACTION RECORDS)
    event WillCreated(
        address indexed owner,
        address indexed beneficiary,
        bytes32 indexed willHash,
        string ipfsCID,
        uint256 lockPeriod,
        uint256 timestamp
    );

    event WillVerified(
        address indexed verifier,
        bytes32 indexed willHash,
        uint256 timestamp
    );

    event BeneficiaryUpdated(
        address indexed oldBeneficiary,
        address indexed newBeneficiary,
        bytes32 indexed willHash,
        uint256 timestamp
    );

    event WillExecuted(
        address indexed owner,
        bytes32 indexed willHash,
        uint256 executedTime,
        uint256 timestamp
    );

    event LockPeriodElapsed(
        address indexed beneficiary,
        bytes32 indexed willHash,
        uint256 timestamp
    );

    event AssetClaimed(
        address indexed beneficiary,
        bytes32 indexed willHash,
        uint256 timestamp
    );

    // Constructor
    constructor(
        address _owner,
        address _beneficiary,
        address _legalAdvisor,
        bytes32 _willHash,
        string memory _ipfsCID,
        uint256 _lockPeriod
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_willHash != bytes32(0), "Invalid will hash");
        require(bytes(_ipfsCID).length > 0, "IPFS CID required");

        owner = _owner;
        beneficiary = _beneficiary;
        legalAdvisor = _legalAdvisor;

        metadata.willHash = _willHash;
        metadata.ipfsCID = _ipfsCID;
        metadata.lockPeriod = _lockPeriod;
        metadata.createdAt = block.timestamp;
        metadata.executed = false;
        metadata.verified = false;
        metadata.claimed = false;

        emit WillCreated(
            _owner,
            _beneficiary,
            _willHash,
            _ipfsCID,
            _lockPeriod,
            block.timestamp
        );
    }

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedOwner();
        _;
    }

    modifier onlyBeneficiary() {
        if (msg.sender != beneficiary) revert UnauthorizedBeneficiary();
        _;
    }

    modifier onlyVerifier() {
        require(
            msg.sender == legalAdvisor || msg.sender == owner,
            "Not authorized to verify"
        );
        _;
    }

    /**
     * @dev Verify the will (Legal Advisor or Owner)
     * VERIFICATION STATUS - On-chain record
     */
    function verifyWill() external onlyVerifier {
        require(!metadata.verified, "Already verified");

        metadata.verified = true;
        verifiedBy[msg.sender] = true;
        verifiers.push(msg.sender);

        emit WillVerified(msg.sender, metadata.willHash, block.timestamp);
    }

    /**
     * @dev Update beneficiary (owner only, before execution)
     * Links to off-chain data update
     */
    function updateBeneficiary(address _newBeneficiary) external onlyOwner {
        if (_newBeneficiary == address(0)) revert InvalidBeneficiary();
        if (metadata.executed) revert WillAlreadyExecuted();

        address oldBeneficiary = beneficiary;
        beneficiary = _newBeneficiary;

        emit BeneficiaryUpdated(
            oldBeneficiary,
            _newBeneficiary,
            metadata.willHash,
            block.timestamp
        );
    }

    /**
     * @dev Execute the will (owner only)
     * TRANSACTION RECORD - On-chain record
     */
    function executeWill() external onlyOwner {
        if (metadata.executed) revert WillAlreadyExecuted();

        metadata.executed = true;
        metadata.executedAt = block.timestamp;

        emit WillExecuted(
            owner,
            metadata.willHash,
            metadata.executedAt,
            block.timestamp
        );
    }

    /**
     * @dev Check if lock period has elapsed
     */
    function isLockPeriodElapsed() external view returns (bool) {
        if (!metadata.executed) return false;
        return block.timestamp >= metadata.executedAt + metadata.lockPeriod;
    }

    /**
     * @dev Claim asset (beneficiary only, after lock period)
     * TRANSACTION RECORD - On-chain record
     */
    function claimAsset() external onlyBeneficiary {
        if (!metadata.executed) revert WillNotExecuted();
        if (block.timestamp < metadata.executedAt + metadata.lockPeriod) {
            revert LockPeriodNotElapsed();
        }
        if (metadata.claimed) revert("Already claimed");

        metadata.claimed = true;

        emit AssetClaimed(beneficiary, metadata.willHash, block.timestamp);
    }

    /**
     * @dev Get will metadata (on-chain only)
     * Hash and IPFS CID are verifiable on-chain
     */
    function getWillMetadata() external view returns (
        bytes32 willHash,
        string memory ipfsCID,
        uint256 lockPeriod,
        uint256 createdAt,
        uint256 executedAt,
        bool executed,
        bool verified,
        bool claimed
    ) {
        return (
            metadata.willHash,
            metadata.ipfsCID,
            metadata.lockPeriod,
            metadata.createdAt,
            metadata.executedAt,
            metadata.executed,
            metadata.verified,
            metadata.claimed
        );
    }

    /**
     * @dev Get will status
     */
    function getWillStatus() external view returns (
        bool isExecuted,
        bool isVerified,
        bool isClaimed,
        bool canClaim,
        uint256 timeUntilClaim
    ) {
        isExecuted = metadata.executed;
        isVerified = metadata.verified;
        isClaimed = metadata.claimed;

        if (!metadata.executed) {
            canClaim = false;
            timeUntilClaim = 0;
        } else if (block.timestamp >= metadata.executedAt + metadata.lockPeriod) {
            canClaim = true;
            timeUntilClaim = 0;
        } else {
            canClaim = false;
            timeUntilClaim = (metadata.executedAt + metadata.lockPeriod) - block.timestamp;
        }
    }

    /**
     * @dev Get verifiers list
     */
    function getVerifiers() external view returns (address[] memory) {
        return verifiers;
    }

    /**
     * @dev Get on-chain addresses (for access control)
     */
    function getAddresses() external view returns (
        address ownerAddr,
        address beneficiaryAddr,
        address advisorAddr
    ) {
        return (owner, beneficiary, legalAdvisor);
    }
}

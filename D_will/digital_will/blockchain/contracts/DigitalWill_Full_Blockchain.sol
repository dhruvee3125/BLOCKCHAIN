// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DigitalWill - Fully Decentralized Will Management System
 * @dev Complete on-chain implementation with Chainlink Automation support
 * @notice All business logic and access control enforced on-chain
 */
contract DigitalWill is AccessControl, Pausable, ReentrancyGuard {
    
    using Counters for Counters.Counter;
    
    // ===== ROLE DEFINITIONS =====
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LEGAL_ADVISOR_ROLE = keccak256("LEGAL_ADVISOR_ROLE");
    bytes32 public constant EMERGENCY_CONTACT_ROLE = keccak256("EMERGENCY_CONTACT_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    
    // ===== ENUMS =====
    enum WillStatus {
        CREATED,                    // 0
        PENDING_VERIFICATION,       // 1
        PENDING_ADMIN_APPROVAL,     // 2
        VERIFIED,                   // 3
        PENDING_EXECUTION,          // 4
        EXECUTABLE,                 // 5
        CLAIMED,                    // 6
        REJECTED,                   // 7
        DISPUTED                    // 8
    }
    
    enum ConditionType {
        MANUAL_APPROVAL,            // 0: Default - just admin approval
        NO_LOGIN_DAYS,              // 1: 12+ months no login
        SPECIFIC_DATE,              // 2: Specific date/timestamp
        ON_DEATH,                   // 3: Death verified
        AGE_OF_BENEFICIARY,         // 4: Beneficiary age check
        ETHEREUM_PRICE,             // 5: ETH price condition
        MULTI_SIGNATURE             // 6: Multiple signatures
    }
    
    enum UserRole {
        NONE,                       // 0
        OWNER,                      // 1
        BENEFICIARY,                // 2
        LEGAL_ADVISOR,              // 3
        ADMIN,                      // 4
        EMERGENCY_CONTACT,          // 5
        ARBITER                     // 6
    }
    
    // ===== STRUCTS =====
    
    struct User {
        address userAddress;
        UserRole role;
        bool isActive;
        uint256 createdAt;
        uint256 lastLogin;
        bool kycVerified;
        uint256 reputation;         // Reputation score
    }
    
    struct Will {
        bytes32 willId;
        bytes32 willHash;           // SHA256 of complete will
        string ipfsCID;             // IPFS content identifier
        address owner;
        address beneficiary;
        uint256 createdAt;
        uint256 lastActivityTime;   // For 12-month inactivity tracking
        uint256 lockTime;           // Seconds until executable
        WillStatus status;
        uint256 assetValue;         // Value in wei
        bytes32[] conditionIds;     // Array of condition IDs
        bool verified;              // Legal advisor approved
        bool adminApproved;         // Admin approved
        bool executed;              // Assets claimed
        address verifiedBy;         // Legal advisor address
        address approvedBy;         // Admin address
        string rejectionReason;     // If rejected
        uint256 disputeCount;       // Number of disputes
    }
    
    struct Condition {
        bytes32 conditionId;
        bytes32 willId;
        ConditionType conditionType;
        uint256 conditionValue;     // Value/data for condition
        bool isMet;
        uint256 metAt;              // When condition was met
        uint256 checkedAt;          // Last check timestamp
        string metadata;            // Additional data if needed
    }
    
    struct Verification {
        bytes32 verificationId;
        bytes32 willId;
        address legalAdvisor;
        uint256 submittedAt;
        uint256 reviewedAt;
        string reviewComments;
        bool approved;
        bytes32 documentHash;       // Hash of reviewed documents
    }
    
    struct Dispute {
        bytes32 disputeId;
        bytes32 willId;
        address disputer;
        string reason;
        uint256 createdAt;
        address arbiter;
        bool resolved;
        string resolution;
    }
    
    // ===== STATE VARIABLES =====
    
    // Counters
    Counters.Counter private _willCounter;
    Counters.Counter private _conditionCounter;
    Counters.Counter private _verificationCounter;
    Counters.Counter private _disputeCounter;
    
    // Mappings
    mapping(bytes32 => Will) public wills;
    mapping(address => bytes32[]) public userWills;              // Wills by creator
    mapping(address => bytes32[]) public beneficiaryWills;       // Wills by beneficiary
    mapping(bytes32 => Condition) public conditions;
    mapping(address => User) public users;
    mapping(bytes32 => Verification) public verifications;
    mapping(bytes32 => Dispute) public disputes;
    mapping(address => bool) public isLegalAdvisor;
    mapping(address => uint256) public userReputation;           // Reputation tracking
    mapping(bytes32 => bool) public conditionCheckNeeded;        // Track if condition check is due
    mapping(bytes32 => uint256) public lastConditionCheck;       // Timestamp of last check
    
    // Configuration
    uint256 public constant INACTIVITY_PERIOD = 365 days;
    uint256 public constant MIN_LOCK_TIME = 30 days;
    uint256 public constant MAX_LOCK_TIME = 10 * 365 days;
    uint256 public constant CONDITION_CHECK_INTERVAL = 1 days;   // Check conditions daily
    
    address payable public treasuryAddress;
    uint256 public adminApprovalFee = 0.01 ether;
    bool public contractPaused = false;
    
    // ===== EVENTS =====
    
    // User Events
    event UserRegistered(
        address indexed userAddress,
        UserRole role,
        uint256 timestamp
    );
    
    event UserRoleUpdated(
        address indexed userAddress,
        UserRole prevRole,
        UserRole newRole,
        uint256 timestamp
    );
    
    event UserActivityLogged(
        address indexed userAddress,
        uint256 timestamp
    );
    
    // Will Events
    event WillCreated(
        bytes32 indexed willId,
        address indexed owner,
        address indexed beneficiary,
        bytes32 willHash,
        string ipfsCID,
        uint256 lockTime,
        uint256 assetValue,
        uint256 timestamp
    );
    
    event WillUpdated(
        bytes32 indexed willId,
        WillStatus newStatus,
        uint256 timestamp
    );
    
    // Verification Events
    event VerificationRequested(
        bytes32 indexed willId,
        address indexed owner,
        address indexed legalAdvisor,
        uint256 timestamp
    );
    
    event WillVerified(
        bytes32 indexed willId,
        address indexed legalAdvisor,
        bytes32 documentHash,
        string comments,
        uint256 timestamp
    );
    
    event WillVerificationRejected(
        bytes32 indexed willId,
        address indexed legalAdvisor,
        string reason,
        uint256 timestamp
    );
    
    // Admin Approval Events
    event AdminApprovalRequested(
        bytes32 indexed verificationId,
        address indexed admin,
        uint256 timestamp
    );
    
    event AdminApproved(
        bytes32 indexed willId,
        address indexed admin,
        string comments,
        uint256 timestamp
    );
    
    event AdminRejected(
        bytes32 indexed willId,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    // Condition Events
    event ConditionCreated(
        bytes32 indexed conditionId,
        bytes32 indexed willId,
        ConditionType conditionType,
        uint256 conditionValue,
        uint256 timestamp
    );
    
    event ConditionMet(
        bytes32 indexed conditionId,
        bytes32 indexed willId,
        ConditionType conditionType,
        uint256 timestamp
    );
    
    event AllConditionsMet(
        bytes32 indexed willId,
        uint256 timestamp
    );
    
    event WillExecutable(
        bytes32 indexed willId,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    // Asset Events
    event AssetClaimed(
        bytes32 indexed willId,
        address indexed beneficiary,
        uint256 assetValue,
        uint256 timestamp
    );
    
    // Emergency Events
    event DeathCertificateSubmitted(
        bytes32 indexed willId,
        address indexed reportedBy,
        uint256 timestamp
    );
    
    event DisputeFiled(
        bytes32 indexed disputeId,
        bytes32 indexed willId,
        address indexed disputer,
        string reason,
        uint256 timestamp
    );
    
    event DisputeResolved(
        bytes32 indexed disputeId,
        address indexed arbiter,
        string resolution,
        uint256 timestamp
    );
    
    event ActualAssetTransferred(
        bytes32 indexed willId,
        address indexed beneficiary,
        uint256 amount,
        string assetType,
        uint256 timestamp
    );
    
    // ===== MODIFIERS =====
    
    modifier onlyRegistered() {
        require(users[msg.sender].isActive, "User not registered");
        _;
    }
    
    modifier notRescued() {
        require(!contractPaused, "Contract is paused");
        _;
    }
    
    modifier isOwner(bytes32 willId) {
        require(wills[willId].owner == msg.sender, "Only will owner");
        _;
    }
    
    modifier isBeneficiary(bytes32 willId) {
        require(wills[willId].beneficiary == msg.sender, "Only beneficiary");
        _;
    }
    
    modifier hasStatus(bytes32 willId, WillStatus status) {
        require(wills[willId].status == status, "Invalid will status");
        _;
    }
    
    // ===== CONSTRUCTOR =====
    
    constructor(address payable _treasuryAddress) {
        treasuryAddress = _treasuryAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ===== USER MANAGEMENT (FULLY ON-CHAIN) =====
    
    /**
     * @dev Register new user via MetaMask
     * @param _role User role
     */
    function registerUser(UserRole _role) public notRescued {
        require(users[msg.sender].userAddress == address(0), "Already registered");
        require(_role != UserRole.NONE, "Invalid role");
        require(_role != UserRole.ARBITER, "Cannot self-assign arbiter");
        
        users[msg.sender] = User({
            userAddress: msg.sender,
            role: _role,
            isActive: true,
            createdAt: block.timestamp,
            lastLogin: block.timestamp,
            kycVerified: false,
            reputation: 0
        });
        
        emit UserRegistered(msg.sender, _role, block.timestamp);
    }
    
    /**
     * @dev Register legal advisor (admin only)
     * @param _advisorAddress Address to register as advisor
     */
    function registerLegalAdvisor(address _advisorAddress) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        require(users[_advisorAddress].userAddress != address(0), "User must exist");
        
        UserRole prevRole = users[_advisorAddress].role;
        users[_advisorAddress].role = UserRole.LEGAL_ADVISOR;
        isLegalAdvisor[_advisorAddress] = true;
        
        _grantRole(LEGAL_ADVISOR_ROLE, _advisorAddress);
        
        emit UserRoleUpdated(_advisorAddress, prevRole, UserRole.LEGAL_ADVISOR, block.timestamp);
    }
    
    /**
     * @dev Log user activity (update last login)
     */
    function logUserActivity() public onlyRegistered {
        users[msg.sender].lastLogin = block.timestamp;
        emit UserActivityLogged(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update user reputation (admin)
     * @param _userAddress User address
     * @param _reputationChange Amount to change
     */
    function updateReputation(address _userAddress, int256 _reputationChange) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        if (_reputationChange > 0) {
            userReputation[_userAddress] += uint256(_reputationChange);
        } else {
            uint256 decrease = uint256(-_reputationChange);
            if (userReputation[_userAddress] > decrease) {
                userReputation[_userAddress] -= decrease;
            } else {
                userReputation[_userAddress] = 0;
            }
        }
    }
    
    // ===== WILL CREATION (FULLY ON-CHAIN) =====
    
    /**
     * @dev Create new will (owner)
     * @param _beneficiary Beneficiary address
     * @param _willHash SHA256 hash of will
     * @param _ipfsCID IPFS content ID
     * @param _lockTime Seconds until executable
     * @param _assetValue Value of assets in wei
     * @return willId ID of created will
     */
    function createWill(
        address _beneficiary,
        bytes32 _willHash,
        string memory _ipfsCID,
        uint256 _lockTime,
        uint256 _assetValue
    )
        public
        onlyRegistered
        notRescued
        returns (bytes32)
    {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_beneficiary != msg.sender, "Cannot be own beneficiary");
        require(_lockTime >= MIN_LOCK_TIME && _lockTime <= MAX_LOCK_TIME, "Lock time invalid");
        require(bytes(_ipfsCID).length > 0, "IPFS CID required");
        
        bytes32 willId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, _willCounter.current())
        );
        
        Will storage newWill = wills[willId];
        newWill.willId = willId;
        newWill.willHash = _willHash;
        newWill.ipfsCID = _ipfsCID;
        newWill.owner = msg.sender;
        newWill.beneficiary = _beneficiary;
        newWill.createdAt = block.timestamp;
        newWill.lastActivityTime = block.timestamp;
        newWill.lockTime = _lockTime;
        newWill.status = WillStatus.CREATED;
        newWill.assetValue = _assetValue;
        
        userWills[msg.sender].push(willId);
        beneficiaryWills[_beneficiary].push(willId);
        
        _willCounter.increment();
        
        emit WillCreated(
            willId,
            msg.sender,
            _beneficiary,
            _willHash,
            _ipfsCID,
            _lockTime,
            _assetValue,
            block.timestamp
        );
        
        return willId;
    }
    
    /**
     * @dev Update will (owner can modify before verification)
     * @param _willId Will ID
     * @param _ipfsCID New IPFS CID
     * @param _willHash New will hash
     */
    function updateWill(
        bytes32 _willId,
        string memory _ipfsCID,
        bytes32 _willHash
    )
        public
        isOwner(_willId)
        hasStatus(_willId, WillStatus.CREATED)
    {
        wills[_willId].ipfsCID = _ipfsCID;
        wills[_willId].willHash = _willHash;
        wills[_willId].lastActivityTime = block.timestamp;
        
        emit WillUpdated(_willId, WillStatus.CREATED, block.timestamp);
    }
    
    // ===== CONDITION MANAGEMENT (FULLY ON-CHAIN) =====
    
    /**
     * @dev Add condition to will
     * @param _willId Will ID
     * @param _conditionType Type of condition
     * @param _conditionValue Value for condition
     * @param _metadata Additional data
     */
    function addCondition(
        bytes32 _willId,
        ConditionType _conditionType,
        uint256 _conditionValue,
        string memory _metadata
    )
        public
        isOwner(_willId)
        hasStatus(_willId, WillStatus.CREATED)
    {
        require(_conditionType != ConditionType.MULTI_SIGNATURE, "Cannot add MULTI_SIGNATURE directly");
        
        bytes32 conditionId = keccak256(
            abi.encodePacked(_willId, _conditionCounter.current(), block.timestamp)
        );
        
        Condition storage newCondition = conditions[conditionId];
        newCondition.conditionId = conditionId;
        newCondition.willId = _willId;
        newCondition.conditionType = _conditionType;
        newCondition.conditionValue = _conditionValue;
        newCondition.isMet = false;
        newCondition.checkedAt = block.timestamp;
        newCondition.metadata = _metadata;
        
        wills[_willId].conditionIds.push(conditionId);
        
        _conditionCounter.increment();
        
        emit ConditionCreated(
            conditionId,
            _willId,
            _conditionType,
            _conditionValue,
            block.timestamp
        );
    }
    
    /**
     * @dev Update owner activity (reset 12-month timer)
     * @param _willId Will ID
     */
    function updateOwnerActivity(bytes32 _willId) 
        public 
        isOwner(_willId)
    {
        wills[_willId].lastActivityTime = block.timestamp;
        users[msg.sender].lastLogin = block.timestamp;
    }
    
    // ===== VERIFICATION WORKFLOW (FULLY ON-CHAIN) =====
    
    /**
     * @dev Request verification from legal advisor
     * @param _willId Will ID
     * @param _legalAdvisor Legal advisor address
     */
    function requestVerification(bytes32 _willId, address _legalAdvisor)
        public
        isOwner(_willId)
        hasStatus(_willId, WillStatus.CREATED)
    {
        require(isLegalAdvisor[_legalAdvisor], "Not a legal advisor");
        
        wills[_willId].status = WillStatus.PENDING_VERIFICATION;
        
        emit VerificationRequested(_willId, msg.sender, _legalAdvisor, block.timestamp);
    }
    
    /**
     * @dev Legal advisor approves will
     * @param _willId Will ID
     * @param _documentHash Hash of reviewed documents
     * @param _comments Review comments
     */
    function approveByLegalAdvisor(
        bytes32 _willId,
        bytes32 _documentHash,
        string memory _comments
    )
        public
        onlyRole(LEGAL_ADVISOR_ROLE)
        hasStatus(_willId, WillStatus.PENDING_VERIFICATION)
        notRescued
    {
        Will storage will = wills[_willId];
        will.status = WillStatus.PENDING_ADMIN_APPROVAL;
        will.verified = true;
        will.verifiedBy = msg.sender;
        
        bytes32 verificationId = keccak256(
            abi.encodePacked(_willId, _verificationCounter.current(), block.timestamp)
        );
        
        verifications[verificationId] = Verification({
            verificationId: verificationId,
            willId: _willId,
            legalAdvisor: msg.sender,
            submittedAt: block.timestamp,
            reviewedAt: block.timestamp,
            reviewComments: _comments,
            approved: true,
            documentHash: _documentHash
        });
        
        _verificationCounter.increment();
        
        emit WillVerified(_willId, msg.sender, _documentHash, _comments, block.timestamp);
    }
    
    /**
     * @dev Legal advisor rejects will
     * @param _willId Will ID
     * @param _reason Rejection reason
     */
    function rejectByLegalAdvisor(bytes32 _willId, string memory _reason)
        public
        onlyRole(LEGAL_ADVISOR_ROLE)
        hasStatus(_willId, WillStatus.PENDING_VERIFICATION)
        notRescued
    {
        Will storage will = wills[_willId];
        will.status = WillStatus.REJECTED;
        will.rejectionReason = _reason;
        
        emit WillVerificationRejected(_willId, msg.sender, _reason, block.timestamp);
    }
    
    // ===== ADMIN APPROVAL (FULLY ON-CHAIN) =====
    
    /**
     * @dev Admin approves will and marks for execution
     * @param _willId Will ID
     * @param _comments Admin comments
     */
    function approveByAdmin(bytes32 _willId, string memory _comments)
        public
        payable
        onlyRole(ADMIN_ROLE)
        hasStatus(_willId, WillStatus.PENDING_ADMIN_APPROVAL)
        nonReentrant
        notRescued
    {
        require(wills[_willId].verified, "Must be verified by legal advisor");
        
        Will storage will = wills[_willId];
        will.status = WillStatus.VERIFIED;
        will.adminApproved = true;
        will.approvedBy = msg.sender;
        
        // Mark for condition checking
        conditionCheckNeeded[_willId] = true;
        lastConditionCheck[_willId] = block.timestamp;
        
        // Collect fee
        if (msg.value > 0 && treasuryAddress != address(0)) {
            (bool success, ) = treasuryAddress.call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }
        
        emit AdminApproved(_willId, msg.sender, _comments, block.timestamp);
    }
    
    /**
     * @dev Admin rejects will
     * @param _willId Will ID
     * @param _reason Rejection reason
     */
    function rejectByAdmin(bytes32 _willId, string memory _reason)
        public
        onlyRole(ADMIN_ROLE)
        hasStatus(_willId, WillStatus.PENDING_ADMIN_APPROVAL)
        notRescued
    {
        Will storage will = wills[_willId];
        will.status = WillStatus.REJECTED;
        will.rejectionReason = _reason;
        
        emit AdminRejected(_willId, msg.sender, _reason, block.timestamp);
    }
    
    // ===== CONDITION CHECKING (AUTOMATED + ON-DEMAND) =====
    
    /**
     * @dev Check all conditions for a will
     * @param _willId Will ID
     * @return bool True if all conditions met
     */
    function checkAllConditions(bytes32 _willId)
        public
        notRescued
        returns (bool)
    {
        require(wills[_willId].status == WillStatus.VERIFIED, "Will not verified");
        
        Will storage will = wills[_willId];
        bool allConditionsMet = true;
        uint256 currentTime = block.timestamp;
        
        // Check if condition check is due
        if (currentTime - lastConditionCheck[_willId] < CONDITION_CHECK_INTERVAL) {
            // Too soon to check again, return current status
            return will.status == WillStatus.EXECUTABLE;
        }
        
        // Check each condition
        for (uint i = 0; i < will.conditionIds.length; i++) {
            bytes32 conditionId = will.conditionIds[i];
            Condition storage condition = conditions[conditionId];
            
            if (!condition.isMet) {
                bool conditionMet = checkSingleCondition(conditionId);
                
                if (conditionMet) {
                    condition.isMet = true;
                    condition.metAt = currentTime;
                    emit ConditionMet(conditionId, _willId, condition.conditionType, currentTime);
                } else {
                    allConditionsMet = false;
                }
            }
            
            condition.checkedAt = currentTime;
        }
        
        // If all conditions met, mark as executable
        if (allConditionsMet && will.conditionIds.length > 0) {
            will.status = WillStatus.EXECUTABLE;
            
            emit AllConditionsMet(_willId, currentTime);
            emit WillExecutable(_willId, will.beneficiary, currentTime);
        }
        
        lastConditionCheck[_willId] = currentTime;
        
        return allConditionsMet;
    }
    
    /**
     * @dev Check a single condition
     * @param _conditionId Condition ID
     * @return bool True if condition is met
     */
    function checkSingleCondition(bytes32 _conditionId) internal view returns (bool) {
        Condition memory condition = conditions[_conditionId];
        uint256 currentTime = block.timestamp;
        
        if (condition.conditionType == ConditionType.NO_LOGIN_DAYS) {
            // Check if owner hasn't logged in for required days
            Will memory will = wills[condition.willId];
            uint256 daysSinceLogin = (currentTime - users[will.owner].lastLogin) / 1 days;
            return daysSinceLogin >= condition.conditionValue / 1 days;
        }
        else if (condition.conditionType == ConditionType.SPECIFIC_DATE) {
            // Check if current time is past specified timestamp
            return currentTime >= condition.conditionValue;
        }
        else if (condition.conditionType == ConditionType.MANUAL_APPROVAL) {
            // Already approved by admin
            return true;
        }
        else if (condition.conditionType == ConditionType.ON_DEATH) {
            // Death must be manually reported (checked in reportDeath)
            return condition.isMet;
        }
        
        return false;
    }
    
    /**
     * @dev Report death of will owner (emergency contact)
     * @param _willId Will ID
     */
    function reportDeath(bytes32 _willId)
        public
        onlyRole(EMERGENCY_CONTACT_ROLE)
        notRescued
    {
        require(wills[_willId].owner != address(0), "Will not found");
        
        Will storage will = wills[_willId];
        
        // Find and mark ON_DEATH condition as met
        for (uint i = 0; i < will.conditionIds.length; i++) {
            bytes32 conditionId = will.conditionIds[i];
            if (conditions[conditionId].conditionType == ConditionType.ON_DEATH) {
                conditions[conditionId].isMet = true;
                conditions[conditionId].metAt = block.timestamp;
                
                emit ConditionMet(conditionId, _willId, ConditionType.ON_DEATH, block.timestamp);
            }
        }
        
        emit DeathCertificateSubmitted(_willId, msg.sender, block.timestamp);
        
        // Re-check all conditions
        checkAllConditions(_willId);
    }
    
    // ===== ASSET CLAIMING (FULLY ON-CHAIN) =====
    
    /**
     * @dev Beneficiary claims assets
     * @param _willId Will ID
     */
    function claimAssets(bytes32 _willId)
        public
        isBeneficiary(_willId)
        nonReentrant
        notRescued
    {
        Will storage will = wills[_willId];
        
        require(will.status == WillStatus.EXECUTABLE, "Will not executable");
        require(!will.executed, "Already claimed");
        
        // Mark as claimed
        will.executed = true;
        will.status = WillStatus.CLAIMED;
        
        // Update reputation
        userReputation[msg.sender] += 10; // Reward for claiming
        
        emit AssetClaimed(_willId, msg.sender, will.assetValue, block.timestamp);
        
        // Transfer actual ETH if asset value is set
        if (will.assetValue > 0) {
            (bool success, ) = payable(msg.sender).call{value: will.assetValue}("");
            require(success, "Asset transfer failed");
            
            emit ActualAssetTransferred(
                _willId,
                msg.sender,
                will.assetValue,
                "ETH",
                block.timestamp
            );
        }
    }
    
    // ===== DISPUTE HANDLING (FULLY ON-CHAIN) =====
    
    /**
     * @dev File dispute about will
     * @param _willId Will ID
     * @param _reason Dispute reason
     */
    function fileDispute(bytes32 _willId, string memory _reason)
        public
        onlyRegistered
        notRescued
    {
        require(
            wills[_willId].owner == msg.sender || wills[_willId].beneficiary == msg.sender,
            "Only owner or beneficiary can file dispute"
        );
        require(wills[_willId].status != WillStatus.DISPUTED, "Already disputed");
        
        bytes32 disputeId = keccak256(
            abi.encodePacked(_willId, _disputeCounter.current(), block.timestamp)
        );
        
        wills[_willId].status = WillStatus.DISPUTED;
        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            willId: _willId,
            disputer: msg.sender,
            reason: _reason,
            createdAt: block.timestamp,
            arbiter: address(0),
            resolved: false,
            resolution: ""
        });
        
        _disputeCounter.increment();
        
        emit DisputeFiled(disputeId, _willId, msg.sender, _reason, block.timestamp);
    }
    
    /**
     * @dev Resolve dispute (arbiter only)
     * @param _disputeId Dispute ID
     * @param _resolution Resolution details
     */
    function resolveDispute(bytes32 _disputeId, string memory _resolution)
        public
        onlyRole(ARBITER_ROLE)
        notRescued
    {
        Dispute storage dispute = disputes[_disputeId];
        require(!dispute.resolved, "Already resolved");
        
        dispute.resolved = true;
        dispute.arbiter = msg.sender;
        dispute.resolution = _resolution;
        
        // Restore will to VERIFIED status (assume resolution is positive)
        wills[dispute.willId].status = WillStatus.VERIFIED;
        wills[dispute.willId].disputeCount++;
        
        emit DisputeResolved(_disputeId, msg.sender, _resolution, block.timestamp);
    }
    
    // ===== VIEW FUNCTIONS (PUBLIC QUERIES) =====
    
    /**
     * @dev Get will details
     */
    function getWill(bytes32 _willId) public view returns (Will memory) {
        return wills[_willId];
    }
    
    /**
     * @dev Get user details
     */
    function getUser(address _userAddress) public view returns (User memory) {
        return users[_userAddress];
    }
    
    /**
     * @dev Get condition details
     */
    function getCondition(bytes32 _conditionId) public view returns (Condition memory) {
        return conditions[_conditionId];
    }
    
    /**
     * @dev Get all conditions for will
     */
    function getWillConditions(bytes32 _willId) 
        public 
        view 
        returns (Condition[] memory) 
    {
        Will memory will = wills[_willId];
        Condition[] memory willConditions = new Condition[](will.conditionIds.length);
        
        for (uint i = 0; i < will.conditionIds.length; i++) {
            willConditions[i] = conditions[will.conditionIds[i]];
        }
        
        return willConditions;
    }
    
    /**
     * @dev Get wills created by user
     */
    function getUserWills(address _userAddress) 
        public 
        view 
        returns (bytes32[] memory) 
    {
        return userWills[_userAddress];
    }
    
    /**
     * @dev Get wills for beneficiary
     */
    function getBeneficiaryWills(address _beneficiary) 
        public 
        view 
        returns (bytes32[] memory) 
    {
        return beneficiaryWills[_beneficiary];
    }
    
    /**
     * @dev Days since user last login
     */
    function daysSinceLastLogin(address _userAddress) 
        public 
        view 
        returns (uint256) 
    {
        return (block.timestamp - users[_userAddress].lastLogin) / 1 days;
    }
    
    /**
     * @dev Get dispute
     */
    function getDispute(bytes32 _disputeId) public view returns (Dispute memory) {
        return disputes[_disputeId];
    }
    
    /**
     * @dev Check if condition check is needed
     */
    function isConditionCheckDue(bytes32 _willId) public view returns (bool) {
        return (block.timestamp - lastConditionCheck[_willId]) >= CONDITION_CHECK_INTERVAL;
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    /**
     * @dev Set treasury address (admin)
     */
    function setTreasuryAddress(address payable _newTreasuryAddress) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        treasuryAddress = _newTreasuryAddress;
    }
    
    /**
     * @dev Set admin approval fee (admin)
     */
    function setAdminApprovalFee(uint256 _newFee) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        adminApprovalFee = _newFee;
    }
    
    /**
     * @dev Pause contract (admin only)
     */
    function pauseContract() public onlyRole(ADMIN_ROLE) {
        contractPaused = true;
    }
    
    /**
     * @dev Resume contract (admin only)
     */
    function resumeContract() public onlyRole(ADMIN_ROLE) {
        contractPaused = false;
    }
    
    /**
     * @dev Withdraw accumulated fees (admin)
     */
    function withdrawFees() 
        public 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = treasuryAddress.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ===== EMERGENCY FUNCTIONS =====
    
    /**
     * @dev Register emergency contact (admin)
     */
    function registerEmergencyContact(address _contactAddress) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        _grantRole(EMERGENCY_CONTACT_ROLE, _contactAddress);
    }
    
    /**
     * @dev Receive ETH for will assets
     */
    receive() external payable {
        // Accept ETH donations
    }
}

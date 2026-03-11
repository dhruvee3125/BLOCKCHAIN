// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DigitalWill_Advanced
 * @dev Advanced digital will with 4 stakeholders: owner, beneficiary, legal advisor, admin
 * Features: IPFS document storage, optional admin approval, role-based execution
 */
contract DigitalWill_Advanced {
    
    // Stakeholder Roles
    enum UserRole { NONE, OWNER, BENEFICIARY, LEGAL_ADVISOR, ADMIN }
    
    // Will Status - Updated with admin approval step
    enum WillStatus { CREATED, PENDING_VERIFICATION, VERIFIED, PENDING_ADMIN_APPROVAL, EXECUTED, CLAIMED }
    
    // Events
    event WillCreated(
        address indexed owner,
        address indexed beneficiary,
        address indexed legalAdvisor,
        string asset,
        uint256 lockTime,
        uint256 timestamp
    );

    event VerificationRequested(
        address indexed will,
        address indexed legalAdvisor,
        uint256 timestamp
    );

    event WillVerified(
        address indexed legalAdvisor,
        bool verified,
        string reason,
        uint256 timestamp
    );

    event WillExecuted(
        address indexed executor,
        uint256 timestamp
    );

    event AssetClaimed(
        address indexed beneficiary,
        string asset,
        uint256 timestamp
    );

    event RoleAssigned(
        address indexed user,
        UserRole role,
        uint256 timestamp
    );

    event WillStatusChanged(
        WillStatus oldStatus,
        WillStatus newStatus,
        uint256 timestamp
    );

    event IPFSDocumentUploaded(
        address indexed owner,
        string ipfsCID,
        uint256 timestamp
    );

    event AdminApprovalRequested(
        address indexed systemAdmin,
        uint256 timestamp
    );

    event AdminApprovalGranted(
        address indexed admin,
        uint256 timestamp
    );

    event AdminApprovalRejected(
        address indexed admin,
        string reason,
        uint256 timestamp
    );

    // State variables
    address public owner;
    address public beneficiary;
    address public legalAdvisor;
    address public systemAdmin;
    
    string public asset;
    string public assetDescription;
    string public ipfsCID; // IPFS Content ID for encrypted will document
    
    bool public executed;
    bool public verified;
    bool public claimed;
    bool public requiresAdminApproval; // Whether will requires admin approval
    bool public adminApprovalGranted; // Admin has approved execution
    
    uint256 public createdTime;
    uint256 public executionTime;
    uint256 public lockTime; // Time lock before will can be executed
    uint256 public claimedTime;
    
    string public verificationReason;
    
    WillStatus public willStatus;
    
    mapping(address => UserRole) public userRoles;
    
    // Constructor
    constructor(
        address _owner,
        address _beneficiary,
        address _legalAdvisor,
        address _admin,
        string memory _asset,
        string memory _assetDescription,
        uint256 _lockTime,
        bool _requiresAdminApproval
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_legalAdvisor != address(0), "Invalid legal advisor");
        require(_admin != address(0), "Invalid admin");
        require(bytes(_asset).length > 0, "Asset required");
        
        owner = _owner;
        beneficiary = _beneficiary;
        legalAdvisor = _legalAdvisor;
        systemAdmin = _admin;
        
        asset = _asset;
        assetDescription = _assetDescription;
        lockTime = _lockTime;
        requiresAdminApproval = _requiresAdminApproval;
        
        executed = false;
        verified = false;
        claimed = false;
        adminApprovalGranted = false;
        ipfsCID = "";
        createdTime = block.timestamp;
        
        willStatus = WillStatus.CREATED;
        
        // Assign roles
        userRoles[_owner] = UserRole.OWNER;
        userRoles[_beneficiary] = UserRole.BENEFICIARY;
        userRoles[_legalAdvisor] = UserRole.LEGAL_ADVISOR;
        userRoles[_admin] = UserRole.ADMIN;
        
        emit WillCreated(
            owner,
            beneficiary,
            legalAdvisor,
            asset,
            lockTime,
            block.timestamp
        );
    }
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "Only beneficiary can call");
        _;
    }
    
    modifier onlyLegalAdvisor() {
        require(msg.sender == legalAdvisor, "Only legal advisor can call");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == systemAdmin, "Only admin can call");
        _;
    }
    
    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner || msg.sender == systemAdmin, "Unauthorized");
        _;
    }
    
    // Store IPFS CID of encrypted will document
    function setIPFSDocumentCID(string memory _ipfsCID) public onlyOwner {
        require(bytes(_ipfsCID).length > 0, "CID required");
        ipfsCID = _ipfsCID;
        emit IPFSDocumentUploaded(msg.sender, _ipfsCID, block.timestamp);
    }
    
    // Request admin approval for execution
    function requestAdminApproval() public onlyOwner {
        require(willStatus == WillStatus.VERIFIED, "Must be verified first");
        require(requiresAdminApproval, "Admin approval not required");
        require(!adminApprovalGranted, "Already approved");
        
        willStatus = WillStatus.PENDING_ADMIN_APPROVAL;
        emit AdminApprovalRequested(systemAdmin, block.timestamp);
    }
    
    // Admin grants approval
    function grantAdminApproval() public onlyAdmin {
        require(willStatus == WillStatus.PENDING_ADMIN_APPROVAL, "Not pending approval");
        adminApprovalGranted = true;
        emit AdminApprovalGranted(msg.sender, block.timestamp);
    }
    
    // Admin rejects approval
    function rejectAdminApproval(string memory _reason) public onlyAdmin {
        require(willStatus == WillStatus.PENDING_ADMIN_APPROVAL, "Not pending approval");
        willStatus = WillStatus.VERIFIED; // Back to verified state
        adminApprovalGranted = false;
        emit AdminApprovalRejected(msg.sender, _reason, block.timestamp);
    }
    
    // Request verification from legal advisor
    function requestVerification() public onlyOwner {
        require(willStatus == WillStatus.CREATED, "Will already submitted");
        willStatus = WillStatus.PENDING_VERIFICATION;
        
        emit VerificationRequested(address(this), legalAdvisor, block.timestamp);
    }
    
    // Legal advisor verifies the will
    function verifyWill(bool _verified, string memory _reason) public onlyLegalAdvisor {
        require(willStatus == WillStatus.PENDING_VERIFICATION, "Not pending verification");
        
        verified = _verified;
        verificationReason = _reason;
        
        if (_verified) {
            willStatus = WillStatus.VERIFIED;
        } else {
            willStatus = WillStatus.CREATED; // Back to created for resubmission
        }
        
        emit WillVerified(msg.sender, _verified, _reason, block.timestamp);
    }
    
    // Execute will (only after legal verification and lock time)
    function executeWill() public onlyOwnerOrAdmin {
        require(executed == false, "Will already executed");
        require(
            block.timestamp >= createdTime + lockTime,
            "Lock period not elapsed"
        );
        
        // Check verification and admin approval requirements
        require(verified, "Will not verified");
        
        if (requiresAdminApproval) {
            require(willStatus == WillStatus.PENDING_ADMIN_APPROVAL, "Pending admin approval");
            require(adminApprovalGranted, "Admin approval not granted");
        } else {
            require(willStatus == WillStatus.VERIFIED, "Will not verified");
        }
        
        executed = true;
        executionTime = block.timestamp;
        willStatus = WillStatus.EXECUTED;
        
        emit WillExecuted(msg.sender, block.timestamp);
    }
    
    // Beneficiary claims asset
    function claimAsset() public onlyBeneficiary returns (string memory) {
        require(executed, "Will not executed yet");
        require(!claimed, "Asset already claimed");
        require(willStatus == WillStatus.EXECUTED, "Invalid will status");
        
        claimed = true;
        claimedTime = block.timestamp;
        willStatus = WillStatus.CLAIMED;
        
        emit AssetClaimed(msg.sender, asset, block.timestamp);
        
        return asset;
    }
    
    // Get will details
    function getWillDetails() public view returns (
        address,
        address,
        address,
        address,
        string memory,
        string memory,
        string memory,
        bool,
        bool,
        bool,
        bool,
        bool,
        uint256,
        WillStatus
    ) {
        return (
            owner,
            beneficiary,
            legalAdvisor,
            systemAdmin,
            asset,
            assetDescription,
            ipfsCID,
            executed,
            verified,
            claimed,
            requiresAdminApproval,
            adminApprovalGranted,
            executionTime,
            willStatus
        );
    }
    
    // Get user role
    function getUserRole(address _user) public view returns (UserRole) {
        return userRoles[_user];
    }
    
    // Get status string
    function getStatusString() public view returns (string memory) {
        if (willStatus == WillStatus.CREATED) return "CREATED";
        if (willStatus == WillStatus.PENDING_VERIFICATION) return "PENDING_VERIFICATION";
        if (willStatus == WillStatus.VERIFIED) return "VERIFIED";
        if (willStatus == WillStatus.PENDING_ADMIN_APPROVAL) return "PENDING_ADMIN_APPROVAL";
        if (willStatus == WillStatus.EXECUTED) return "EXECUTED";
        if (willStatus == WillStatus.CLAIMED) return "CLAIMED";
        return "UNKNOWN";
    }
    
    // Admin can override verification (emergency only)
    function adminOverrideVerification(bool _verified) public onlyAdmin {
        verified = _verified;
        if (_verified) {
            willStatus = WillStatus.VERIFIED;
        }
    }
    
    // Admin can override execution (emergency only)
    function adminForceExecute() public onlyAdmin {
        require(!executed, "Already executed");
        executed = true;
        executionTime = block.timestamp;
        willStatus = WillStatus.EXECUTED;
        emit WillExecuted(msg.sender, block.timestamp);
    }
}

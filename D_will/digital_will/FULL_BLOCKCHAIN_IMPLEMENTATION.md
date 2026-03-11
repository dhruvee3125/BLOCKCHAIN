# 🔗 Full Blockchain Implementation - Complete Architecture

**Status**: FULL BLOCKCHAIN MODE
**Date**: March 11, 2026

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Smart Contract Design](#smart-contract-design)
3. [Smart Contract Implementation](#smart-contract-implementation)
4. [Blockchain Roles & Permissions](#blockchain-roles--permissions)
5. [Backend Simplification](#backend-simplification)
6. [Frontend Integration](#frontend-integration)
7. [Chainlink Automation Integration](#chainlink-automation-integration)
8. [Complete User Workflows](#complete-user-workflows)
9. [Security Considerations](#security-considerations)
10. [Deployment Guide](#deployment-guide)

---

## 🏗️ Architecture Overview

### **Full Blockchain Stack:**

```
┌─────────────────────────────────────────────────────────┐
│                   USER INTERFACE (React)                │
│         Connected via Web3.js to MetaMask Wallet        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓ (Direct blockchain calls)
┌─────────────────────────────────────────────────────────┐
│            SMART CONTRACT (Solidity - Main Logic)       │
│  DigitalWill.sol - ALL business logic on-chain          │
│  ├─ Will creation & storage (on-chain)                │
│  ├─ Verification flow (on-chain)                      │
│  ├─ Admin approval (on-chain)                         │
│  ├─ Role management (on-chain)                        │
│  ├─ Condition checking (Chainlink automation)         │
│  ├─ Asset claiming (on-chain)                         │
│  ├─ Event logging (immutable)                         │
│  └─ Access control (on-chain modifiers)              │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    ┌────────┐   ┌─────────┐   ┌──────────────┐
    │ IPFS   │   │Chainlink│   │ Blockchain  │
    │Storage │   │Automation  │   │ Network    │
    │        │   │(Condition  │   │(Ethereum)  │
    │Encrypted  │   │ Checking)  │   │            │
    │Docs    │   │         │   │(Hardhat)   │
    └────────┘   └─────────┘   └──────────────┘
        ↑              ↑              ↑
        │              │              │
    ┌────────────────────────────────────────┐
    │      BACKEND (Node.js - Minimal)       │
    │  - IPFS gateway/upload                 │
    │  - Encryption/decryption service       │
    │  - Optional: User management           │
    │  - Optional: Metadata caching          │
    └────────────────────────────────────────┘
```

---

## 🎯 Smart Contract Design

### **Data Structures:**

```solidity
// Enums
enum WillStatus {
    CREATED,                    // 0: Just created
    PENDING_VERIFICATION,       // 1: Waiting for legal advisor
    PENDING_ADMIN_APPROVAL,     // 2: Waiting for admin
    VERIFIED,                   // 3: Approved by admin
    PENDING_EXECUTION,          // 4: Waiting for condition check
    EXECUTABLE,                 // 5: Ready to claim
    CLAIMED,                    // 6: Assets claimed
    REJECTED,                   // 7: Will was rejected
    DISPUTED                    // 8: Under dispute
}

enum ConditionType {
    MANUAL_APPROVAL,            // 0: Manual approval needed
    NO_LOGIN_DAYS,              // 1: 12+ months no login
    SPECIFIC_DATE,              // 2: Set date
    ON_DEATH,                   // 3: Death verified
    AGE_OF_BENEFICIARY,         // 4: Beneficiary age 18+
    MULTIPLE_CONDITIONS         // 5: Multiple conditions (AND/OR)
}

enum UserRole {
    NONE,                       // 0: No role
    OWNER,                      // 1: Will creator
    BENEFICIARY,                // 2: Asset recipient
    LEGAL_ADVISOR,              // 3: Verifies will
    ADMIN,                      // 4: Final approval
    EMERGENCY_CONTACT,          // 5: Death notifier
    ARBITER                     // 6: Dispute resolver
}

// Main Will Structure
struct Will {
    bytes32 willHash;                   // SHA256 of full will
    string ipfsCID;                     // IPFS location
    address owner;                      // Will creator
    address beneficiary;                // Asset recipient
    uint256 createdAt;                  // Timestamp
    uint256 lockTime;                   // Seconds until executable
    WillStatus status;                  // Current status
    uint256 assetValue;                 // Asset value in wei
    bytes32[] conditionIds;             // Array of conditions
    bool verified;                      // Verified by legal advisor
    bool adminApproved;                 // Approved by admin
    bool executed;                      // Claimed by beneficiary
    uint256 lastActivityTime;           // Last owner activity
    address verifiedBy;                 // Legal advisor address
    address approvedBy;                 // Admin address
    string rejectionReason;             // If rejected
}

// Condition Structure
struct Condition {
    bytes32 conditionId;                // Unique ID
    bytes32 willId;                     // Associated will
    ConditionType conditionType;        // Type of condition
    uint256 conditionValue;             // Value (days, date, etc.)
    bool isMet;                         // Is condition satisfied
    uint256 metAt;                      // When condition was met
    uint256 checkedAt;                  // Last check time
}

// User Structure
struct User {
    address userAddress;                // Ethereum address
    UserRole role;                      // User role
    string username;                    // Username (encrypted off-chain)
    bool isActive;                      // Is user active
    uint256 createdAt;                  // Account creation
    uint256 lastLogin;                  // Last login
    bool kycVerified;                   // KYC passed
    string publicKey;                   // For encryption
}

// Verification Structure
struct Verification {
    bytes32 verificationId;             // Unique ID
    bytes32 willId;                     // Associated will
    address legalAdvisor;               // Advisor address
    uint256 submittedAt;                // Submission time
    uint256 reviewedAt;                 // Review time
    string reviewComments;              // Advisor comments
    bool approved;                      // Advisor decision
}

// Approval Structure
struct Approval {
    bytes32 approvalId;                 // Unique ID
    bytes32 verificationId;             // Associated verification
    address admin;                      // Admin address
    uint256 approvedAt;                 // Approval time
    string adminComments;               // Admin notes
    bool approved;                      // Admin decision
}
```

---

## 💻 Smart Contract Implementation

### **Complete DigitalWill.sol:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title DigitalWill
 * @dev Full blockchain-based digital will management system
 * All business logic and access control on-chain
 */
contract DigitalWill is AccessControl, Pausable, ReentrancyGuard, AutomationCompatibleInterface {
    
    // Use counters for unique IDs
    using Counters for Counters.Counter;
    
    // ========== CONSTANTS ==========
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant LEGAL_ADVISOR_ROLE = keccak256("LEGAL_ADVISOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EMERGENCY_CONTACT_ROLE = keccak256("EMERGENCY_CONTACT_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    
    // ========== ENUMS ==========
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
        MANUAL_APPROVAL,
        NO_LOGIN_DAYS,
        SPECIFIC_DATE,
        ON_DEATH,
        AGE_OF_BENEFICIARY,
        MULTIPLE_CONDITIONS
    }
    
    enum UserRole {
        NONE,
        OWNER,
        BENEFICIARY,
        LEGAL_ADVISOR,
        ADMIN,
        EMERGENCY_CONTACT,
        ARBITER
    }
    
    // ========== STRUCTS ==========
    struct Will {
        bytes32 willHash;
        string ipfsCID;
        address owner;
        address beneficiary;
        uint256 createdAt;
        uint256 lockTime;
        WillStatus status;
        uint256 assetValue;
        bytes32[] conditionIds;
        bool verified;
        bool adminApproved;
        bool executed;
        uint256 lastActivityTime;
        address verifiedBy;
        address approvedBy;
        string rejectionReason;
    }
    
    struct Condition {
        bytes32 conditionId;
        bytes32 willId;
        ConditionType conditionType;
        uint256 conditionValue;
        bool isMet;
        uint256 metAt;
        uint256 checkedAt;
    }
    
    struct User {
        address userAddress;
        UserRole role;
        bool isActive;
        uint256 createdAt;
        uint256 lastLogin;
        bool kycVerified;
    }
    
    struct Verification {
        bytes32 verificationId;
        bytes32 willId;
        address legalAdvisor;
        uint256 submittedAt;
        uint256 reviewedAt;
        string reviewComments;
        bool approved;
    }
    
    struct Approval {
        bytes32 approvalId;
        bytes32 verificationId;
        address admin;
        uint256 approvedAt;
        string adminComments;
        bool approved;
    }
    
    // ========== STATE VARIABLES ==========
    
    // Counters
    Counters.Counter private _willCounter;
    Counters.Counter private _conditionCounter;
    Counters.Counter private _verificationCounter;
    Counters.Counter private _approvalCounter;
    
    // Mappings
    mapping(bytes32 => Will) public wills;
    mapping(address => bytes32[]) public userWills;                    // Wills created by user
    mapping(address => bytes32[]) public beneficiaryWills;             // Wills for beneficiary
    mapping(bytes32 => Condition) public conditions;
    mapping(bytes32 => Verification) public verifications;
    mapping(bytes32 => Approval) public approvals;
    mapping(address => User) public users;
    mapping(bytes32 => address) public willToAdmin;                    // Will to assigned admin
    mapping(bytes32 => bool) public conditionCheckScheduled;           // For Chainlink automation
    
    // Constants
    uint256 public constant INACTIVITY_PERIOD = 365 days;
    uint256 public constant MIN_LOCK_TIME = 30 days;
    uint256 public constant MAX_LOCK_TIME = 10 * 365 days;
    
    // Configuration
    uint256 public adminApprovalFee = 0.01 ether;                      // Fee for admin approval
    address payable public treasuryAddress;
    
    // ========== EVENTS ==========
    
    // User Events
    event UserRegistered(address indexed user, UserRole role, uint256 timestamp);
    event UserRoleUpdated(address indexed user, UserRole newRole, uint256 timestamp);
    event UserActivityLogged(address indexed user, uint256 timestamp);
    
    // Will Creation Events
    event WillCreated(
        bytes32 indexed willId,
        address indexed owner,
        address indexed beneficiary,
        bytes32 willHash,
        string ipfsCID,
        uint256 lockTime,
        uint256 timestamp
    );
    
    // Verification Events
    event VerificationRequested(
        bytes32 indexed wellId,
        address indexed owner,
        address indexed legalAdvisor,
        uint256 timestamp
    );
    
    event WillVerified(
        bytes32 indexed wellId,
        address indexed legalAdvisor,
        string comments,
        uint256 timestamp
    );
    
    event WillVerificationRejected(
        bytes32 indexed wellId,
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
        bytes32 indexed wellId,
        address indexed admin,
        string comments,
        uint256 timestamp
    );
    
    event AdminRejected(
        bytes32 indexed wellId,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    // Condition Events
    event ConditionCreated(
        bytes32 indexed conditionId,
        bytes32 indexed wellId,
        ConditionType conditionType,
        uint256 conditionValue,
        uint256 timestamp
    );
    
    event ConditionMet(
        bytes32 indexed conditionId,
        bytes32 indexed wellId,
        ConditionType conditionType,
        uint256 timestamp
    );
    
    event AllConditionsMet(
        bytes32 indexed wellId,
        uint256 timestamp
    );
    
    // Execution Events
    event WillExecutable(
        bytes32 indexed wellId,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    event AssetClaimed(
        bytes32 indexed wellId,
        address indexed beneficiary,
        uint256 assetValue,
        uint256 timestamp
    );
    
    // Emergency Events
    event DeathCertificateSubmitted(
        bytes32 indexed wellId,
        address indexed emergencyContact,
        uint256 timestamp
    );
    
    event WillDisputed(
        bytes32 indexed wellId,
        address indexed disputer,
        string reason,
        uint256 timestamp
    );
    
    // ========== MODIFIERS ==========
    
    /**
     * @dev Check if address is registered user
     */
    modifier isRegisteredUser(address userAddress) {
        require(users[userAddress].isActive, "User not registered or inactive");
        _;
    }
    
    /**
     * @dev Check if user has specific role
     */
    modifier hasRole(address userAddress, UserRole role) {
        require(users[userAddress].role == role || users[userAddress].role == UserRole.ADMIN, 
                "Insufficient permissions");
        _;
    }
    
    /**
     * @dev Check if will exists and caller is owner
     */
    modifier isWillOwner(bytes32 wellId) {
        require(wills[wellId].owner != address(0), "Will not found");
        require(wills[wellId].owner == msg.sender, "Only owner can perform this action");
        _;
    }
    
    /**
     * @dev Check if will exists and caller is beneficiary
     */
    modifier isWillBeneficiary(bytes32 wellId) {
        require(wills[wellId].beneficiary != address(0), "Will not found");
        require(wills[wellId].beneficiary == msg.sender, "Only beneficiary can perform this action");
        _;
    }
    
    /**
     * @dev Check will status
     */
    modifier hasStatus(bytes32 wellId, WillStatus status) {
        require(wills[wellId].status == status, "Invalid will status");
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    /**
     * @dev Initialize contract
     * @param _treasuryAddress Address to receive approval fees
     */
    constructor(address payable _treasuryAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        treasuryAddress = _treasuryAddress;
    }
    
    // ========== USER MANAGEMENT ==========
    
    /**
     * @dev Register new user (can be done by anyone via MetaMask)
     * @param role User role (OWNER or BENEFICIARY mainly)
     */
    function registerUser(UserRole role) public {
        require(users[msg.sender].userAddress == address(0), "User already registered");
        require(role != UserRole.NONE, "Invalid role");
        require(role != UserRole.ARBITER, "Cannot self-assign arbiter role");
        
        users[msg.sender] = User({
            userAddress: msg.sender,
            role: role,
            isActive: true,
            createdAt: block.timestamp,
            lastLogin: block.timestamp,
            kycVerified: false
        });
        
        emit UserRegistered(msg.sender, role, block.timestamp);
    }
    
    /**
     * @dev Update user role (admin only)
     * @param userAddress User address
     * @param newRole New role
     */
    function updateUserRole(address userAddress, UserRole newRole) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        require(users[userAddress].isActive, "User not found");
        require(newRole != UserRole.NONE, "Invalid role");
        
        users[userAddress].role = newRole;
        
        emit UserRoleUpdated(userAddress, newRole, block.timestamp);
    }
    
    /**
     * @dev Log user activity (update last login)
     */
    function logUserActivity() public isRegisteredUser(msg.sender) {
        users[msg.sender].lastLogin = block.timestamp;
        
        emit UserActivityLogged(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Register legal advisor (admin only)
     * @param legalAdvisorAddress Address to register as legal advisor
     */
    function registerLegalAdvisor(address legalAdvisorAddress) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        require(users[legalAdvisorAddress].userAddress != address(0), "User must register first");
        
        users[legalAdvisorAddress].role = UserRole.LEGAL_ADVISOR;
        _grantRole(LEGAL_ADVISOR_ROLE, legalAdvisorAddress);
        
        emit UserRoleUpdated(legalAdvisorAddress, UserRole.LEGAL_ADVISOR, block.timestamp);
    }
    
    // ========== WILL CREATION ==========
    
    /**
     * @dev Create new will (by owner)
     * @param beneficiaryAddress Beneficiary address
     * @param willHash IPFS hash of will
     * @param ipfsCID IPFS CID for documents
     * @param lockTime Seconds until executable
     * @param assetValue Value of assets
     * @return wellId ID of created will
     */
    function createWill(
        address beneficiaryAddress,
        bytes32 willHash,
        string memory ipfsCID,
        uint256 lockTime,
        uint256 assetValue
    ) 
        public 
        isRegisteredUser(msg.sender)
        returns (bytes32)
    {
        require(beneficiaryAddress != address(0), "Invalid beneficiary");
        require(beneficiaryAddress != msg.sender, "Cannot be own beneficiary");
        require(lockTime >= MIN_LOCK_TIME && lockTime <= MAX_LOCK_TIME, "Invalid lock time");
        require(bytes(ipfsCID).length > 0, "IPFS CID required");
        
        bytes32 wellId = keccak256(abi.encodePacked(msg.sender, block.timestamp, _willCounter.current()));
        
        Will storage newWill = wills[wellId];
        newWill.willHash = willHash;
        newWill.ipfsCID = ipfsCID;
        newWill.owner = msg.sender;
        newWill.beneficiary = beneficiaryAddress;
        newWill.createdAt = block.timestamp;
        newWill.lastActivityTime = block.timestamp;
        newWill.lockTime = lockTime;
        newWill.status = WillStatus.CREATED;
        newWill.assetValue = assetValue;
        
        // Add empty conditions array
        // Conditions will be added separately
        
        userWills[msg.sender].push(wellId);
        beneficiaryWills[beneficiaryAddress].push(wellId);
        
        _willCounter.increment();
        
        emit WillCreated(
            wellId,
            msg.sender,
            beneficiaryAddress,
            willHash,
            ipfsCID,
            lockTime,
            block.timestamp
        );
        
        return wellId;
    }
    
    // ========== CONDITION MANAGEMENT ==========
    
    /**
     * @dev Add condition to will
     * @param wellId Will ID
     * @param conditionType Type of condition
     * @param conditionValue Value for condition
     */
    function addCondition(
        bytes32 wellId,
        ConditionType conditionType,
        uint256 conditionValue
    ) 
        public 
        isWillOwner(wellId)
        hasStatus(wellId, WillStatus.CREATED)
    {
        require(conditionType != ConditionType.MULTIPLE_CONDITIONS, "Cannot use multiple_conditions directly");
        
        bytes32 conditionId = keccak256(abi.encodePacked(wellId, _conditionCounter.current(), block.timestamp));
        
        Condition storage newCondition = conditions[conditionId];
        newCondition.conditionId = conditionId;
        newCondition.willId = wellId;
        newCondition.conditionType = conditionType;
        newCondition.conditionValue = conditionValue;
        newCondition.isMet = false;
        newCondition.checkedAt = block.timestamp;
        
        wills[wellId].conditionIds.push(conditionId);
        
        _conditionCounter.increment();
        
        emit ConditionCreated(
            conditionId,
            wellId,
            conditionType,
            conditionValue,
            block.timestamp
        );
    }
    
    /**
     * @dev Update user activity time (for 12-month inactivity check)
     */
    function updateOwnerActivity(bytes32 wellId) 
        public 
        isWillOwner(wellId)
    {
        wills[wellId].lastActivityTime = block.timestamp;
        users[msg.sender].lastLogin = block.timestamp;
    }
    
    // ========== VERIFICATION WORKFLOW ==========
    
    /**
     * @dev Request verification from legal advisor
     * @param wellId Will ID
     * @param legalAdvisorAddress Legal advisor address
     */
    function requestVerification(bytes32 wellId, address legalAdvisorAddress) 
        public 
        isWillOwner(wellId)
        hasStatus(wellId, WillStatus.CREATED)
    {
        require(users[legalAdvisorAddress].role == UserRole.LEGAL_ADVISOR, "Not a legal advisor");
        
        wills[wellId].status = WillStatus.PENDING_VERIFICATION;
        
        emit VerificationRequested(
            wellId,
            msg.sender,
            legalAdvisorAddress,
            block.timestamp
        );
    }
    
    /**
     * @dev Legal advisor approves will
     * @param wellId Will ID
     * @param comments Review comments
     */
    function approveByLegalAdvisor(bytes32 wellId, string memory comments) 
        public 
        isRegisteredUser(msg.sender)
        hasRole(msg.sender, UserRole.LEGAL_ADVISOR)
        hasStatus(wellId, WillStatus.PENDING_VERIFICATION)
    {
        Will storage will = wills[wellId];
        will.status = WillStatus.PENDING_ADMIN_APPROVAL;
        will.verified = true;
        will.verifiedBy = msg.sender;
        
        emit WillVerified(
            wellId,
            msg.sender,
            comments,
            block.timestamp
        );
    }
    
    /**
     * @dev Legal advisor rejects will
     * @param wellId Will ID
     * @param reason Rejection reason
     */
    function rejectByLegalAdvisor(bytes32 wellId, string memory reason) 
        public 
        isRegisteredUser(msg.sender)
        hasRole(msg.sender, UserRole.LEGAL_ADVISOR)
        hasStatus(wellId, WillStatus.PENDING_VERIFICATION)
    {
        Will storage will = wills[wellId];
        will.status = WillStatus.REJECTED;
        will.rejectionReason = reason;
        
        emit WillVerificationRejected(
            wellId,
            msg.sender,
            reason,
            block.timestamp
        );
    }
    
    // ========== ADMIN APPROVAL ==========
    
    /**
     * @dev Admin approves will
     * @param wellId Will ID
     * @param comments Admin comments
     */
    function approveByAdmin(bytes32 wellId, string memory comments) 
        public 
        payable
        onlyRole(ADMIN_ROLE)
        hasStatus(wellId, WillStatus.PENDING_ADMIN_APPROVAL)
        nonReentrant
    {
        require(wills[wellId].verified, "Must be verified by legal advisor first");
        
        Will storage will = wills[wellId];
        will.status = WillStatus.VERIFIED;
        will.adminApproved = true;
        will.approvedBy = msg.sender;
        
        willToAdmin[wellId] = msg.sender;
        
        // Schedule condition checking via Chainlink Automation
        conditionCheckScheduled[wellId] = true;
        
        // Transfer fee to treasury if provided
        if (msg.value > 0 && treasuryAddress != address(0)) {
            (bool success, ) = treasuryAddress.call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }
        
        emit AdminApproved(
            wellId,
            msg.sender,
            comments,
            block.timestamp
        );
    }
    
    /**
     * @dev Admin rejects will
     * @param wellId Will ID
     * @param reason Rejection reason
     */
    function rejectByAdmin(bytes32 wellId, string memory reason) 
        public 
        onlyRole(ADMIN_ROLE)
        hasStatus(wellId, WillStatus.PENDING_ADMIN_APPROVAL)
    {
        Will storage will = wills[wellId];
        will.status = WillStatus.REJECTED;
        will.rejectionReason = reason;
        
        emit AdminRejected(
            wellId,
            msg.sender,
            reason,
            block.timestamp
        );
    }
    
    // ========== CONDITION CHECKING ==========
    
    /**
     * @dev Check if all conditions are met
     * @param wellId Will ID
     */
    function checkAllConditions(bytes32 wellId) 
        public 
        returns (bool)
    {
        require(wills[wellId].status == WillStatus.VERIFIED, "Will not verified");
        
        Will storage will = wills[wellId];
        bool allConditionsMet = true;
        uint256 currentTime = block.timestamp;
        
        for (uint i = 0; i < will.conditionIds.length; i++) {
            bytes32 conditionId = will.conditionIds[i];
            Condition storage condition = conditions[conditionId];
            
            if (!condition.isMet) {
                if (condition.conditionType == ConditionType.NO_LOGIN_DAYS) {
                    // Check if owner hasn't logged in for X days
                    if (currentTime - users[will.owner].lastLogin >= condition.conditionValue) {
                        condition.isMet = true;
                        condition.metAt = currentTime;
                        emit ConditionMet(conditionId, wellId, condition.conditionType, currentTime);
                    } else {
                        allConditionsMet = false;
                    }
                }
                else if (condition.conditionType == ConditionType.SPECIFIC_DATE) {
                    // Check if current date is past the specified date
                    if (currentTime >= condition.conditionValue) {
                        condition.isMet = true;
                        condition.metAt = currentTime;
                        emit ConditionMet(conditionId, wellId, condition.conditionType, currentTime);
                    } else {
                        allConditionsMet = false;
                    }
                }
                else if (condition.conditionType == ConditionType.ON_DEATH) {
                    // Death must be manually verified
                    allConditionsMet = false;
                }
                else if (condition.conditionType == ConditionType.MANUAL_APPROVAL) {
                    // Already approved by admin
                    condition.isMet = true;
                    condition.metAt = currentTime;
                }
            }
            
            condition.checkedAt = currentTime;
        }
        
        if (allConditionsMet && will.conditionIds.length > 0) {
            will.status = WillStatus.EXECUTABLE;
            
            emit AllConditionsMet(wellId, currentTime);
            emit WillExecutable(wellId, will.beneficiary, currentTime);
        }
        
        return allConditionsMet;
    }
    
    /**
     * @dev Report death of will owner (by emergency contact)
     * @param wellId Will ID
     */
    function reportDeath(bytes32 wellId) 
        public 
        onlyRole(EMERGENCY_CONTACT_ROLE)
    {
        require(wills[wellId].owner != address(0), "Will not found");
        
        Will storage will = wills[wellId];
        
        // Find and mark ON_DEATH condition as met
        for (uint i = 0; i < will.conditionIds.length; i++) {
            bytes32 conditionId = will.conditionIds[i];
            if (conditions[conditionId].conditionType == ConditionType.ON_DEATH) {
                conditions[conditionId].isMet = true;
                conditions[conditionId].metAt = block.timestamp;
                
                emit ConditionMet(conditionId, wellId, ConditionType.ON_DEATH, block.timestamp);
            }
        }
        
        emit DeathCertificateSubmitted(wellId, msg.sender, block.timestamp);
        
        // Re-check all conditions
        checkAllConditions(wellId);
    }
    
    // ========== CLAIMING ASSETS ==========
    
    /**
     * @dev Beneficiary claims assets
     * @param wellId Will ID
     */
    function claimAssets(bytes32 wellId) 
        public 
        isWillBeneficiary(wellId)
        nonReentrant
    {
        Will storage will = wills[wellId];
        
        require(will.status == WillStatus.EXECUTABLE, "Will not executable");
        require(!will.executed, "Already claimed");
        
        // Double-check conditions
        require(checkAllConditions(wellId) || will.status == WillStatus.EXECUTABLE, "Conditions not met");
        
        will.executed = true;
        will.status = WillStatus.CLAIMED;
        
        emit AssetClaimed(
            wellId,
            msg.sender,
            will.assetValue,
            block.timestamp
        );
    }
    
    // ========== DISPUTE HANDLING ==========
    
    /**
     * @dev File dispute about will
     * @param wellId Will ID
     * @param reason Dispute reason
     */
    function fileDispute(bytes32 wellId, string memory reason) 
        public 
        isRegisteredUser(msg.sender)
    {
        require(
            wills[wellId].owner == msg.sender || wills[wellId].beneficiary == msg.sender,
            "Only owner or beneficiary can file dispute"
        );
        require(wills[wellId].status != WillStatus.DISPUTED, "Already disputed");
        
        wills[wellId].status = WillStatus.DISPUTED;
        
        emit WillDisputed(wellId, msg.sender, reason, block.timestamp);
    }
    
    // ========== CHAINLINK AUTOMATION ==========
    
    /**
     * @dev Check upkeep for Chainlink Automation
     * @return upkeepNeeded Whether upkeep is needed
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Check if there are wills that need condition checking
        // In production, iterate through scheduled wills
        upkeepNeeded = true;
        performData = abi.encode(uint256(0)); // Example
    }
    
    /**
     * @dev Perform upkeep - check conditions for all scheduled wills
     * @param performData Data from checkUpkeep
     */
    function performUpkeep(bytes calldata performData)
        external
        override
    {
        // Called by Chainlink Automation nodes
        // This would iterate through scheduled wills and check conditions
        // Implementation depends on how you track scheduled wills
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get will details
     * @param wellId Will ID
     */
    function getWill(bytes32 wellId) 
        public 
        view 
        returns (Will memory) 
    {
        return wills[wellId];
    }
    
    /**
     * @dev Get user details
     * @param userAddress User address
     */
    function getUser(address userAddress) 
        public 
        view 
        returns (User memory) 
    {
        return users[userAddress];
    }
    
    /**
     * @dev Get condition details
     * @param conditionId Condition ID
     */
    function getCondition(bytes32 conditionId) 
        public 
        view 
        returns (Condition memory) 
    {
        return conditions[conditionId];
    }
    
    /**
     * @dev Get all conditions for a will
     * @param wellId Will ID
     */
    function getWillConditions(bytes32 wellId) 
        public 
        view 
        returns (Condition[] memory) 
    {
        Will memory will = wills[wellId];
        Condition[] memory willConditions = new Condition[](will.conditionIds.length);
        
        for (uint i = 0; i < will.conditionIds.length; i++) {
            willConditions[i] = conditions[will.conditionIds[i]];
        }
        
        return willConditions;
    }
    
    /**
     * @dev Get wills created by user
     * @param userAddress User address
     */
    function getUserWills(address userAddress) 
        public 
        view 
        returns (bytes32[] memory) 
    {
        return userWills[userAddress];
    }
    
    /**
     * @dev Get wills beneficiary is assigned to
     * @param beneficiaryAddress Beneficiary address
     */
    function getBeneficiaryWills(address beneficiaryAddress) 
        public 
        view 
        returns (bytes32[] memory) 
    {
        return beneficiaryWills[beneficiaryAddress];
    }
    
    /**
     * @dev Check if user is legal advisor
     * @param userAddress User address
     */
    function isLegalAdvisor(address userAddress) 
        public 
        view 
        returns (bool) 
    {
        return users[userAddress].role == UserRole.LEGAL_ADVISOR;
    }
    
    /**
     * @dev Get days since last user login
     * @param userAddress User address
     */
    function daysSinceLastLogin(address userAddress) 
        public 
        view 
        returns (uint256) 
    {
        return (block.timestamp - users[userAddress].lastLogin) / 1 days;
    }
}
```

---

## 🎯 Blockchain Roles & Permissions

```solidity
// Role Hierarchy & Access Control

Owner (Will Creator)
  ├─ Register as user
  ├─ Create wills
  ├─ Add conditions
  ├─ Request verification
  ├─ Update activity (to reset 12-month timer)
  └─ View own wills

Beneficiary
  ├─ Register as user
  ├─ Receive will details (when VERIFIED)
  ├─ Claim assets (when EXECUTABLE)
  └─ View assigned wills

Legal Advisor
  ├─ Register by admin only
  ├─ Review wills (from PENDING_VERIFICATION status)
  ├─ Approve or reject wills
  ├─ Add review comments
  └─ View all pending verifications

Admin
  ├─ Register all users
  ├─ Assign roles
  ├─ Approve verified wills (PENDING_ADMIN_APPROVAL → VERIFIED)
  ├─ Reject wills
  ├─ Report deaths (via emergency contact)
  ├─ Collect fees
  └─ Manage contract settings

Emergency Contact
  ├─ Report death of will owner
  ├─ Trigger ON_DEATH condition
  └─ Notify admin of death

Arbiter
  ├─ Resolve disputes
  ├─ Investigate contested wills
  └─ Make binding decisions

```

---

## 📝 Backend Simplification

When using full blockchain, backend becomes minimal:

```javascript
// Minimal Node.js Backend Requirements

const express = require('express');
const app = express();

// 1. IPFS Gateway
app.post('/api/upload', async (req, res) => {
    // Upload encrypted file to IPFS
    // Return CID to frontend
});

// 2. Encryption Service
app.post('/api/encrypt', (req, res) => {
    // Encrypt data with AES-256
    // Return encrypted data
});

app.post('/api/decrypt', (req, res) => {
    // Decrypt data
    // Only authenticated users
});

// 3. Optional: User Info Cache
app.get('/api/user/:address', async (req, res) => {
    // Fetch user info from smart contract
    // Cache locally (optional)
});

// 4. Optional: Off-chain data storage
app.post('/api/metadata', (req, res) => {
    // Store non-sensitive metadata
});

// REMOVED:
// - User authentication (use Web3/MetaMask instead)
// - Will management (all on smart contract)
// - Admin operations (all on smart contract)
// - Condition checking (Chainlink Automation)
// - Access control (Smart contract modifiers)
```

---

## 🔗 Frontend Integration

```javascript
// React Frontend using Web3.js

import { ethers } from 'ethers';
import DigitalWillABI from './abi/DigitalWill.json';

const CONTRACT_ADDRESS = '0x...'; // Your deployed contract address

export class DigitalWillService {
    constructor() {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            DigitalWillABI,
            this.signer
        );
    }

    // User Registration
    async registerUser(role) {
        const tx = await this.contract.registerUser(role);
        await tx.wait();
        return tx;
    }

    // Create Will
    async createWill(beneficiary, willHash, ipfsCID, lockTime, assetValue) {
        const tx = await this.contract.createWill(
            beneficiary,
            willHash,
            ipfsCID,
            lockTime,
            assetValue
        );
        await tx.wait();
        return tx;
    }

    // Add Condition
    async addCondition(wellId, conditionType, conditionValue) {
        const tx = await this.contract.addCondition(wellId, conditionType, conditionValue);
        await tx.wait();
        return tx;
    }

    // Request Verification
    async requestVerification(wellId, legalAdvisorAddress) {
        const tx = await this.contract.requestVerification(wellId, legalAdvisorAddress);
        await tx.wait();
        return tx;
    }

    // Approve Will (Legal Advisor)
    async approveByLegalAdvisor(wellId, comments) {
        const tx = await this.contract.approveByLegalAdvisor(wellId, comments);
        await tx.wait();
        return tx;
    }

    // Approve Will (Admin)
    async approveByAdmin(wellId, comments) {
        const tx = await this.contract.approveByAdmin(wellId, comments, {
            value: ethers.utils.parseEther('0.01') // Fee
        });
        await tx.wait();
        return tx;
    }

    // Check Conditions
    async checkConditions(wellId) {
        const result = await this.contract.checkAllConditions(wellId);
        return result;
    }

    // Claim Assets
    async claimAssets(wellId) {
        const tx = await this.contract.claimAssets(wellId);
        await tx.wait();
        return tx;
    }

    // Get Will
    async getWill(wellId) {
        return await this.contract.getWill(wellId);
    }

    // Get User
    async getUser(address) {
        return await this.contract.getUser(address);
    }

    // Listen to Events
    listenToWillCreated(callback) {
        this.contract.on('WillCreated', (...args) => {
            callback(args);
        });
    }
}
```

---

**To Continue**: See next section for Chainlink Automation Integration, Complete Workflows, and Deployment Guide.

**Status**: FULL BLOCKCHAIN ARCHITECTURE READY FOR IMPLEMENTATION

# 🔍 Digital Will DApp - Comprehensive Process Flow & Loopholes Analysis

**Status**: 🚨 CRITICAL ISSUES IDENTIFIED
**Date**: March 11, 2026

---

## 📋 Table of Contents
1. [Current Process Flow](#current-process-flow)
2. [Identified Loopholes & Missing Features](#identified-loopholes--missing-features)
3. [Database Schema Issues](#database-schema-issues)
4. [Admin Approval Workflow](#admin-approval-workflow)
5. [User Registration & Authentication](#user-registration--authentication)
6. [File Upload & Legal Advisor Verification](#file-upload--legal-advisor-verification)
7. [Beneficiary Access Issues](#beneficiary-access-issues)
8. [Conditional Execution Missing](#conditional-execution-missing)
9. [Blockchain Role Clarification](#blockchain-role-clarification)
10. [Recommended Solutions](#recommended-solutions)

---

## 1️⃣ Current Process Flow

### **What SHOULD Happen:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPECTED COMPLETE WORKFLOW                   │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: USER REGISTRATION & AUTHENTICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
New User → Signup Form → Backend Database → User Created ✓

PHASE 2: WILL CREATION (By Owner)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Owner Login → Fill Form → Encrypt Data → Store in Backend DB 
→ Upload Encrypted Files to IPFS → Smart Contract Records Hash & CID 
→ Status: CREATED ✓

PHASE 3: REQUEST VERIFICATION (Owner requests Legal Advisor approval)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Owner clicks "Request Verification" → Status: PENDING_VERIFICATION ⏳
→ Notification sent to Legal Advisor → Advisor sees will in their dashboard
→ Advisor downloads encrypted documents from IPFS → Advisor reviews
→ Advisor approves → Document sent to Admin for final approval
→ Admin approves → Smart Contract updated → Status: VERIFIED ✓

PHASE 4: WAIT PERIOD (Lock time countdown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Clock starts → Owner updates personal info (triggers 30-day reset)
→ Owner logs in (triggers check-in mechanism)
→ Owner dies OR 12+ months pass WITHOUT login → Status: EXECUTABLE ⚠️

PHASE 5: BENEFICIARY CLAIM
━━━━━━━━━━━━━━━━━━━━━━━━━━
Beneficiary Login → Views Will Details → Downloads Asset Papers (encrypted)
→ Requests Claim → Admin approves → Assets transferred → Status: CLAIMED ✓
→ Beneficiary receives: Will Document + Asset Details + Legal Certificates

```

---

## 🚨 Identified Loopholes & Missing Features

### **LOOPHOLE #1: Admin Approval Not Enforced**
**Problem**: Will might auto-transfer without admin approval
**Current State**: No admin approval checkpoint
**What's Missing**:
- Admin dashboard to review wills before VERIFIED status
- Status sequence: CREATED → PENDING_VERIFICATION → PENDING_ADMIN_APPROVAL → VERIFIED
- No notification system to admin
- No audit trail of admin actions

**Fix Required**:
```javascript
// Smart Contract Status Flow
enum WillStatus {
    CREATED,                      // ✓ Exists
    PENDING_VERIFICATION,         // ✓ Exists
    PENDING_ADMIN_APPROVAL,       // ❌ MISSING
    VERIFIED,                     // ✓ Exists
    PENDING_EXECUTION,            // ❌ MISSING
    EXECUTED,                     // ✓ Exists
    CLAIMED                       // ✓ Exists
}
```

---

### **LOOPHOLE #2: New User Registration & Database Issues**
**Problem**: User creation flow is unclear; no clear user database
**Current State**: Unknown

**Should Have**:
```javascript
// Users Table - MISSING OR NOT DOCUMENTED
users {
    user_id (Primary Key)
    username (UNIQUE)
    email (UNIQUE)
    password_hash (bcrypt)
    role (owner, beneficiary, legal_advisor, admin)
    wallet_address (MetaMask)
    created_at
    updated_at
    is_active
    last_login
}

// Database Location Missing:
// ❌ Is it PostgreSQL?
// ❌ Is it local database?
// ❌ Is it MongoDB?
// ❌ Where is connection string stored?
```

**Issues**:
- No user registration flow documented
- No role assignment mechanism
- No way to assign someone as "legal_advisor" or "admin"
- No user database access verification

---

### **LOOPHOLE #3: File Upload & Legal Advisor Dashboard**
**Problem**: Files uploaded but not visible to legal advisor
**Current State**: 
- Files uploaded to IPFS ✓
- Legal Advisor Dashboard: ❌ DOESN'T EXIST or not updated with will documents

**What's Happening**:
1. Owner uploads file → Backend encrypts → IPFS stores → Gets CID ✓
2. Legal Advisor receives IPFS CID... but WHERE?
   - ❌ Not in database
   - ❌ Not in dashboard
   - ❌ No notification system
   - ❌ No way to access documents

**Missing Components**:
```javascript
// Verification Table - MISSING
verifications {
    verification_id (Primary Key)
    will_id (Foreign Key to wills table)
    legal_advisor_id (Foreign Key to users table)
    ipfs_cid (Document location)
    documents {
        will_document_cid,
        certificates_cid,
        metadata_cid
    }
    status (PENDING, REVIEWED, APPROVED, REJECTED)
    reviewed_at
    comments
    approval_signature
}

// Legal Advisor Dashboard Query Should Be:
SELECT * FROM verifications 
WHERE legal_advisor_id = ? 
AND status IN ('PENDING', 'REVIEWED')
```

---

### **LOOPHOLE #4: Beneficiary Not Receiving Will & Asset Papers**
**Problem**: Beneficiary cannot access will documents or asset information
**Current State**: No beneficiary dashboard or document access mechanism

**Missing**:
1. **Beneficiary Dashboard**
   - No page showing: "Wills designated for me"
   - No download links for encrypted documents
   - No asset information
   - No claim button

2. **Beneficiary Access Logic**
   ```javascript
   // Beneficiary should see will ONLY IF:
   ✓ Will status = VERIFIED or EXECUTED
   ✓ Beneficiary username matches will's beneficiary_username
   ✓ Conditions met (owner dead OR 12+ months no login)
   ✗ Currently: No access control implemented
   ```

3. **Missing Beneficiary Table**
   ```javascript
   will_beneficiaries {
       id (Primary Key)
       will_id (Foreign Key)
       beneficiary_id (Foreign Key to users)
       asset_description_encrypted
       asset_value
       claimed_at
       claim_status
   }
   ```

---

### **LOOPHOLE #5: No Conditional Execution**
**Problem**: No "conditions" field for automatic transfer based on events
**Current State**: 
- Only "lock_time" exists (static countdown)
- No dynamic conditions

**Missing Conditions**:
```javascript
// Conditions Table - COMPLETELY MISSING
will_conditions {
    id,
    will_id,
    condition_type: [
        'NO_LOGIN_DAYS',        // ❌ MISSING
        'ON_DEATH',            // ❌ MISSING (no death verification)
        'SPECIFIC_DATE',       // ❌ MISSING
        'MANUAL_APPROVAL',     // ✓ Exists (admin approval)
        'AGE_OF_BENEFICIARY'   // ❌ MISSING
    ],
    condition_value,           // e.g., "365" for 12 months
    condition_met: false,
    condition_check_timestamp
}

// Example: "NO_LOGIN_DAYS"
// Check every day: if (now - last_login > 365 days) → set condition_met = true
```

---

### **LOOPHOLE #6: Blockchain Role Unclear**
**Problem**: Smart Contract responsibilities vs Backend responsibilities not clear

**Currently On-Chain** ✓:
- Will hash
- IPFS CID
- Status (enum)
- Timestamps
- Events (WillCreated, WillVerified, etc.)

**Currently Off-Chain** ✓:
- Full will details (encrypted)
- Personal information
- User credentials
- Verification documents

**MISSING - Should be decided**:
- ❌ Death verification (How is this checked?)
- ❌ Login tracking (Where is last_login stored?)
- ❌ Condition execution (Who checks conditions?)
- ❌ Auto-execution (Does smart contract do this, or backend?)

**Recommended**:
```solidity
// Smart Contract Should Have:
function checkConditions(bytes32 willHash) public {
    // Call backend API via Chainlink Oracle
    // Backend checks: no_login_days, death_status, etc.
    // Oracle reports back to contract
    // If conditions met → execute will
}
```

---

## 2️⃣ Database Schema Issues

### **Current Database (What We Know)**
```javascript
// Backend Database Tables - PARTIALLY DOCUMENTED
wills {
    id,
    owner_id,
    beneficiary_username,
    asset,
    asset_description (encrypted),
    lock_time,
    status,
    created_at,
    // ❌ MISSING:
    // - ipfs_cid reference (partially)
    // - will_hash
    // - condition_id (foreign key)
    // - execution_check_timestamp
    // - last_condition_check
}
```

### **Missing Tables**
```javascript
// 1️⃣ USERS TABLE - MUST EXIST
users {
    id PRIMARY KEY,
    username UNIQUE NOT NULL,
    email UNIQUE,
    password_hash NOT NULL,
    wallet_address,
    role ENUM ('owner', 'beneficiary', 'legal_advisor', 'admin'),
    last_login TIMESTAMP,
    login_check_in TIMESTAMP,     // For 12-month inactivity check
    is_active BOOLEAN,
    created_at,
    updated_at
}

// 2️⃣ VERIFICATIONS TABLE - MUST EXIST
verifications {
    id PRIMARY KEY,
    will_id FOREIGN KEY,
    legal_advisor_id FOREIGN KEY (users.id),
    ipfs_cid_documents,
    uploaded_at,
    reviewed_at,
    status ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'),
    reviewer_comments,
    admin_approval_status ENUM ('PENDING_ADMIN', 'ADMIN_APPROVED', 'ADMIN_REJECTED'),
    admin_id FOREIGN KEY (users.id),
    admin_reviewed_at,
    admin_comments
}

// 3️⃣ CONDITIONS TABLE - MUST EXIST
conditions {
    id PRIMARY KEY,
    will_id FOREIGN KEY,
    condition_type ENUM ('NO_LOGIN_DAYS', 'ON_DEATH', 'SPECIFIC_DATE', 'MANUAL_APPROVAL'),
    condition_value VARCHAR,     // e.g., "365" for 12 months
    condition_metadata JSON,     // Store additional data
    is_met BOOLEAN,
    met_at TIMESTAMP,
    checked_at TIMESTAMP
}

// 4️⃣ WILL_BENEFICIARIES TABLE - MUST EXIST
will_beneficiaries {
    id PRIMARY KEY,
    will_id FOREIGN KEY,
    beneficiary_id FOREIGN KEY (users.id),
    beneficiary_username,
    asset_description_encrypted,
    ipfs_cid_asset_papers,
    notified_at,
    claimed_at,
    claim_status ENUM ('UNCLAIMED', 'CLAIMED', 'REJECTED')
}

// 5️⃣ AUDIT_LOG TABLE - SHOULD EXIST
audit_logs {
    id PRIMARY KEY,
    will_id,
    action ENUM ('CREATED', 'REQUESTED_VERIFICATION', 'VERIFIED', 'EXECUTED', 'CLAIMED'),
    actor_id FOREIGN KEY (users.id),
    actor_role,
    timestamp,
    ip_address,
    details JSON
}
```

---

## 3️⃣ Admin Approval Workflow

### **What Should Happen**:

```
Owner Creates Will
    ↓
Status: CREATED
    ↓
Owner Requests Verification
    ↓
Status: PENDING_VERIFICATION
    ↓
Legal Advisor Reviews (downloads from IPFS)
    ↓
Legal Advisor Approves/Rejects
    ↓
IF APPROVED:
  Status: PENDING_ADMIN_APPROVAL
  ↓
  Admin Dashboard Shows: "Awaiting Approval"
  Admin reviews: will_hash, ipfs_cid, legal_advisor_approval
  ↓
  Admin Approves → Smart Contract called
  Status: VERIFIED ✓
  Blockchain records: WillVerified event
  ↓
ELSE IF REJECTED:
  Status: REJECTED
  Owner notified: "Will rejected. Reason: ..."
```

### **Current Issue**:
- No admin approval step
- Will might skip directly from PENDING_VERIFICATION to VERIFIED
- No admin dashboard exists to review

---

## 4️⃣ User Registration & Authentication

### **Missing User Registration Flow**:

```
Frontend → New User Form
    ↓
First Time Setup:
  - Username ✓
  - Email
  - Password ✓
  - Confirm Password
  - Role Selection ❌ HOW IS THIS DONE?
  - Wallet Address (MetaMask) ✓
    ↓
Backend Validation:
  - Username not exists ✓
  - Email not exists
  - Password strength ✓
  - Wallet address valid
  - Role verification ❌ HOW IS ROLE ASSIGNED?
    ↓
Database:
  - Hash password (bcrypt) ✓
  - Store user record ✓
  - Assign role ❌ UNCLEAR
  - Link wallet address ✓
    ↓
Return: JWT Token + User ID

❌ ISSUES:
- How does someone become a "legal_advisor"?
- How does someone become an "admin"?
- Is there an admin registration code?
- Can anyone register as legal_advisor?
- Who manages role assignments?
```

---

## 5️⃣ File Upload & Legal Advisor Verification

### **Current Flow (Incomplete)**:

```
Owner:
  1. Fills Will Form ✓
  2. Selects Legal Advisor ✓
  3. Uploads Documents (will, certificates, etc.) ✓
  4. Clicks "Request Verification" ✓
    ↓
Backend:
  1. Encrypts documents ✓
  2. Uploads to IPFS → Gets CID ✓
  3. Stores CID in wills table (probably)
  4. Updates status to PENDING_VERIFICATION ✓
    ↓
Legal Advisor:
  1. ❌ Gets notification? (No notification system)
  2. ❌ Dashboard shows pending wills? (No dashboard)
  3. ❌ Can download documents? (No access to IPFS CID)
  4. ❌ Can approve/reject? (No approval mechanism)

❌ MISSING BETWEEN STEPS:
- Notification system for legal advisor
- Legal advisor dashboard
- Legal advisor access to IPFS documents
- Legal advisor approval interface
```

### **What Should Happen**:

```
1. Owner uploads files + requests verification
   ↓
2. Backend creates verifications table entry:
   {
     will_id: 123,
     legal_advisor_id: 456,  // Based on selected advisor
     ipfs_cid_documents: "Qm...",
     status: "PENDING",
     uploaded_at: now
   }
   ↓
3. Notification sent to legal advisor:
   "New will (ID: 123) needs verification"
   ↓
4. Legal Advisor Dashboard:
   GET /api/legal-advisor/pending-verifications
   Returns: List of pending wills with download links
   ↓
5. Legal Advisor downloads from IPFS using CID
   Decrypts with backend (backend stores encryption key)
   ↓
6. Advisor reviews and clicks "Approve" or "Reject"
   ↓
7. If Approved: status → APPROVED, create admin_approval task
   ↓
8. If Rejected: status → REJECTED, notify owner with reason
```

---

## 6️⃣ Beneficiary Access Issues

### **What Beneficiary Should See**:

```
Beneficiary Dashboard:
  ┌─────────────────────────────────┐
  │ Wills Designated for Me          │
  ├─────────────────────────────────┤
  │ 📄 Will #1                      │
  │ └─ Owner: john_smith            │
  │ └─ Asset: 2 BTC + Property      │
  │ └─ Status: VERIFIED ✓           │
  │ └─ Can Claim: YES (owner inactive 12+ months)
  │ └─ [Download Documents]         │
  │ └─ [View Asset Details]         │
  │ └─ [Claim Assets]               │
  │                                 │
  │ 📄 Will #2 (PENDING)            │
  │ └─ Owner: jane_doe              │
  │ └─ Status: PENDING_VERIFICATION │
  │ └─ Can Claim: NO (not verified yet)
  │ └─ [Waiting for legal review]   │
  └─────────────────────────────────┘
```

### **Current Issue**:
- ❌ No beneficiary dashboard
- ❌ Beneficiary cannot see their assigned wills
- ❌ Cannot download documents
- ❌ Cannot view asset details
- ❌ Cannot claim assets

### **Missing Implementation**:

```javascript
// Beneficiary API endpoints - ALL MISSING:
GET /api/beneficiary/my-wills
  Returns: List of wills where user is beneficiary

GET /api/beneficiary/wills/:willId
  Returns: Will details if user is designated beneficiary

GET /api/beneficiary/wills/:willId/documents
  Returns: Encrypted documents from IPFS
  Backend decrypts and serves

GET /api/beneficiary/wills/:willId/asset-papers
  Returns: Asset description and certificates

POST /api/beneficiary/wills/:willId/claim
  Submits claim request
  Requires admin approval if conditions not fully met
```

---

## 7️⃣ Conditional Execution (MAJOR MISSING FEATURE)

### **The Problem**:
Currently, will can only be executed after "lock_time" countdown.
There's NO way to set conditions like:

- "Transfer will if I don't login for 12 months"
- "Transfer will on my death"
- "Transfer will on specific date"
- "Transfer will only if beneficiary reaches age 18"

### **What Should Exist**:

```javascript
// User should be able to set conditions during will creation:

Condition Types:
1. NO_LOGIN_DAYS
   - "Transfer if I haven't logged in for 12 months"
   - Every day, backend checks: days_since_last_login
   - If > 365 days → condition met → will becomes executable
   
2. ON_DEATH
   - "Transfer upon my death"
   - Someone (family member?) reports death
   - Admin verifies with death certificate
   - Condition met → will becomes executable
   
3. MANUAL_APPROVAL
   - "Transfer only with admin approval"
   - Admin reviews and approves
   - Condition met → will becomes executable
   
4. SPECIFIC_DATE
   - "Transfer on January 1, 2027"
   - Backend checks date
   - Condition met on that date
   
5. MULTIPLE_CONDITIONS (AND/OR logic)
   - "Transfer if [12+ months inactive] AND [admin approves]"
   - All must be true for execution

// Implementation:
conditions table {
    condition_type: 'NO_LOGIN_DAYS',
    condition_value: 365,
    check_interval: 'daily',
    condition_met: false
}

// Daily cron job:
Every day at 2 AM:
  FOR EACH will:
    FOR EACH condition:
      if condition_type = 'NO_LOGIN_DAYS':
        last_login = get_user_last_login(user_id)
        days_inactive = (now - last_login).days
        if days_inactive >= condition_value:
          set condition_met = true
    
    if all conditions met:
      set will status = EXECUTABLE
      notify beneficiary: "You can now claim the will"
```

### **Example UI**:
```
Create Will Form:
  ├─ Basic Info:
  │  ├─ Beneficiary: [Select Name]
  │  ├─ Asset: [Describe Assets]
  │
  ├─ 🎯 Conditions (NEW):
  │  ├─ ☐ No Login for X days
  │  │   └─ Set days: [365] days
  │  ├─ ☐ Upon my death
  │  │   └─ Family member confirms
  │  ├─ ☐ Specific date
  │  │   └─ Date: [Jan 1, 2027]
  │  ├─ ☐ Admin approval
  │  ├─ ☐ Beneficiary age 18+
  │
  ├─ Execution Logic:
  │  ├─ ⭕ Any condition (OR)
  │  ├─ ⭕ All conditions (AND)
  │
  └─ [Create Will]
```

---

## 8️⃣ Blockchain Role Clarification

### **Current Confusion**:

**In Smart Contract (On-Chain)**:
```solidity
- willHash: bytes32
- ipfsCID: string
- status: WillStatus
- owner: address
- beneficiary: address
- createdAt: uint256
- executedAt: uint256

Events:
- WillCreated(...)
- WillVerified(...)
- WillExecuted(...)
- AssetClaimed(...)
```

**In Backend (Off-Chain)**:
- Full asset details (encrypted)
- User credentials
- Verification records
- Condition checks
- Login tracking

### **The Problem**:
1. **Who checks if 12+ months have passed?**
   - Smart Contract? (doesn't have date/time data) ❌
   - Backend? (offchain, not immutable) ❌
   - Solution: ✓ Use Chainlink Oracle to report to contract

2. **Who checks "owner hasn't logged in for 12 months"?**
   - Smart Contract? (doesn't have access to login data) ❌
   - Backend? (has login data, but not verified on-chain) ❌

3. **Who executes the will automatically?**
   - Smart Contract? (contracts don't execute by themselves) ❌
   - Backend? (offchain decision) ❌
   - Solution: ✓ Chainlink Automation calls function when condition met

### **Recommended Architecture**:

```
Backend Checks Daily Conditions:
  FOR EACH will:
    if (conditions_met):
      Call Smart Contract Interface:
      await DigitalWill.executeWill(willHash)
      
  OR (Better Option - Decentralized):
  
Chainlink Automation (Oracle Network):
  Chainlink nodes query backend API:
  GET /api/oracle/check-will/:willId
  → Backend returns: conditions_met (true/false)
  → Oracle verifies signature
  → Calls Smart Contract: executeWill(willId)
  → Contract emits WillExecuted event
  → Backend updates status to EXECUTED
```

---

## ✅ Recommended Solutions

### **Priority 1: CRITICAL (Do First)**

```
1. CREATE USER DATABASE & AUTHENTICATION
   ├─ Create users table with all fields
   ├─ Implement user registration flow
   ├─ Implement role assignment mechanism
   ├─ Add last_login tracking
   └─ Test login/logout functionality

2. CREATE VERIFICATION FLOW
   ├─ Create verifications table
   ├─ Create legal_advisor dashboard
   ├─ Legal advisor can download documents
   ├─ Legal advisor can approve/reject
   └─ Send notifications

3. CREATE ADMIN APPROVAL CHECKPOINT
   ├─ Add PENDING_ADMIN_APPROVAL status
   ├─ Create admin dashboard
   ├─ Admin can approve/reject verified wills
   ├─ Add audit logging
   └─ Send notifications
```

### **Priority 2: HIGH (Do Next)**

```
4. IMPLEMENT BENEFICIARY ACCESS
   ├─ Create beneficiary dashboard
   ├─ Show wills designated for beneficiary
   ├─ Download encrypted documents
   ├─ View asset details
   └─ Claim assets button

5. IMPLEMENT CONDITIONAL EXECUTION
   ├─ Create conditions table
   ├─ Add UI for setting conditions
   ├─ Implement condition checking (daily cron)
   ├─ Add NO_LOGIN_DAYS logic
   └─ Update will status to EXECUTABLE when conditions met

6. IMPLEMENT NOTIFICATION SYSTEM
   ├─ Email notifications
   ├─ In-app notification center
   ├─ Notify legal advisor
   ├─ Notify admin
   └─ Notify beneficiary when will becomes claimable
```

### **Priority 3: MEDIUM (Do After)**

```
7. CLARIFY BLOCKCHAIN ROLE
   ├─ Use Chainlink Oracle for condition verification
   ├─ Use Chainlink Automation for auto-execution
   ├─ Document on-chain vs off-chain responsibilities
   └─ Implement oracle calls in smart contract

8. ENHANCE SECURITY
   ├─ Add audit logging for all actions
   ├─ Implement role-based access control
   ├─ Add IP whitelisting for admins
   ├─ Implement 2FA
   └─ Add data encryption for sensitive fields

9. ADD MISSING FEATURES
   ├─ Death verification mechanism
   ├─ Document expiry management
   ├─ Will modification history
   ├─ Appeal/dispute mechanism
   └─ Multi-signature verification
```

---

## 📊 Complete Data Flow (Corrected)

```
┌───────────────────────────────────────────────────────────────────┐
│                    COMPLETE CORRECTED WORKFLOW                    │
└───────────────────────────────────────────────────────────────────┘

STEP 1: USER REGISTRATION
━━━━━━━━━━━━━━━━━━━━━━━━━
New User (Owner, Beneficiary, Legal Advisor, or Admin)
  ↓
Website: /register
  ├─ Username
  ├─ Email
  ├─ Password
  ├─ Wallet Address
  ├─ Role Selection (with verification code for admin/advisor)
  ↓
Backend:
  ├─ Validate inputs
  ├─ Check uniqueness (username, email)
  ├─ Hash password with bcrypt
  ├─ Create user record in users table
  ├─ Set last_login = now
  ├─ Generate JWT token
  ↓
Database (users table):
  ├─ id: auto-increment
  ├─ username: "john_smith"
  ├─ email: "john@example.com"
  ├─ password_hash: "bcrypt_hash"
  ├─ role: "owner"
  ├─ wallet_address: "0x123..."
  ├─ created_at: timestamp
  └─ last_login: timestamp

✅ RESULT: User registered and can now login


STEP 2: OWNER LOGIN & CREATE WILL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Owner logs in
  ↓
Update last_login timestamp
  ↓
Frontend: Create Will Form
  ├─ Beneficiary (dropdown from users where role='beneficiary')
  ├─ Asset Description
  ├─ Asset Value
  ├─ Select Legal Advisor (from users where role='legal_advisor')
  ├─ Upload documents (will, certificates, ID proof)
  ├─ Conditions (NEW):
  │  ├─ ☐ No login for X days (default: 365)
  │  ├─ ☐ Upon death (manual confirmation)
  │  ├─ ☐ Manual admin approval
  ├─ Beneficiary Check-in Frequency
  └─ [Create Will]
  ↓
Backend Processing:
  ├─ Validate all inputs
  ├─ Encrypt: asset_description, personal info
  ├─ Upload documents to IPFS → Get CID
  ├─ Calculate hash: SHA256(will_complete_data)
  ├─ Store in wills table:
  │  ├─ id: auto-increment
  │  ├─ owner_id: 1
  │  ├─ beneficiary_username: "jane_doe"
  │  ├─ beneficiary_id: 2
  │  ├─ asset: "2 BTC, Ethereum"
  │  ├─ asset_description_encrypted: "aes_encrypted"
  │  ├─ ipfs_cid: "Qm..."
  │  ├─ will_hash: "0xabc..."
  │  ├─ legal_advisor_id: 3
  │  ├─ status: "CREATED"
  │  ├─ created_at: timestamp
  │  └─ lock_time: 365
  │
  ├─ Store conditions in conditions table:
  │  ├─ condition_type: "NO_LOGIN_DAYS"
  │  ├─ condition_value: 365
  │  ├─ is_met: false
  │
  ├─ Smart Contract Call:
  │  └─ DigitalWill.createWill(willHash, ipfsCID, beneficiary_address)
  │     → Emits: WillCreated event
  │
  ├─ Create audit log entry
  └─ Return success to frontend

✅ RESULT: Will created, Status = CREATED


STEP 3: OWNER REQUESTS VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Owner views will card:
  [Status: CREATED]
  [Button: Request Verification]
  ↓
Owner clicks "Request Verification"
  ↓
Backend:
  ├─ Update wills table: status = "PENDING_VERIFICATION"
  ├─ Create verifications table entry:
  │  ├─ will_id: 1
  │  ├─ legal_advisor_id: 3
  │  ├─ ipfs_cid: "Qm..."
  │  ├─ status: "PENDING"
  │  └─ uploaded_at: timestamp
  │
  ├─ Send notification to legal advisor:
  │  └─ Email: "New will (ID: 1) by john_smith needs verification"
  │
  └─ Create audit log
  
✅ RESULT: Will status = PENDING_VERIFICATION, Advisor notified


STEP 4: LEGAL ADVISOR REVIEWS & APPROVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Legal Advisor logs in
  ↓
Dashboard: Pending Verifications
  ├─ GET /api/legal-advisor/pending-verifications
  ├─ Returns: List of wills assigned to this advisor
  │  ├─ Will ID: 1
  │  ├─ Owner: john_smith
  │  ├─ Asset: 2 BTC, Ethereum
  │  ├─ Uploaded: March 11, 2026
  │  └─ [Review Documents]
  ├─ [Approve] [Reject]
  ↓
Advisor clicks "Review Documents"
  ├─ GET /api/verifications/1/documents
  ├─ Backend retrieves from IPFS using CID
  ├─ Decrypts documents (backend has encryption key)
  ├─ Displays: will_document.pdf, certificates.pdf, ID.pdf
  ↓
Advisor reviews and clicks "Approve"
  ├─ POST /api/legal-advisor/verifications/1/approve
  ├─ Backend updates verifications table:
  │  ├─ status: "APPROVED"
  │  ├─ reviewed_at: timestamp
  │  └─ admin_approval_status: "PENDING_ADMIN"
  │
  ├─ Update wills table: 
  │  └─ status: "PENDING_ADMIN_APPROVAL"
  │
  ├─ Send notification to admin:
  │  └─ Email: "Will #1 approved by legal advisor, awaiting your approval"
  │
  └─ Create audit log

✅ RESULT: Will status = PENDING_ADMIN_APPROVAL, Admin notified


STEP 5: ADMIN APPROVES WILL
━━━━━━━━━━━━━━━━━━━━━━━━━
Admin logs in
  ↓
Dashboard: Pending Admin Approvals
  ├─ GET /api/admin/pending-approvals
  ├─ Returns: Wills awaiting admin approval
  │  ├─ Will ID: 1
  │  ├─ Owner: john_smith
  │  ├─ Legal Advisor: alice_advisor
  │  ├─ Advisor Approval: ✓ APPROVED
  │  └─ [View Details] [Approve] [Reject]
  ↓
Admin reviews and clicks "Approve"
  ├─ POST /api/admin/wills/1/approve
  ├─ Backend:
  │  ├─ Update wills table: status = "VERIFIED"
  │  ├─ Update verifications table: 
  │  │  └─ admin_approval_status: "ADMIN_APPROVED"
  │  │
  │  ├─ Call Smart Contract:
  │  │  └─ DigitalWill.verifyWill(willHash)
  │  │     → Emits: WillVerified event
  │  │
  │  ├─ Send notification to owner:
  │  │  └─ Email: "Your will has been verified!"
  │  │
  │  ├─ Send notification to beneficiary:
  │  │  └─ Email: "You have been designated as beneficiary for john_smith's will"
  │  │
  │  └─ Create audit log

✅ RESULT: Will status = VERIFIED, Owner + Beneficiary notified


STEP 6: CONDITION CHECKING (AUTOMATIC - Daily at 2 AM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend Cron Job executes:
  ├─ FOR EACH will with status = "VERIFIED":
  │  ├─ FOR EACH condition in conditions table:
  │  │  ├─ Get owner_id from will
  │  │  ├─ Get owner's last_login from users table
  │  │  ├─ Calculate: days_since_login = now - last_login
  │  │  │
  │  │  ├─ IF condition_type = "NO_LOGIN_DAYS":
  │  │  │  └─ IF days_since_login >= condition_value (365):
  │  │  │     └─ Set condition.is_met = true
  │  │  │        Set condition.met_at = timestamp
  │  │  │
  │  │  ├─ IF condition_type = "ON_DEATH":
  │  │  │  └─ IF death_verified_by_admin:
  │  │  │     └─ Set condition.is_met = true
  │  │  │
  │  │  └─ IF condition_type = "MANUAL_APPROVAL":
  │  │     └─ (Already approved by admin in step 5)
  │  │
  │  ├─ Check: ALL conditions met?
  │  ├─ IF yes:
  │  │  ├─ Update will status: "EXECUTABLE"
  │  │  ├─ Send notification to beneficiary:
  │  │  │  └─ Email: "You can now claim the will!"
  │  │  │
  │  │  ├─ Smart Contract Call:
  │  │  │  └─ DigitalWill.markExecutable(willHash)
  │  │  │     → Emits: WillExecutable event
  │  │  │
  │  │  └─ Create audit log
  │  │
  │  └─ Log: Condition check timestamp

✅ RESULT: Will automatically becomes EXECUTABLE when conditions met


STEP 7: BENEFICIARY SEES WILL & CLAIMS ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Beneficiary logs in
  ↓
Dashboard: My Designated Wills
  ├─ GET /api/beneficiary/my-wills
  ├─ Query: wills where beneficiary_id = user_id AND status = "EXECUTABLE"
  ├─ Returns:
  │  ├─ Will ID: 1
  │  ├─ Owner: john_smith
  │  ├─ Asset: 2 BTC, Ethereum
  │  ├─ Status: EXECUTABLE ✓ CAN CLAIM
  │  └─ [View Details] [Download Documents] [Claim Assets]
  ↓
Beneficiary clicks "View Details"
  ├─ GET /api/beneficiary/wills/1
  ├─ Backend retrieves from IPFS:
  │  ├─ will_document_cid: "Qm..."
  │  ├─ certificates_cid: "Qm..."
  │  ├─ asset_details_encrypted
  │  │
  │  ├─ Decrypt all documents (backend has key)
  │  └─ Return to beneficiary:
  │     ├─ Asset description
  │     ├─ Asset value
  │     ├─ Transfer instructions
  │     └─ Supporting documents (PDFs)
  ↓
Beneficiary clicks "Claim Assets"
  ├─ POST /api/beneficiary/wills/1/claim
  ├─ Backend:
  │  ├─ Verify beneficiary_id matches will.beneficiary_id
  │  ├─ Verify will.status = "EXECUTABLE"
  │  ├─ Update will_beneficiaries table:
  │  │  ├─ claimed_at: timestamp
  │  │  └─ claim_status: "CLAIMED"
  │  │
  │  ├─ Call Smart Contract:
  │  │  └─ DigitalWill.claimAsset(willHash, beneficiary_address)
  │  │     → Emits: AssetClaimed event
  │  │     → Can trigger asset transfer (depends on implementation)
  │  │
  │  ├─ Update wills table: status = "CLAIMED"
  │  │
  │  ├─ Send notifications:
  │  │  ├─ To beneficiary: "Assets successfully claimed"
  │  │  ├─ To admin: "Will #1 assets claimed by jane_doe"
  │  │  └─ To owner's emergency contact
  │  │
  │  └─ Create audit log

✅ RESULT: Assets claimed, Status = CLAIMED, Events recorded on blockchain
```

---

## 🔒 Security Audit Checklist

```
❌ User authentication
❌ Role-based access control
❌ Admin approval checkpoint
❌ Legal advisor verification
❌ Beneficiary access control
❌ Condition checking mechanism
❌ Notification system
❌ File upload/download security
❌ Encryption key management
❌ Audit logging
❌ Error handling
❌ Input validation
```

---

## 📝 Next Steps

1. **Review this document** - Address each loophole
2. **Create database schema** - Implement missing tables
3. **Build missing dashboards** - Legal advisor, admin, beneficiary
4. **Implement condition checking** - Automated condition validation
5. **Add notification system** - Email/in-app notifications
6. **Security audit** - Review all access controls
7. **Test complete workflow** - End-to-end testing
8. **Deploy with care** - Staging environment first

---

**Generated**: March 11, 2026
**Status**: NEEDS IMMEDIATE ATTENTION

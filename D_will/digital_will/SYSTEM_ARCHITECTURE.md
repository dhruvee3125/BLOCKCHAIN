# Digital Will DApp - Complete System Guide
## Without MetaMask | Backend-Driven Smart Contract Execution

---

## 🏗️ System Architecture

### Overview
Your Digital Will system operates with **4 core stakeholders** and uses **backend-driven smart contract execution** instead of MetaMask.

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Layer                      │
│  (Simple Username/Password → JWT Token)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            Backend API (Role-Based Access Control)           │
│  - Will Management  - Verification Logic  - Execution Flow   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Smart Contracts (Blockchain Layer)                 │
│  - DigitalWill_Advanced  - DigitalWillFactory                │
│  - Automated Asset Transfer  - Role-Based Permissions        │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Four Stakeholders & Their Roles

### 1. **Asset Owner** 👨‍💼
- **Username**: `owner`
- **Password**: `owner123`
- **Permissions**:
  - ✅ Create new wills
  - ✅ Specify beneficiary and assets
  - ✅ Request legal verification
  - ✅ Execute will (after verification & lock period)
  - ✅ Manage multiple wills

**Workflow**:
1. Login → Create Will → Set Beneficiary & Asset
2. Request Verification from Legal Advisor
3. Wait for verification approval
4. Wait for lock-time to elapse (e.g., 1 hour)
5. Execute Will → Assets become claimable

---

### 2. **Beneficiary** 🎁
- **Username**: `beneficiary`
- **Password**: `beneficiary123`
- **Permissions**:
  - ✅ View assigned wills
  - ✅ Claim assets when will is executed
  - ❌ Cannot modify or execute wills

**Workflow**:
1. Login → View "Your Wills" section
2. See pending/executed wills assigned to them
3. When will is executed → "Claim Asset" button appears
4. Click to claim and receive asset details

---

### 3. **Legal Advisor** ⚖️
- **Username**: `legal_advisor`
- **Password**: `advisor123`
- **Permissions**:
  - ✅ View wills pending verification
  - ✅ Verify or reject wills
  - ✅ Add verification notes/reasons
  - ❌ Cannot execute or claim assets

**Workflow**:
1. Login → See "Pending Verifications" section
2. Review will details:
   - Owner info
   - Beneficiary
   - Asset description
3. Add verification notes (optional)
4. **Verify** → Will approved, owner can execute
5. **Reject** → Will sent back to owner for revision

**Verification Conditions**:
- Check beneficiary legitimacy
- Verify asset description validity
- Confirm no conflicts or fraud
- Add compliance notes

---

### 4. **System Admin** 🔧
- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**:
  - ✅ View all wills and users
  - ✅ Override verification (emergency)
  - ✅ Force execute wills (emergency)
  - ✅ Claim system statistics
  - ✅ Manage all users and wills

**Admin Capabilities**:
- **Emergency Override Verify**: Bypass legal advisor if needed
- **Force Execute**: Execute will without waiting for lock period
- **View Statistics**: Total wills, users, status breakdown
- **Full System Access**: Can view any user's data

---

## 🔄 Will Lifecycle

### State Transitions

```
CREATED
   ↓
   (Owner requests verification)
   ↓
PENDING_VERIFICATION
   ↓
   (Legal Advisor accepts/rejects)
   ├→ CREATED (if rejected - owner can revise)
   └→ VERIFIED (if approved)
        ↓
        (Lock time + Owner executes)
        ↓
     EXECUTED
        ↓
        (Beneficiary claims asset)
        ↓
     CLAIMED
```

### Status Definitions

1. **CREATED** 🟡
   - Will just created
   - Owner can edit or request verification
   - No action from other stakeholders

2. **PENDING_VERIFICATION** 🟠
   - Will submitted to legal advisor
   - Waiting for verification review
   - Owner cannot modify

3. **VERIFIED** 🟢
   - Legal advisor approved
   - Owner can execute (if lock time elapsed)
   - Ready for execution phase

4. **EXECUTED** 🔵
   - Will executed by owner
   - Beneficiary can now claim asset
   - Permanent state

5. **CLAIMED** 🟣
   - Beneficiary claimed the asset
   - Final state - cannot be undone

---

## 🔐 No MetaMask - How It Works

### Why No MetaMask Needed:

```
Traditional (with MetaMask):
User Browser → MetaMask Popup → User Signs Tx → Blockchain

Our System (without MetaMask):
User Login (credentials) → Backend Gets Token → 
Backend Manages Private Keys → Backend Signs Tx → 
Blockchain (server-side transaction signing)
```

### Benefits:
✅ **No wallet extensions required**
✅ **Simpler UX** - just username/password
✅ **Faster transactions** - backend-controlled
✅ **Better control** - server manages execution timing
✅ **Automatic verification** - no manual wallet approval
❌ **Trade-off**: Requires trusting the backend server

---

## 📊 Will Data Model

```javascript
{
  id: "will_1",
  owner: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  ownerUsername: "owner",
  beneficiary: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  beneficiaryUsername: "beneficiary",
  legalAdvisor: "0x70997970C51812e339D9B73b0245ad59E1eda3cb",
  admin: "0x3C44CdDdB6a900FA2b585dd299e03d12FA4293BC",
  
  // Asset Information
  asset: "Property",
  assetDescription: "Beachfront villa in Miami",
  
  // Status & Timing
  status: "VERIFIED",  // CREATED | PENDING_VERIFICATION | VERIFIED | EXECUTED | CLAIMED
  verified: true,
  executed: false,
  claimed: false,
  
  // Timestamps
  createdTime: "2025-03-11T10:00:00Z",
  executionTime: null,
  claimedTime: null,
  lockTime: 3600,  // seconds (1 hour)
  
  // Verification Details
  verificationReason: "Property ownership confirmed",
  
  // Contract
  contractAddress: null  // Set after blockchain deployment
}
```

---

## 🌐 API Endpoints

### Authentication

#### POST `/api/login`
```json
{
  "username": "owner",
  "password": "owner123"
}

Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "address": "0x5FbDB2...",
  "role": "OWNER",
  "username": "owner",
  "message": "Welcome owner! (OWNER)"
}
```

### Will Management

#### POST `/api/wills/create` (OWNER only)
```json
{
  "beneficiaryUsername": "beneficiary",
  "asset": "Property",
  "assetDescription": "Beachfront villa",
  "lockTime": "3600"
}
```

#### GET `/api/wills/my-wills`
Returns wills based on role:
- **OWNER**: Wills they created
- **BENEFICIARY**: Wills assigned to them
- **LEGAL_ADVISOR**: Wills pending verification
- **ADMIN**: All wills

#### GET `/api/wills/:willId`
Get specific will details (with access control)

#### POST `/api/wills/:willId/request-verification` (OWNER)
```json
Response:
{
  "success": true,
  "message": "Verification requested from legal advisor",
  "will": { ... }
}
```

#### POST `/api/wills/:willId/verify` (LEGAL_ADVISOR)
```json
{
  "verified": true,
  "reason": "Property ownership confirmed"
}
```

#### POST `/api/wills/:willId/execute` (OWNER)
Execute will (after verification + lock time)

#### POST `/api/wills/:willId/claim` (BENEFICIARY)
Claim asset (only if will is executed)

#### POST `/api/wills/:willId/admin-override-verify` (ADMIN)
Override verification in case of emergency

#### POST `/api/wills/:willId/admin-force-execute` (ADMIN)
Force execute will bypassing lock time

---

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- npm or yarn
- Hardhat (for local blockchain)

### 1. Install Dependencies

**Backend**:
```bash
cd backend
npm install
```

**Frontend**:
```bash
cd frontend
npm install
```

**Blockchain**:
```bash
cd blockchain
npm install
```

### 2. Start Local Blockchain
```bash
cd blockchain
npx hardhat node
```

Output should show 20 local test accounts with funds.

### 3. Start Backend Server
```bash
cd backend
npm start
```

Server listens on `http://localhost:5000`

### 4. Start Frontend
```bash
cd frontend
npm start
```

App opens on `http://localhost:3000`

### 5. Login & Test

**Test as Owner**:
- Username: `owner`
- Password: `owner123`
- Action: Create a new will

**Test as Legal Advisor**:
- Username: `legal_advisor`
- Password: `advisor123`
- Action: Verify the created will

**Test as Owner Again**:
- Execute the will

**Test as Beneficiary**:
- Username: `beneficiary`
- Password: `beneficiary123`
- Action: Claim the asset

---

## 📱 Complete Workflow Example

### User Journey: Creating & Executing a Will

**Step 1: Owner Creates Will**
```
1. Login as owner
2. Click "Create Will"
3. Fill form:
   - Beneficiary: beneficiary
   - Asset: Digital Wallet
   - Description: My cryptocurrency portfolio
   - Lock Time: 7200 (2 hours)
4. Submit
5. Status: CREATED
```

**Step 2: Owner Requests Verification**
```
1. View will in dashboard
2. Click "Request Verification"
3. Status: PENDING_VERIFICATION
4. Legal advisor gets notification
```

**Step 3: Legal Advisor Verifies**
```
1. Login as legal_advisor
2. View "Pending Verifications"
3. Review will details
4. Add notes: "Beneficiary identity verified"
5. Click "Verify"
6. Status: VERIFIED
```

**Step 4: Owner Executes Will**
```
1. Login as owner
2. Wait for lock time (2 hours in example)
3. Click "Execute Will"
4. Status: EXECUTED
5. Beneficiary now can claim
```

**Step 5: Beneficiary Claims Asset**
```
1. Login as beneficiary
2. View will in dashboard
3. Click "Claim Asset"
4. See: "Asset claimed successfully!"
5. Status: CLAIMED
```

---

## 🔒 Security Considerations

### Current Implementation (Development)
⚠️ **NOT FOR PRODUCTION** - Uses in-memory storage and hardcoded passwords

### Production Requirements

1. **Database**
   - Replace in-memory with PostgreSQL/MongoDB
   - Encrypt sensitive data at rest

2. **Authentication**
   - Hash passwords with bcrypt
   - Implement refresh tokens
   - Add 2FA (two-factor authentication)

3. **API Security**
   - Rate limiting on all endpoints
   - Input validation & sanitization
   - CORS properly configured
   - HTTPS only (SSL/TLS)

4. **Private Key Management**
   - Use HSM (Hardware Security Module)
   - Never hardcode private keys
   - Use key rotation policies
   - Encrypt private keys with strong keys

5. **Smart Contract Security**
   - Audit contracts with third-party firm
   - Use Hardhat security analyzer
   - Implement emergency pause mechanisms
   - Time-lock for critical functions

6. **Monitoring**
   - Log all transactions
   - Alert on suspicious activity
   - Audit trails for compliance
   - Regular security audits

---

## 🛠️ Smart Contract Functions

### DigitalWill_Advanced.sol

```solidity
// Create new will
constructor(
    address _owner,
    address _beneficiary, 
    address _legalAdvisor,
    address _admin,
    string memory _asset,
    string memory _assetDescription,
    uint256 _lockTime
)

// Owner requests verification
function requestVerification()

// Legal Advisor verifies
function verifyWill(bool _verified, string memory _reason)

// Owner executes (after lock time)
function executeWill()

// Beneficiary claims asset
function claimAsset() returns (string memory)

// Admin emergency functions
function adminOverrideVerification(bool _verified)
function adminForceExecute()

// View functions
function getWillDetails()
function getUserRole(address _user)
function getStatusString()
```

---

## 🐛 Troubleshooting

### Backend Won't Start
```
Error: connect ECONNREFUSED 127.0.0.1:8545
↪ Make sure Hardhat is running: npx hardhat node
```

### Frontend Can't Login
```
Error: Failed to fetch
↪ Backend not running: npm start in backend folder
↪ CORS issue: Check backend CORS configuration
```

### Wills Not Showing
```
Error: No wills yet
↪ Create a will first (Owner role)
↪ Check JWT token is valid
↪ Verify user role matches expected permissions
```

### Lock Time Not Working
```
Issue: Can't execute will before lock time
↪ This is by design - wait for lock period
↪ Or use Admin override to bypass
```

---

##  ✅ Checklist for Deployment

- [ ] Change JWT_SECRET in backend/index.js
- [ ] Set up production database
- [ ] Migrate from in-memory storage
- [ ] Enable HTTPS/SSL
- [ ] Set strong CORS origins
- [ ] Add rate limiting middleware
- [ ] Implement password hashing
- [ ] Add 2FA authentication
- [ ] Audit smart contracts
- [ ] Set up production monitoring
- [ ] Create backup & disaster recovery plan
- [ ] Write comprehensive documentation
- [ ] User acceptance testing
- [ ] Compliance review (legal)
- [ ] Security penetration testing

---

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solidity Best Practices](https://solidity.readthedocs.io/)
- [OWASP Security Guidelines](https://owasp.org/)

---

**Last Updated**: March 11, 2025
**Version**: 1.0.0
**Status**: Development/Testing

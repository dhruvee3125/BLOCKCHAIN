# Architecture Diagrams & System Design

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER (React 18)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   Login/Signup   │  │   User Dashboard │  │   Will Manager   │         │
│  │   Component      │  │   Component      │  │   Component      │         │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 │                                            │
│                    ┌────────────▼─────────────┐                             │
│                    │  App_Integrated.js       │                             │
│                    │  Main Application Layer  │                             │
│                    └────────────┬─────────────┘                             │
│                                 │                                            │
│                    ┌────────────▼─────────────┐                             │
│                    │ DigitalWillService.js    │                             │
│                    │ Web3 Integration Layer   │                             │
│                    │ (ethers.js + MetaMask)   │                             │
│                    └────────────┬─────────────┘                             │
│                                 │                                            │
└─────────────────────────────────┼────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
        ┌───────────▼──────────┐   ┌───────────▼──────────┐
        │  BACKEND API LAYER   │   │ BLOCKCHAIN RPC LAYER │
        │  (Node.js/Express)   │   │ (Hardhat Local)      │
        ├──────────────────────┤   ├──────────────────────┤
        │ Port: 5000           │   │ Port: 8545           │
        │                      │   │ Chain ID: 1337       │
        │ Endpoints:           │   │ Network: localhost   │
        │ • /api/login         │   │                      │
        │ • /api/register      │   │ RPC Methods:         │
        │ • /api/wills/*       │   │ • eth_sendTransaction│
        │ • /api/upload-*      │   │ • eth_call           │
        │                      │   │ • eth_getBalance     │
        │ Middleware:          │   │ • eth_blockNumber    │
        │ • JWT Auth           │   │                      │
        │ • Encryption (AES)   │   │                      │
        │ • IPFS Integration   │   │                      │
        └──────────┬───────────┘   └──────────┬───────────┘
                   │                          │
                   └──────────────┬───────────┘
                                  │
                    ┌─────────────▼──────────┐
                    │ SMART CONTRACTS LAYER  │
                    ├────────────────────────┤
                    │ DigitalWill.sol        │
                    │ (2000+ lines)          │
                    │                        │
                    │ Deployed At:           │
                    │ 0x5FC8d32690cc91D4c39  │
                    │ d9d3abcBD16989F875707  │
                    │                        │
                    │ Functions: 50+         │
                    │ Events: 15+            │
                    │ Roles: 6               │
                    └────────────────────────┘
```

---

## Data Flow: Will Creation

```
USER CREATES WILL

1. FRONTEND INITIATION
   ┌─────────────────────────────────┐
   │ User fills WillManager form      │
   │ - Beneficiary username          │
   │ - Asset description             │
   │ - Lock time                     │
   │ - Admin approval flag           │
   └────────────┬────────────────────┘
                │
                ▼
   ┌─────────────────────────────────┐
   │ handleCreateWill() called        │
   │ Validation checks (client-side) │
   └────────────┬────────────────────┘
                │
2. BACKEND PROCESSING
                ▼
   ┌─────────────────────────────────┐
   │ POST /api/wills/create           │
   │ + JWT authentication header      │
   │ + will data (JSON body)          │
   └────────────┬────────────────────┘
                │
                ▼
   ┌─────────────────────────────────┐
   │ Backend verifies JWT token       │
   │ Checks user role = OWNER         │
   │ Validates input data             │
   └────────────┬────────────────────┘
                │
                ▼
   ┌─────────────────────────────────┐
   │ Encrypt sensitive asset data     │
   │ - AES-256 encryption             │
   │ - Generate IV (Init Vector)      │
   └────────────┬────────────────────┘
                │
                ▼
   ┌─────────────────────────────────┐
   │ Compute will hash (keccak256)    │
   │ Hash of:                         │
   │ - Owner address                  │
   │ - Beneficiary address            │
   │ - Asset description              │
   │ - Lock time                      │
   │ - Creation timestamp             │
   └────────────┬────────────────────┘
                │
3. BLOCKCHAIN INTERACTION
                ▼
   ┌─────────────────────────────────┐
   │ Call ethers.js contract methods: │
   │ contract.createWill({            │
   │   beneficiary: addr,             │
   │   willHash: hash,                │
   │   ipfsCID: initialCID,           │
   │   lockTime: time                 │
   │ })                               │
   └────────────┬────────────────────┘
                │
                ▼
   ┌─────────────────────────────────┐
   │ MetaMask popup: Confirm TX       │
   │ User reviews & signs             │
   │ Transaction sent to Hardhat node │
   └────────────┬────────────────────┘
                │
4. SMART CONTRACT EXECUTION
                ▼
   ┌─────────────────────────────────┐
   │ Smart Contract receives TX       │
   │ 1. Check msg.sender is OWNER     │
   │ 2. Generate new willId           │
   │ 3. Create Will struct            │
   │ 4. Set status = CREATED          │
   │ 5. Store in state                │
   │ 6. Emit WillCreated event        │
   └────────────┬────────────────────┘
                │
5. RESPONSE TO USER
                ▼
   ┌─────────────────────────────────┐
   │ Backend receives TX receipt      │
   │ Stores encrypted will locally    │
   │ Returns to frontend:             │
   │ {                                │
   │   willId: "will_123",            │
   │   contractAddress: "0x5FC8...",  │
   │   status: "CREATED",             │
   │   txHash: "0xabc123...",         │
   │   success: true                  │
   │ }                                │
   └────────────┬────────────────────┘
                │
                ▼
   ┌─────────────────────────────────┐
   │ Frontend updates UI              │
   │ Shows: "✅ Will created at 0x..."│
   │ Displays will details            │
   │ User can proceed to verification │
   └─────────────────────────────────┘
```

---

## Will State Machine

```
                           ┌─────────────────────────┐
                           │      CREATED            │
                           │   Initial state         │
                           └────────────┬────────────┘
                                        │
                         ┌──────────────┘
                         │
           ┌─────────────▼──────────────┐
           │ PENDING_VERIFICATION       │
           │ (Awaiting Legal Review)    │
           └────────┬─────────┬─────────┘
                    │         │
              ✓ OK  │         │ ❌ Reject
                    │         │
     ┌──────────────▼─┐   ┌───▼──────────────┐
     │ VERIFIED       │   │ REJECTED         │
     │ (Approved by   │   │ (Denied by       │
     │  Legal Advisor)│   │  Legal Advisor)  │
     └────────┬───────┘   └──────────────────┘
              │
              │ (if requiresAdminApproval)
              │
    ┌─────────▼──────────────────────┐
    │ PENDING_ADMIN_APPROVAL         │
    │ (Awaiting Admin Override)      │
    └────┬──────────────────────┬────┘
         │                      │
    ✓OK  │                      │ ❌ Reject
         │                      │
    ┌────▼────┐           ┌─────▼───────┐
    │READY_TO │           │ADMIN_REJECTED
    │EXECUTE  │           │(Admin denied)
    └────┬────┘           └──────────────┘
         │
    (All conditions met)
         │
    ┌────▼──────────────┐
    │ EXECUTED          │
    │ (Will activated)  │
    └────┬──────────────┘
         │
    (Beneficiary claims)
         │
    ┌────▼──────────────┐
    │ CLAIMED           │
    │ (Assets released) │
    └───────────────────┘


Alternative Paths:

DURING ANY STATE:
    ▼
┌─────────────┐        ┌─────────────┐
│  DISPUTED   │◄──────►│ ARBITRATED  │
│ (Challenge)│        │(Resolved by │
└─────────────┘        │  Arbiter)   │
                       └─────────────┘
```

---

## Role-Based Access Matrix

```
╔════════════════════════════════════════════════════════════════════════════╗
║                      ROLE-BASED ACCESS CONTROL                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║ Function                    │ Owner │ Beneficiary │ Advisor │ Admin │ Other║
╠═════════════════════════════╪═══════╪═════════════╪═════════╪═══════╪══════╣
║ registerUser()              │   ✓   │      ✓      │    ✓    │   ✓   │  ✓   ║
║ createWill()                │   ✓   │      ✗      │    ✗    │   ✗   │  ✗   ║
║ addCondition()              │   ✓   │      ✗      │    ✗    │   ✗   │  ✗   ║
║ requestVerification()       │   ✓   │      ✗      │    ✗    │   ✗   │  ✗   ║
║ approveWill()               │   ✗   │      ✗      │    ✓    │   ✗   │  ✗   ║
║ rejectWill()                │   ✗   │      ✗      │    ✓    │   ✗   │  ✗   ║
║ requestAdminApproval()      │   ✗   │      ✗      │    ✓    │   ✗   │  ✗   ║
║ grantAdminApproval()        │   ✗   │      ✗      │    ✗    │   ✓   │  ✗   ║
║ rejectAdminApproval()       │   ✗   │      ✗      │    ✗    │   ✓   │  ✗   ║
║ checkCondition()            │   ✓   │      ✓      │    ✓    │   ✓   │  ✓   ║
║ executeWill()               │   ✓   │      ✓      │    ✗    │   ✓   │  ✗   ║
║ claimAssets()               │   ✗   │      ✓      │    ✗    │   ✗   │  ✗   ║
║ raiseDispute()              │   ✓   │      ✓      │    ✓    │   ✗   │  ✗   ║
║ resolveDispute()            │   ✗   │      ✗      │    ✗    │   ✓   │  ✗   ║
║ adminOverride()             │   ✗   │      ✗      │    ✗    │   ✓   │  ✗   ║
║ pauseSystem()               │   ✗   │      ✗      │    ✗    │   ✓   │  ✗   ║
║ unpauseSystem()             │   ✗   │      ✗      │    ✗    │   ✓   │  ✗   ║
║ viewWill()                  │   ✓   │      ✓      │    ✓    │   ✓   │  ✗   ║
║ listMyWills()               │   ✓   │      ✓      │    ✓    │   ✓   │  ✗   ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Data Storage Architecture

```
DECENTRALIZED vs CENTRALIZED

┌──────────────────────────────────────────────────────────────┐
│           DATA STORAGE STRATEGY                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ON-CHAIN (Smart Contract Storage)                          │
│  ─────────────────────────────────────────────────────────  │
│  ✓ Will Hash (keccak256)                                    │
│  ✓ IPFS Content ID (CID)                                    │
│  ✓ Condition Definitions                                   │
│  ✓ Approval Status                                          │
│  ✓ Will Status (CREATED → CLAIMED)                          │
│  ✓ User Addresses & Roles                                   │
│  ✓ Timestamps (Created, Executed, Claimed)                  │
│  ✓ Events (for audit trail)                                 │
│                                                              │
│  Gas efficient (minimal data)                               │
│  Immutable (blockchain guarantee)                           │
│  Transparent (publicly queryable)                           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  OFF-CHAIN (Backend Database)                               │
│  ─────────────────────────────────────────────────────────  │
│  ✓ Encrypted Asset Details                                  │
│    └─ Property descriptions                                 │
│    └─ Bank account references                               │
│    └─ Personal information                                  │
│  ✓ Document Files (stored on IPFS)                          │
│  ✓ Communication Logs                                       │
│  ✓ Verification Notes                                       │
│  ✓ Dispute Records                                          │
│                                                              │
│  🔐 Encrypted (AES-256)                                     │
│  🔒 Access controlled (JWT)                                 │
│  🗄️ Centralized backup                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘

VERIFICATION FLOW:

1. Backend computes hash of off-chain data
   └─ keccak256(owner + beneficiary + asset + lockTime)

2. Stores hash on smart contract
   └─ smartContract.willHash = computed_hash

3. Later verification:
   └─ Recompute hash from stored data
   └─ Compare with contract.willHash
   └─ If match: Data hasn't been tampered with ✓
   └─ If different: Data modified ✗
```

---

## Sequence Diagram: Complete Will Verification Flow

```
Owner          Backend            SmartContract    LegalAdvisor    Admin
│                │                      │                 │          │
├─ Create Will ──►│                      │                 │          │
│                 ├─ Validate & Encrypt  │                 │          │
│                 ├─ Compute Hash ──────►│ Store Will      │          │
│                 │                      │ (status=CREATED)│          │
│                 │◄─ Return Confirmation│                 │          │
├─ Display ◄──────┤                      │                 │          │
│ Success         │                      │                 │          │
│                 │                      │                 │          │
├─ Request        │                      │                 │          │
│ Verification ───►│                      │                 │          │
│                 ├─ Update Status ─────►│ Status=PENDING_ │          │
│                 │                      │ VERIFICATION    │          │
│                 │                      │                 │          │
│                 │                      │       Notify ───►│          │
│                 │                      │                 │          │
│                 │◄────── Advisor Reviews ────────────────┤          │
│                 │                      │                 │          │
│                 │            Approve ──┤                 │          │
│                 │◄─────────────────────┤                 │          │
│                 │                      │ Status=VERIFIED │          │
│                 ├─ Check Admin Flag ───►│                 │          │
│                 │                      │                 │          │
│                 │ (if requiresAdmin=true)                │          │
│                 ├──────────────────────────────────────────► Request │
│                 │                      │                 │ Approval │
│                 │                      │                 │          ├─►
│                 │                      │                 │    Admin  │ Reviews
│                 │                      │                 │◄─────────┤
│                 │◄──────────────────────────────────────────┤        
│                 │                      │      Approve     │        
│                 │ Status=READY_TO_     │      ────────►   │        
│                 │ EXECUTE            │                    │        
│                 ├─ Set Conditions Mature────────────────────────────│
│                 │                      │ Status=READY     │          │
│                 │ (Waiting for time/event)│                 │          │
│                 │                      │                 │          │
│  (365 days pass / Condition triggered)  │                 │          │
│                 │                      │                 │          │
│                 ├─ Execute Will  ─────►│ Status=EXECUTED  │          │
│                 │                      │ Emit event       │          │
│                 │                      │                 │          │
├─ Notify ◄───────┤                      │                 │          │
│ Beneficiary     │                      │ Notify ─────────►│          │
│                 │                      │                 │          │
├─ Claim Assets ──┤                      │                 │          │
│                 ├─ Verify eligibility │                 │          │
│                 ├─ Release encrypted ─┤                 │          │
│                 │   assets from DB    │                 │          │
│                 │ Status=CLAIMED ────►│                 │          │
│                 │                      │ Emit event      │          │
│                 │                      │                 │          │
└                 └                      └                 └          └
   FLOW COMPLETE
```

---

## Security Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ SECURITY LAYERS                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ LAYER 1: AUTHENTICATION                                        │
│ ─────────────────────────────────────────────────────          │
│ • Username + Password (hashed with bcrypt)                     │
│ • JWT Tokens (24h expiry, cryptographically signed)            │
│ • Session management (stateless, token-based)                  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ LAYER 2: AUTHORIZATION (Role-Based)                            │
│ ─────────────────────────────────────────────────────          │
│ • OpenZeppelin AccessControl with role modifiers               │
│ • Function-level access control on smart contract              │
│ • Role hierarchy (Admin > Others)                              │
│ • Multi-role checks for sensitive operations                   │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ LAYER 3: DATA ENCRYPTION                                       │
│ ─────────────────────────────────────────────────────          │
│ • AES-256 encryption for sensitive fields                      │
│ • Random IV (Initialization Vector) per encryption             │
│ • Password hashing with bcrypt (10 salt rounds)                │
│ • Keccak256 hashing for data integrity verification            │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ LAYER 4: INPUT VALIDATION                                      │
│ ─────────────────────────────────────────────────────          │
│ • Client-side: HTML5 form validation                           │
│ • Server-side: Type checking, format validation                │
│ • Smart contract: Require statements on all inputs             │
│ • Address zero checks, duplicate prevention                    │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ LAYER 5: BLOCKCHAIN SECURITY                                   │
│ ─────────────────────────────────────────────────────          │
│ • ReentrancyGuard on state-changing functions                  │
│ • Checks-Effects-Interactions pattern                          │
│ • No delegation patterns                                       │
│ • Immutable smart contract (no upgradeable patterns)           │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ LAYER 6: AUDIT TRAIL                                           │
│ ─────────────────────────────────────────────────────          │
│ • All state changes emit events                                │
│ • Events indexed for easy querying                             │
│ • Backend logging of all API calls                             │
│ • User actions trackable on blockchain                         │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ LAYER 7: MULTI-SIGNATURE APPROVAL                              │
│ ─────────────────────────────────────────────────────          │
│ • Owners create, Advisors verify, Admins approve               │
│ • No single point of failure                                   │
│ • Separation of duties enforced                                │
│ • Unanimous approval for critical actions                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
DEVELOPMENT ENVIRONMENT (Current)
┌─────────────────────────────────────┐
│ Developer Machine (Windows)         │
├─────────────────────────────────────┤
│ • Hardhat Node (localhost:8545)     │
│ • Backend (localhost:5000)          │
│ • Frontend (localhost:3000)         │
│ • MetaMask (connected to 1337)      │
│ • 10 test accounts with 10,000 ETH  │
└─────────────────────────────────────┘
           ↓ NEXT
TESTNET ENVIRONMENT (Sepolia)
┌─────────────────────────────────────┐
│ Ethereum Sepolia Testnet            │
├─────────────────────────────────────┤
│ • Real blockchain (public)          │
│ • Faucet for test ETH               │
│ • Verifiable contract               │
│ • Real MetaMask connection          │
│ • Production-grade testing          │
└─────────────────────────────────────┘
           ↓ NEXT
MAINNET ENVIRONMENT (Ethereum)
┌─────────────────────────────────────┐
│ Ethereum Mainnet                    │
├─────────────────────────────────────┤
│ • Live, real Ethereum               │
│ • Real ETH required                 │
│ • Immutable deployment              │
│ • Public visibility                 │
│ • Production users                  │
└─────────────────────────────────────┘
```

---

## Technology Stack Visualization

```
FRONTEND TIER
═════════════
    React 18
        ↓
    [App_Integrated.js]
        ↓
    ┌─────────────────────────┐
    │ • Dashboard Component    │
    │ • Will Manager Component │
    │ • Verification Panel    │
    │ • Admin Controls        │
    └─────────────────────────┘
        ↓
    ethers.js v6
        ↓
    MetaMask Provider


API TIER
════════
    Node.js v24.14.0
        ↓
    Express.js Server
        ↓
    ┌─────────────────────────┐
    │ • Auth Middleware       │
    │ • JWT Token Gen         │
    │ • Data Encryption       │
    │ • IPFS Integration      │
    └─────────────────────────┘
        ↓
    Port 5000


BLOCKCHAIN TIER
════════════════
    Hardhat Framework
        ↓
    Solidity Compiler (0.8.19)
        ↓
    ┌─────────────────────────┐
    │ DigitalWill.sol (2000+) │
    │ • Smart Contract Logic  │
    │ • State Management      │
    │ • Event Emission        │
    │ • Role Access Control   │
    └─────────────────────────┘
        ↓
    ethers.js Contract Interface
        ↓
    Localhost Node (8545)


STORAGE TIER
═════════════
    ┌─────────────┬──────────────┐
    │ ON-CHAIN    │ OFF-CHAIN    │
    │             │              │
    │ Will Hash   │ Encrypted    │
    │ IPFS CID    │ Assets       │
    │ Status      │ Documents    │
    │ Events      │ Notes        │
    └─────────────┴──────────────┘
            ↓
    Smart Contract State
    Backend Database (JSON)
    Ethereum Blockchain
```

---

**Document Version:** 1.0
**Date:** March 11, 2026
**Status:** Complete

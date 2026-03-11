# Quick Start - Smart Contract Application

## 🚀 Deploy & Test Enhanced Contracts

### Step 1: Start Hardhat Node (if not running)
```powershell
cd C:\dev\digital_will\blockchain
npm run node
```

### Step 2: Deploy Enhanced Contracts
```powershell
# In a new terminal
cd C:\dev\digital_will\blockchain
npx hardhat run scripts/deploy_enhanced.cjs --network localhost
```

### Output Example:
```
🚀 Deploying Enhanced Digital Will Smart Contracts...

📍 Deploying with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Owner balance: 10000.0 ETH

📦 Deploying DigitalWillFactory...
✅ Factory deployed at: 0xDc64a140Aa3E981100a9BadC6b203cF94A2cfb08

📦 Deploying Enhanced DigitalWill...
✅ Enhanced will deployed at: 0x5a130931eEeB6f28caaa6147210cFcF74f34DfA6

📦 Creating will via Factory...
✅ Will created via factory at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

🧪 Testing Smart Contract Functions...

Testing Enhanced Will Contract:
  Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Beneficiary: 0x70997970C51812e339D9B73b0245ad59E8eBB0Ea
  Asset: Family House & Bank Accounts
  Lock Period: 0 seconds

  Executing will...
  ✅ Will executed!
  Status: { executed: true, claimed: false, canClaim: true }

  Claiming asset as beneficiary...
  ✅ Asset claimed: Family House & Bank Accounts

============================================================
✨ DEPLOYMENT SUMMARY
============================================================

📦 Contracts Deployed:
  1. DigitalWillFactory: 0xDc64a140Aa3E981100a9BadC6b203cF94A2cfb08
  2. Enhanced DigitalWill: 0x5a130931eEeB6f28caaa6147210cFcF74f34DfA6
  3. Factory-Created Will: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

🧪 All tests passed successfully!
============================================================
```

---

## 📦 Smart Contracts Overview

### 1. **DigitalWillFactory**
- **Purpose:** Creates multiple wills
- **Main Function:** `createWill(beneficiary, asset, lockTime)`
- **Returns:** Address of new will contract

### 2. **DigitalWill (Enhanced)**
- **Purpose:** Individual will with security features
- **Main Functions:**
  - `executeWill()` - Owner executes the will
  - `claimAsset()` - Beneficiary claims after lock period
  - `getWillStatus()` - Check current status
  - `updateBeneficiary()` - Change beneficiary (before execution)

### 3. **DigitalWill (Original)**
- **Current:** 0x5FbDB2315678afecb367f032d93F642f64180aa3 (still deployed)
- **Status:** Functional but basic
- **Keep for:** Backward compatibility

---

## 🧪 Interactive Testing

### Test 1: Create Will via Factory
```javascript
// In Hardhat console
const factory = await ethers.getContractAt(
    "DigitalWillFactory",
    "0xDc64a140Aa3E981100a9BadC6b203cF94A2cfb08"
);

const tx = await factory.createWill(
    "0x70997970C51812e339D9B73b0245ad59E8eBB0Ea",
    "Vintage Car Collection",
    0
);

const receipt = await tx.wait();
const newWillAddress = receipt.events[0].args.will;
console.log("New will created at:", newWillAddress);
```

### Test 2: Get User's Wills
```javascript
const wills = await factory.getUserWills("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
console.log("User wills:", wills);
```

### Test 3: Execute and Claim
```javascript
const will = await ethers.getContractAt(
    "DigitalWill",
    newWillAddress
);

// As owner - execute
const execTx = await will.executeWill();
await execTx.wait();

// As beneficiary - claim
const [, beneficiary] = await ethers.getSigners();
const claimTx = await will.connect(beneficiary).claimAsset();
const asset = await claimTx.wait();
console.log("Claimed:", asset);
```

---

## 📊 Contract State Comparison

| Feature | Original | Enhanced |
|---------|----------|----------|
| Time-lock | ❌ | ✅ |
| Events | ❌ | ✅ |
| Custom Errors | ❌ | ✅ |
| Update Beneficiary | ❌ | ✅ |
| Status Check | ❌ | ✅ |
| Claim Tracking | ❌ | ✅ |
| Gas Efficient | ❌ | ✅ |

---

## 🔗 Frontend Integration

Update your HTML app to use the factory:

```javascript
const FACTORY_ADDRESS = "0xDc64a140Aa3E981100a9BadC6b203cF94A2cfb08";
const FACTORY_ABI = [
    "function createWill(address, string memory, uint256) returns (address)",
    "function getUserWills(address) view returns (address[])",
    "function getAllWills() view returns (address[])"
];

// Create will
const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
const tx = await factory.createWill(beneficiary, asset, 0);
const receipt = await tx.wait();
const willAddress = receipt.events[0].args.will;

// List user's wills
const userWills = await factory.getUserWills(userAddress);
```

---

## 🐛 Debugging

### Error: "Only owner can execute"
- Make sure you're calling from the owner account
- Check signer.address matches owner

### Error: "Lock period not elapsed"
- Check `getWillStatus()` for time remaining
- Wait for the lock period to pass

### Error: "Invalid beneficiary"
- Verify address format: must start with "0x" and be 42 chars
- Ensure it's not address(0)

### Check Contract State
```javascript
const will = await ethers.getContractAt("DigitalWill", willAddress);
const details = await will.getWillDetails();
console.log(details);
// Returns: [owner, beneficiary, asset, executed, claimed, lockPeriod, executionTime]
```

---

## 📝 Deployment Checklist

- [x] Deploy DigitalWillFactory
- [x] Deploy Enhanced DigitalWill
- [x] Test createWill() via factory
- [x] Test executeWill() as owner
- [x] Test claimAsset() as beneficiary
- [ ] Test on testnet (Sepolia)
- [ ] Verify on block explorer
- [ ] Update frontend with new addresses
- [ ] Test full user flow
- [ ] Document addresses in README

---

## 📚 File Structure

```
blockchain/
├── contracts/
│   ├── DigitalWill.sol              (Original - Basic)
│   ├── DigitalWill_Enhanced.sol     (Enhanced - Production Ready)
│   └── DigitalWillFactory.sol       (Factory - Creates Wills)
├── scripts/
│   ├── deploy.cjs                   (Original deployment)
│   └── deploy_enhanced.cjs          (Enhanced deployment)
├── test/
│   └── DigitalWill.test.js          (Test suite - coming soon)
├── artifacts/
│   └── (Compiled contracts & ABIs)
└── hardhat.config.cjs
```

---

## 🎯 Next Level Features

1. **Multi-Signature** - Require multiple signatures for execution
2. **Multiple Assets** - Distribute different assets to different beneficiaries
3. **Conditional Execution** - Execute will based on events (price oracle, etc.)
4. **Scheduled Release** - Gradual asset release over time
5. **Inheritance Tax** - Auto-deduct fees
6. **Document Storage** - Link to IPFS for will documents
7. **Emergency Access** - Trusted third party access in case owner is incapacitated

---

## 🌐 Testnet Deployment

When ready for testnet:

```powershell
# For Sepolia testnet
npx hardhat run scripts/deploy_enhanced.cjs --network sepolia
```

---

**Created:** March 11, 2026
**Status:** Ready for Testing & Deployment


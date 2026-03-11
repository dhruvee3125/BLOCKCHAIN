# Smart Contract Application - Digital Will System

## 📋 Overview

This is a complete blockchain-based digital will management system with multiple smart contracts to handle will creation, execution, and asset claiming on the blockchain.

---

## 🏛️ Smart Contracts

### 1. **DigitalWill (Enhanced)** - `DigitalWill_Enhanced.sol`

The core contract representing an individual will with advanced features.

#### Features:
- ✅ **Owner-based execution** - Only the owner can execute the will
- ✅ **Time-lock mechanism** - Assets can only be claimed after a lock period
- ✅ **Event logging** - All actions are logged as events for off-chain tracking
- ✅ **Custom errors** - Gas-efficient error handling
- ✅ **Role-based access** - Different permissions for owner and beneficiary
- ✅ **Status tracking** - Real-time status of will execution and claims

#### State Variables:
```solidity
address public owner;              // Creator of the will
address public beneficiary;        // Who receives the asset
string public asset;               // Asset description
bool public executed;              // Execution status
uint256 public executionTime;      // When will was executed
uint256 public lockPeriod;         // Seconds to wait before claiming
uint256 public createdAt;          // Creation timestamp
bool public claimed;               // Claim status
```

#### Key Functions:

**1. executeWill()**
```solidity
function executeWill() external onlyOwner
```
- Owner activates the will
- Starts the lock period countdown
- Emits `WillExecuted` event
- Cannot be executed twice

**2. claimAsset()**
```solidity
function claimAsset() external onlyBeneficiary returns (string memory)
```
- Beneficiary claims the asset
- Only works after will is executed AND lock period elapsed
- Returns the asset description
- Emits `AssetClaimed` event

**3. updateBeneficiary(address _newBeneficiary)**
```solidity
function updateBeneficiary(address _newBeneficiary) external onlyOwner
```
- Owner can change beneficiary before execution
- Cannot change after will is executed
- Emits `BeneficiaryUpdated` event

**4. getWillStatus()**
```solidity
function getWillStatus() external view returns 
(bool isExecuted, bool isClaimed, bool canClaim, uint256 timeUntilClaim)
```
- Check if executed
- Check if claimed
- Check if ready to claim
- Get time remaining until claim is possible

**5. getWillDetails()**
```solidity
function getWillDetails() external view returns
(address, address, string, bool, bool, uint256, uint256)
```
- Complete will information
- Safe read of all state variables

#### Events:
```
WillCreated(owner, beneficiary, asset, lockTime, timestamp)
WillExecuted(owner, executedTime, timestamp)
AssetClaimed(beneficiary, asset, timestamp)
BeneficiaryUpdated(oldBeneficiary, newBeneficiary, timestamp)
```

---

### 2. **DigitalWillFactory** - `DigitalWillFactory.sol`

Factory pattern contract for creating and managing multiple wills.

#### Purpose:
- Deploy new DigitalWill contracts
- Track all wills created
- Manage user's wills
- Emit events for all will lifecycle events

#### State Variables:
```solidity
mapping(address => address[]) public userWills;  // Wills per user
address[] public allWills;                       // All wills ever created
mapping(address => bool) public isWill;          // Verify if address is a will
```

#### Key Functions:

**1. createWill(address _beneficiary, string _asset, uint256 _lockTime)**
```solidity
function createWill(address _beneficiary, string memory _asset, uint256 _lockTime) 
    external returns (address)
```
- Deploy a new DigitalWill contract
- Register the new will
- Emit `WillCreated` event
- Return the will's address

**2. getUserWills(address _user)**
```solidity
function getUserWills(address _user) external view returns (address[])
```
- Get all wills created by a user

**3. getUserWillCount(address _user)**
```solidity
function getUserWillCount(address _user) external view returns (uint256)
```
- Count of wills for a user

**4. getAllWills()**
```solidity
function getAllWills() external view returns (address[])
```
- List of all wills in the system

**5. getTotalWillsCount()**
```solidity
function getTotalWillsCount() external view returns (uint256)
```
- Total number of wills

**6. isWillContract(address _address)**
```solidity
function isWillContract(address _address) external view returns (bool)
```
- Verify if an address is a real will contract

#### Events:
```
WillCreated(creator, will, beneficiary, asset, timestamp)
WillExecuted(will, beneficiary, timestamp)
AssetClaimed(will, beneficiary, asset, timestamp)
```

---

## 🔄 Usage Flow

### Step 1: Create a Will
```javascript
const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
const tx = await factory.createWill(
    beneficiaryAddress,
    "Family House",
    0  // lock period in seconds
);
const receipt = await tx.wait();
const willAddress = receipt.events[0].args.will;
```

### Step 2: Owner Executes the Will
```javascript
const will = new ethers.Contract(willAddress, WILL_ABI, ownerSigner);
const tx = await will.executeWill();
await tx.wait();
```

### Step 3: Beneficiary Waits for Lock Period
```javascript
const status = await will.getWillStatus();
console.log("Can claim in:", status.timeUntilClaim, "seconds");
```

### Step 4: Beneficiary Claims Asset
```javascript
const will = new ethers.Contract(willAddress, WILL_ABI, beneficiarySigner);
const asset = await will.claimAsset();
console.log("Claimed:", asset);
```

---

## 📊 Contract Interactions Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  DigitalWillFactory                          │
│  (Creates and manages all digital wills)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ createWill()
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DigitalWill #1                            │
│  Owner: 0xf39F... | Beneficiary: 0x7099... | Asset: House  │
│  [executeWill()] ────────► [claimAsset()]                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DigitalWill #2                            │
│  Owner: 0xf39F... | Beneficiary: 0x1234... | Asset: Bank    │
│  [executeWill()] ────────► [claimAsset()]                    │
└─────────────────────────────────────────────────────────────┘

         ... (More wills can be created)
```

---

## 🔐 Security Features

1. **Access Control**
   - `onlyOwner` modifier for owner functions
   - `onlyBeneficiary` modifier for beneficiary functions

2. **Custom Errors**
   - Gas-efficient error messages
   - Clear error types for debugging

3. **State Validation**
   - Prevents double execution
   - Validates lock periods
   - Ensures beneficiary != address(0)

4. **Event Logging**
   - Complete audit trail
   - Off-chain indexing support
   - Tamper-proof records

---

## 🚀 Deployment

### Deploy Enhanced Contracts:
```bash
cd blockchain
npx hardhat run scripts/deploy_enhanced.cjs --network localhost
```

### Deploy with Factory:
```javascript
// Factory creates new will contracts on-demand
const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
const tx = await factory.createWill(beneficial, asset, lockTime);
```

---

## 📈 Gas Optimization

- **Custom errors** instead of require strings: ~50% less gas
- **Minimal state variables**: Only what's needed
- **View functions**: Read data without gas cost
- **Event logging**: Off-chain storage for historical data

---

## 🧪 Testing

Create test files in `test/` folder:

```javascript
describe("DigitalWill", function () {
    it("Should create and execute will", async () => {
        // Test code here
    });
});
```

Run tests:
```bash
npx hardhat test
```

---

## 📦 Contract ABIs

### DigitalWill ABI:
```json
[
    "function owner() public view returns (address)",
    "function beneficiary() public view returns (address)",
    "function asset() public view returns (string memory)",
    "function executed() public view returns (bool)",
    "function claimed() public view returns (bool)",
    "function lockPeriod() public view returns (uint256)",
    "function executeWill() public",
    "function claimAsset() public returns (string memory)",
    "function updateBeneficiary(address) public",
    "function getWillStatus() public view returns (bool, bool, bool, uint256)",
    "function getWillDetails() public view returns (address, address, string memory, bool, bool, uint256, uint256)"
]
```

### DigitalWillFactory ABI:
```json
[
    "function createWill(address, string memory, uint256) external returns (address)",
    "function getUserWills(address) external view returns (address[])",
    "function getAllWills() external view returns (address[])",
    "function getUserWillCount(address) external view returns (uint256)",
    "function getTotalWillsCount() external view returns (uint256)",
    "function isWillContract(address) external view returns (bool)"
]
```

---

## 🔗 Integration with Frontend

The frontend HTML apps can interact with these contracts:

1. **Connect to wallet** → Get signer
2. **Create will** → Call `factory.createWill()`
3. **List wills** → Call `factory.getUserWills(userAddress)`
4. **Execute will** → Call `will.executeWill()`
5. **Claim asset** → Call `will.claimAsset()`
6. **Check status** → Call `will.getWillStatus()`

---

## 📝 Next Steps

1. Deploy to testnet (Sepolia)
2. Add time-lock verification in frontend
3. Create multi-signature for enhanced security
4. Add multiple bounty distributions
5. Integrate with IPFS for document storage
6. Add inheritance tax calculations

---

## 📞 Support

For questions about smart contracts:
- Check Hardhat documentation: https://hardhat.org
- Solidity docs: https://docs.soliditylang.org
- OpenZeppelin contracts: https://docs.openzeppelin.com/contracts/


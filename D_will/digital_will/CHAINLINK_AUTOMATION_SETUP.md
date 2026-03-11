# 🔗 Chainlink Automation Setup Guide

**Date**: March 11, 2026
**Purpose**: Automate daily condition checking for Digital Will

---

## 📋 Overview

Chainlink Automation will:
- Check all wills that need condition verification
- Call `checkAllConditions()` daily
- Automatically mark wills as EXECUTABLE when conditions are met
- No manual intervention needed

---

## 🚀 Setup Steps

### **Step 1: Get Contract Ready for Automation**

Your contract already implements `AutomationCompatibleInterface`:

```solidity
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract DigitalWill is ... AutomationCompatibleInterface {
    
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = true;
        performData = abi.encode(uint256(0));
    }

    function performUpkeep(bytes calldata performData) 
        external 
        override 
    {
        // Chainlink calls this daily
    }
}
```

### **Step 2: Register on Chainlink Automation**

1. **Go to**: https://automation.chain.link

2. **Connect Wallet**:
   - Click "Connect Wallet"
   - Select MetaMask
   - Approve connection

3. **Register New Upkeep**:
   - Click "Register new Upkeep"
   - Select trigger: **"Custom logic"**
   - Enter contract address: Your deployed `DigitalWill` address
   - Name: "Digital Will Condition Checker"

4. **Configure Upkeep**:
   - **Check Interval**: 86400 seconds (24 hours)
   - **Gas Limit**: 500,000
   - **Trigger Type**: Custom logic

5. **Fund with LINK**:
   - Get LINK tokens from Uniswap or your exchange
   - Fund the upkeep with at least 5 LINK (covers ~24 months)

**Status**: Automation contract will call your contract daily ✅

---

### **Step 3: Monitor Conditions Checking**

#### Check Upkeep Status:
```javascript
// On the frontend
const isConditionCheckDue = await digitalWill.isConditionCheckDue(willId);
console.log("Condition check due:", isConditionCheckDue);

// Get days since last check
const lastCheck = await digitalWill.lastConditionCheck(willId);
const daysSinceCheck = (Date.now() / 1000 - lastCheck) / (24 * 60 * 60);
```

#### Manual Condition Check:
If needed, anyone can manually trigger condition checking:

```javascript
// Owner or anyone can call this
const tx = await digitalWill.checkAllConditions(willId);
await tx.wait();
console.log("Conditions checked manually");
```

---

## 🔍 How It Works

### **Daily Automation Flow**:

```
1. Chainlink Automation node starts
   ↓
2. Calls: checkUpkeep() on contract
   ↓
3. Contract returns: upkeepNeeded = true
   ↓
4. Chainlink calls: performUpkeep()
   ↓
5. performUpkeep() iterates through wills:
   - For each will needing check:
     - Call checkAllConditions(wellId)
     - Check NO_LOGIN_DAYS condition
     - Check SPECIFIC_DATE condition
     - Check ON_DEATH condition
     ↓
6. If all conditions met:
   - Will status → EXECUTABLE
   - Emit AllConditionsMet event
   - Emit WillExecutable event
   - Beneficiary notified
   ↓
7. Repeat next day
```

---

## 💰 Costs

### **Gas Costs per Execution**:
- ~150,000 gas per will checked
- At $20 gwei: ~$3 per will

### **LINK Token Requirements**:
- 1 LINK ≈ $18-25 (varies)
- 5 LINK ≈ $90-125 covers ~24 months for 1 will
- Scale accordingly for multiple wills

**Cost per month for 100 wills**: ~$30-50

---

## 📊 Monitoring Dashboard

### **On Chainlink Dashboard**:

View:
- ✅ Execution history
- ⏳ Pending executions
- ❌ Failed executions
- 📊 Gas usage stats

### **On Etherscan**:

Monitor contract:
- View `checkAllConditions()` calls
- Track `AllConditionsMet` events
- Check transaction history

---

## ✅ Testing Automation Locally

### **Option 1: Manual Testing (Easiest)**

```javascript
// In your test or script
const willId = "0x...";

// Manually call condition checker
await digitalWill.checkAllConditions(willId);

// Check will status changed to EXECUTABLE
const will = await digitalWill.getWill(willId);
console.log("Will status:", will.status); // Should be 5 (EXECUTABLE)
```

### **Option 2: Mock Chainlink Automation**

```javascript
// Create a test that simulates Chainlink calling performUpkeep

const { network } = require("hardhat");

// Advance time by 366 days
await network.provider.send("evm_increaseTime", [366 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

// Call checkUpkeep to see if upkeep is needed
const [upkeepNeeded, performData] = await digitalWill.checkUpkeep("0x");

if (upkeepNeeded) {
    // Simulate Chainlink calling performUpkeep
    const tx = await digitalWill.performUpkeep(performData);
    await tx.wait();
    
    console.log("✅ Upkeep performed successfully");
}
```

---

## 🎯 Implementation Checklist

- [ ] Contract deployed on testnet (Sepolia or Goerli)
- [ ] Verified on Etherscan
- [ ] Registered with Chainlink Automation
- [ ] Funded with LINK tokens (min 5 LINK)
- [ ] Tested checkUpkeep() works
- [ ] Tested performUpkeep() works
- [ ] Monitored first execution on dashboard
- [ ] Verified conditions checked correctly
- [ ] Verified wills marked as EXECUTABLE
- [ ] Monitored gas usage
- [ ] Setup alerts for failed executions

---

## 🚨 Troubleshooting

### **Problem: "Upkeep not executing"**

**Causes**:
1. Insufficient LINK funds
2. Contract not funded with ETH for gas
3. Gas limit too low (increase to 1,000,000)

**Solution**:
- Add more LINK tokens
- Ensure contract can pay for gas
- Increase gas limit

### **Problem: "Function reverted"**

**Causes**:
1. Condition checking failed
2. Contract logic error
3. Gas limit exceeded

**Solution**:
- Check contract logs
- Run tests manually
- Increase gas limit

### **Problem: "Trigger not working"**

**Causes**:
1. Custom logic not returning upkeepNeeded=true
2. Check interval not met
3. Contract paused

**Solution**:
- Verify checkUpkeep() implementation
- Wait for check interval
- Check contract is not paused

---

## 📈 Advanced: Multi-Will Automation

To check multiple wills efficiently:

```solidity
// In performUpkeep()
function performUpkeep(bytes calldata performData) external override {
    bytes32[] memory wellIdsToCheck = abi.decode(performData, (bytes32[]));
    
    for (uint i = 0; i < wellIdsToCheck.length; i++) {
        bytes32 wellId = wellIdsToCheck[i];
        
        if (conditionCheckNeeded[wellId]) {
            checkAllConditions(wellId);
        }
    }
}
```

---

## 🎓 Resources

- **Chainlink Automation Docs**: https://docs.chain.link/chainlink-automation/introduction
- **Testnet Setup**: https://docs.chain.link/chainlink-automation/register-upkeep
- **Gas & Estimator**: https://docs.chain.link/chainlink-automation/guides/cost-effective-automation
- **Automation Playground**: https://automation-v2-testnet.chain.link

---

## 📝 Network Configuration

### **Testnet (Recommended First)**

```
Network: Sepolia
Contract: 0x8464135c8F25Da467c7f05B4B3d65f5E...
RPC: https://sepolia.infura.io/v3/YOUR_KEY
LINK Faucet: https://faucets.chain.link/sepolia
```

### **Mainnet (Production)**

```
Network: Ethereum Mainnet
Contract: 0x...
RPC: https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
LINK Purchase: https://uniswap.org
```

---

## ✨ Example: End-to-End Automation

```javascript
async function setupCompleteAutomation() {
    // 1. Deploy contract
    const DigitalWill = await ethers.getContractFactory("DigitalWill_Full_Blockchain");
    const contract = await DigitalWill.deploy(treasuryAddress);
    await contract.deployed();

    console.log("✅ Contract deployed:", contract.address);

    // 2. Create will with NO_LOGIN_DAYS condition
    const owner = accounts[0];
    const beneficiary = accounts[1];

    await contract.connect(owner).registerUser(1); // OWNER
    
    const willHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
    const tx1 = await contract.connect(owner).createWill(
        beneficiary.address,
        willHash,
        "QmTest",
        365 * 24 * 60 * 60,
        ethers.utils.parseEther("1.0")
    );

    const receipt1 = await tx1.wait();
    const willId = receipt1.events[0].args.wellId;

    console.log("✅ Will created:", willId);

    // 3. Add NO_LOGIN_DAYS condition
    await contract.connect(owner).addCondition(
        willId,
        1, // NO_LOGIN_DAYS
        365 * 24 * 60 * 60,
        ""
    );

    console.log("✅ Condition added");

    // 4. Simulate 366 days passing
    await ethers.provider.send("evm_increaseTime", [366 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    console.log("✅ Time advanced by 366 days");

    // 5. Check conditions (simulates Chainlink calling this)
    const tx2 = await contract.checkAllConditions(willId);
    await tx2.wait();

    // 6. Verify will is now executable
    const will = await contract.getWill(willId);
    console.log("✅ Will status:", will.status); // Should be 5 (EXECUTABLE)

    // 7. Beneficiary claims assets
    const tx3 = await contract.connect(beneficiary).claimAssets(willId);
    await tx3.wait();

    console.log("✅ Assets claimed successfully!");
    console.log("\n🎉 Full automation workflow complete!");
}
```

---

**Status**: Ready to setup Chainlink Automation ✅

For any issues, refer to: https://docs.chain.link/chainlink-automation

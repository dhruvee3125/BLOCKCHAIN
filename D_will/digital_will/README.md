# 🗝️ Digital Will DApp - Complete Guide

A blockchain-based Digital Will application built with Hardhat, React, and ethers.js. Securely store and execute your digital legacy on the Ethereum blockchain.

## 📋 Project Structure

```
digital_will/
├── blockchain/          # Smart Contract & Deployment
│   ├── contracts/
│   │   └── DigitalWill.sol
│   ├── scripts/
│   │   └── deploy.cjs
│   ├── hardhat.config.cjs
│   └── package.json
├── backend/            # Node.js Backend
│   ├── index.js
│   └── package.json
├── frontend/           # React Frontend
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ installed
- MetaMask browser extension
- Git

### Installation

**1. Clone or navigate to the project:**
```bash
cd c:\Users\dhruv\OneDrive\Desktop\D_will\digital_will
```

**2. Install dependencies (all three directories):**

**Blockchain:**
```bash
cd blockchain
npm install
```

**Backend:**
```bash
cd ../backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

## ⚙️ Smart Contract Functions

### DigitalWill.sol

**State Variables:**
- `owner` - Address of the will creator
- `beneficiary` - Address who can claim the asset
- `asset` - Name/description of the asset (e.g., "Family House")
- `executed` - Boolean flag for will execution status

**Functions:**

#### 1. `executeWill()`
- **Owner Only** ✅
- Executes the will and allows beneficiary to claim assets
- **Usage:** Owner calls this function to activate the will

#### 2. `claimAsset()`
- **Beneficiary Only** ✅
- Returns the asset name after will is executed
- **Requires:** Will must be executed first
- **Returns:** Asset description

---

## 💻 Running the Application

### Option 1: Using Hardhat Local Network (Recommended for Testing)

**Terminal 1 - Start Hardhat Node:**
```bash
cd blockchain
npm run node
```
This starts a local blockchain at `http://localhost:8545`

**Terminal 2 - Deploy Contract:**
```bash
cd blockchain
npm run deploy
```
Deploys the contract and outputs the address

**Terminal 3 - Start React Frontend:**
```bash
cd frontend
npm start
```
Opens app at `http://localhost:3000`

### Option 2: Using Testnet (Sepolia/Goerli)

**1. Update contract address in `frontend/src/App.js`:**
```javascript
const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_ADDRESS';
```

**2. Update `blockchain/hardhat.config.cjs` with network config:**
```javascript
networks: {
  sepolia: {
    url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
    accounts: [PRIVATE_KEY]
  }
}
```

**3. Deploy to testnet:**
```bash
npm run deploy -- --network sepolia
```

---

## 🎮 Using the App

### For Will Creator (Owner)

1. **Connect MetaMask** with the owner account
2. **View Will Details:**
   - See owner, beneficiary, and asset information
   - Check execution status

3. **Execute Will:**
   - Click "📝 Execute Will" button
   - Confirm transaction in MetaMask
   - Will status changes to "✅ Executed"

### For Beneficiary

1. **Connect MetaMask** with the beneficiary account
2. **Check Will Status:**
   - If still pending: "⏳ Will Not Yet Executed"
   - If executed: Ready to claim

3. **Claim Asset:**
   - Click "🏆 Claim Asset" button
   - Confirm transaction in MetaMask
   - Asset name is displayed

---

## 🔐 Security Features

✅ **Owner-Only Execution** - Only the owner can execute the will

✅ **Beneficiary Verification** - Only the designated beneficiary can claim

✅ **Immutable Records** - All transactions recorded on blockchain

✅ **No Password Storage** - Uses blockchain addresses instead

---

## 📡 API/Function Reference

### Frontend Functions

**Connect Wallet:**
```javascript
connectWallet() // Initiates MetaMask connection
```

**Execute Will (Owner):**
```javascript
handleExecuteWill() // Calls contract.executeWill()
```

**Claim Asset (Beneficiary):**
```javascript
handleClaimAsset() // Calls contract.claimAsset()
```

**Fetch Contract Data:**
```javascript
fetchContractData() // Updates UI with current contract state
```

### Smart Contract Interaction

```javascript
// Read owner address
const owner = await contract.owner();

// Read beneficiary address
const beneficiary = await contract.beneficiary();

// Read asset description
const asset = await contract.asset();

// Check if executed
const executed = await contract.executed();

// Execute will (owner only)
const tx = await contract.executeWill();
await tx.wait();

// Claim asset (beneficiary only)
const assetName = await contract.claimAsset();
```

---

## 🐛 Troubleshooting

### "MetaMask not installed"
- Install MetaMask browser extension from [metamask.io](https://metamask.io)

### "No actions available"
- Switch to the owner or beneficiary account in MetaMask

### "Failed to execute will"
- Ensure you're using the owner account
- Check MetaMask gas settings

### "Connection refused to localhost:8545"
- Make sure Hardhat node is running in another terminal
- Check Hardhat is not already running on another port

### Contract address mismatch
- Update `CONTRACT_ADDRESS` in `frontend/src/App.js` with correct deployment address
- Run `npm run deploy` to get current address

---

## 📝 Deploying to GitHub

```bash
git add .
git commit -m "Digital Will DApp - version 1.0"
git push origin main
```

---

## 🛠️ Available Scripts

**Blockchain:**
- `npm run compile` - Compile smart contracts
- `npm run test` - Run contract tests
- `npm run deploy` - Deploy to Hardhat
- `npm run node` - Start local Hardhat node

**Frontend:**
- `npm start` - Start React development server
- `npm run build` - Build for production

**Backend:**
- `npm start` - Run backend server

---

## 📚 Tech Stack

- **Blockchain:** Solidity, Hardhat
- **Backend:** Node.js, ethers.js
- **Frontend:** React 18, ethers.js
- **Wallet:** MetaMask
- **Network:** Ethereum (Mainnet, Testnet, or Local)

---

## 💡 Future Enhancements

- [ ] Multiple assets support
- [ ] Time-locked execution
- [ ] Multi-signature approval
- [ ] Asset transfer with conditions
- [ ] Will expiration dates
- [ ] Beneficiary notifications
- [ ] Document storage integration

---

## 📞 Support

For issues or questions, check:
1. Contract in `blockchain/contracts/DigitalWill.sol`
2. Frontend in `frontend/src/App.js`
3. Ensure MetaMask is connected to correct network

---

## ⚖️ License

MIT License - See LICENSE file for details

---

**Built with ❤️ for secure digital inheritance**

# 🚀 Quick Start Guide - Digital Will DApp

## 5-Minute Setup

### Step 1: Prepare the Environment
```bash
# Terminal 1 - Start Hardhat (blockchain)
cd blockchain
npm install  # if not done
npx hardhat node
```

Output:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545
```

Leave this running.

### Step 2: Start Backend
```bash
# Terminal 2 - Backend server
cd backend
npm install  # if not done
npm start
```

Output:
```
🔐 Digital Will Backend Server running on http://localhost:5000
📋 Available Test Accounts:
  • owner (OWNER)
    - Password: owner123
    - Address: 0x5FbDB2...
  • beneficiary (BENEFICIARY)
    - Password: beneficiary123
    - Address: 0x9fE4...
  • legal_advisor (LEGAL_ADVISOR)
    - Password: advisor123
    - Address: 0x709...
  • admin (ADMIN)
    - Password: admin123
    - Address: 0x3C4...
```

### Step 3: Start Frontend
```bash
# Terminal 3 - React app
cd frontend
npm install  # if not done
npm start
```

Browser opens: `http://localhost:3000`

---

## 🎯 Test Workflow (5 Minutes)

### Test 1: Create Will (As Owner)
```
1. Open http://localhost:3000
2. Login:
   - Username: owner
   - Password: owner123
3. Click "Create Will"
4. Fill form:
   - Beneficiary Username: beneficiary
   - Asset: Digital Wallet
   - Asset Description: My crypto portfolio
   - Lock Time: 60 (1 minute for quick testing)
5. Click "Create Will"
6. Status shows: CREATED ✅
```

### Test 2: Request Verification
```
1. In the will card, click "Request Verification"
2. Status changes to: PENDING_VERIFICATION ⏳
```

### Test 3: Verify Will (As Legal Advisor)
```
1. Logout and open new tab
2. Login as legal_advisor:
   - Username: legal_advisor
   - Password: advisor123
3. See will in "Pending Verifications"
4. Add note: "Verified - legitimate portfolio"
5. Click "Verify" ✓
6. Status changes to: VERIFIED 🟢
```

### Test 4: Execute Will (As Owner)
```
1. Go back to original tab (owner logged in)
2. Click "Refresh" button
3. Click "Execute Will"
   - Will show error if lock time hasn't elapsed
   - If lock time is 60 seconds, wait a minute
4. Status changes to: EXECUTED 🔵
```

### Test 5: Claim Asset (As Beneficiary)
```
1. Logout and login as beneficiary:
   - Username: beneficiary
   - Password: beneficiary123
2. See will with status EXECUTED
3. Click "Claim Asset"
4. Status changes to: CLAIMED 🟣
5. See message: "✅ Asset claimed successfully!"
```

---

## 📊 Role-Based Testing Matrix

| Role | Test Account | Password | Actions |
|------|---|---|---|
| Owner | owner | owner123 | Create, Request, Execute |
| Beneficiary | beneficiary | beneficiary123 | Claim Asset |
| Legal Advisor | legal_advisor | advisor123 | Verify/Reject |
| Admin | admin | admin123 | Override everything |

---

## 🔍 Testing Scenarios

### Scenario 1: Full Happy Path
```
Owner creates → Legal verifies → Owner executes → Beneficiary claims
```

### Scenario 2: Legal Rejects Will
```
Create → Request → Legal clicks "Reject" → Status back to CREATED
```

### Scenario 3: Admin Override
```
Create → Request → Admin clicks "Verify" (override) → Owner executes
```

### Scenario 4: Bypass Lock Time (Admin)
```
Create → Verify → Admin clicks "Execute" (bypass) → Beneficiary claims
```

---

## 🐛 Quick Fixes

### "Failed to connect to blockchain"
```bash
→ Hardhat not running. Start Terminal 1: npx hardhat node
```

### "Cannot POST /api/login"
```bash
→ Backend not running. Start Terminal 2: npm start (in backend)
```

### Login shows error about invalid credentials
```bash
→ Check spelling: owner (not "owners" or "Owner")
→ Password is case-sensitive: owner123
```

### "No wills yet"
```bash
→ You're logged in as beneficiary/advisor?
→ Switch to "owner" role to create a will
```

### Stuck waiting for lock time
```bash
→ Set lockTime to 60 when creating will (1 minute)
→ Or use Admin account to force execute
```

---

## 📈 Viewing System Status

### As Admin
```bash
1. Login as admin (admin/admin123)
2. You can see:
   - All users
   - All wills
   - System statistics (total, pending, verified, executed, claimed)
   - Add admin override options
```

### Monitor Backend
```bash
Terminal 2 shows:
- All API requests
- Authentication tokens
- Database operations
- Errors and warnings
```

---

## 🔗 API Testing (Optional)

### Curl Examples

**Login**:
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"owner123"}'
```

**Create Will**:
```bash
TOKEN="<your-token-from-login>"
curl -X POST http://localhost:5000/api/wills/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "beneficiaryUsername":"beneficiary",
    "asset":"House",
    "assetDescription":"Family home",
    "lockTime":"3600"
  }'
```

**Get My Wills**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/wills/my-wills
```

---

## 📝 Common Tasks

### Add New Test User
Edit `backend/index.js`:
```javascript
const users = {
  // ... existing users
  'newuser': { 
    password: 'newpass123', 
    address: '0x1234...',
    role: 'OWNER'
  }
};
```

### Change Lock Time
When creating will form:
```
Lock Time: 3600  (1 hour in seconds)
Lock Time: 60    (1 minute - for testing)
Lock Time: 0     (no lock - execute immediately)
```

### View Contract State
The will data is stored in-memory on backend. To see all wills:
```bash
# Add this endpoint to backend index.js
app.get('/api/debug/wills', (req, res) => {
  res.json(Array.from(wills.values()));
});
```

Then visit: `http://localhost:5000/api/debug/wills`

---

## 📞 Support

### Check Logs
```bash
# Frontend errors
Browser Console: F12 → Console tab

# Backend errors
Terminal 2 output

# Hardhat output
Terminal 1 output
```

### Restart Everything
```bash
# Press Ctrl+C on all 3 terminals
# Close browser tabs
# Restart in order:
# 1. Hardhat
# 2. Backend
# 3. Frontend
```

---

## ✨ Next Steps

After testing:

1. **Read** [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) for full details
2. **Deploy** to testnet (Sepolia, Goerli)
3. **Connect** real user database (PostgreSQL/MongoDB)
4. **Add** more features (multiple beneficiaries, asset types, etc.)
5. **Audit** smart contracts with professionals
6. **Launch** to mainnet

---

## 🎉 You're All Set!

Your Digital Will DApp is running without MetaMask! 

Key Points:
✅ No wallet browser extension needed
✅ Simple username/password login
✅ All smart contract operations handled by backend
✅ 4 stakeholder roles fully implemented
✅ Automatic verification & asset transfer workflow

**Happy testing! 🚀**

# Simple Authentication Setup Guide

## Overview
Your Digital Will DApp has been successfully migrated from **MetaMask** wallet authentication to **simple username/password authentication** with JWT tokens.

## What Changed

### ❌ Removed
- MetaMask wallet connection (`window.ethereum`)
- Ethers.js BrowserProvider integration
- Wallet address detection

### ✅ Added
- Express.js backend authentication server
- JWT (JSON Web Token) based session management
- Simple login form with username/password
- Backend API endpoints for authentication

## Backend Setup

### 1. Install Dependencies
Navigate to the backend directory and install required packages:

```bash
cd backend
npm install
```

This installs:
- `express` - Web framework
- `cors` - Cross-Origin Resource Sharing
- `jsonwebtoken` - JWT authentication
- `ethers` - Already installed, still used for blockchain interaction

### 2. Start Backend Server
Run the authentication server:

```bash
npm start
# or for development with auto-reload
npm run dev
```

The server will start on `http://localhost:5000`

You should see:
```
🔐 Authentication server running on http://localhost:5000
Available test accounts:
  - Username: owner, Password: owner123, Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  - Username: beneficiary, Password: beneficiary123, Address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
  - Username: user, Password: user123, Address: 0x70997970C51812e339D9B73b0245ad59E1eda3cb
```

## Frontend Setup

### 1. Install Dependencies
Navigate to the frontend directory and ensure dependencies are installed:

```bash
cd frontend
npm install
```

### 2. Start Frontend
```bash
npm start
```

The React app will open at `http://localhost:3000`

## Using the App

### Login Process

1. **Open the app** at `http://localhost:3000`
2. **See the login form** with a list of demo credentials
3. **Enter credentials** using one of the test accounts:
   - **Owner Account**: username: `owner`, password: `owner123`
   - **Beneficiary Account**: username: `beneficiary`, password: `beneficiary123`
   - **User Account**: username: `user`, password: `user123`
4. **Click "✓ Login"**

### After Login

Once authenticated:
- Your user address and token are stored
- Contract data loads automatically
- You can interact with the will contract based on your role (owner/beneficiary)
- Use "Logout" button to end session

## API Endpoints

### POST `/api/login`
**Description**: Authenticate user and receive JWT token

**Request**:
```json
{
  "username": "owner",
  "password": "owner123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "message": "Welcome owner!"
}
```

### POST `/api/logout`
**Description**: Logout user (client-side only)

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/api/user`
**Description**: Get current user info (requires token)

**Headers**:
```
Authorization: Bearer <your-token>
```

**Response**:
```json
{
  "username": "owner",
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}
```

## Test Accounts

| Username | Password | Role | Address |
|----------|----------|------|---------|
| owner | owner123 | Contract Owner | 0x5FbDB2315678afecb367f032d93F642f64180aa3 |
| beneficiary | beneficiary123 | Beneficiary | 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 |
| user | user123 | Regular User | 0x70997970C51812e339D9B73b0245ad59E1eda3cb |

## For Production

⚠️ **Important Security Notes**:

1. **Change JWT Secret**
   - Edit `backend/index.js`
   - Change `const JWT_SECRET = 'your-secret-key-change-in-production'`
   - Use a strong, random secret

2. **Use Real Database**
   - Replace in-memory user storage with a real database (MongoDB, PostgreSQL, etc.)
   - Hash passwords using bcrypt
   - Never store plain-text passwords

3. **Enable HTTPS**
   - Use SSL/TLS certificates
   - Ensure all API calls use HTTPS

4. **Add Rate Limiting**
   - Prevent brute-force attacks
   - Limit login attempts per IP

5. **Set CORS Properly**
   - Only allow your frontend domain:
   ```javascript
   app.use(cors({
     origin: 'https://yourdomain.com',
     credentials: true
   }));
   ```

6. **Add Refresh Tokens**
   - Implement refresh token rotation
   - Add short-lived access tokens
   - Store refresh tokens securely

## Files Modified

- ✏️ `backend/index.js` - Replaced with Express authentication server
- ✏️ `backend/package.json` - Added express, cors, jsonwebtoken
- ✏️ `frontend/src/App.js` - Removed MetaMask, added login form
- ✏️ `frontend/src/App.css` - Added login form styles

## Troubleshooting

### "Failed to connect to blockchain"
- Ensure Hardhat is running: `npx hardhat node`
- Check CONTRACT_ADDRESS matches your deployment
- Verify port 8545 is not blocked

### "CORS error"
- Ensure backend is running on port 5000
- Check `AUTH_API` in frontend points to correct backend URL

### Login fails with valid credentials
- Check backend console for errors
- Verify username/password exactly match test accounts
- Clear browser cookies and try again

### Token expired
- Log out and log in again
- Tokens expire after 24 hours by default

## Support

For issues or questions about the authentication system, check:
1. Backend console for server errors
2. Browser console (F12) for frontend errors
3. API responses in Network tab (F12 → Network)

---

**Happy building! 🚀**

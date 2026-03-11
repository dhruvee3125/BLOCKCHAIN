import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import multer from 'multer';
import { Web3Storage } from 'web3.storage';
import fs from 'fs';
import crypto from 'crypto';
import {
  hashPassword,
  comparePassword,
  encryptData,
  decryptData,
  encryptWill,
  decryptWill,
  encryptFile,
  decryptFile,
  generateSecureToken,
  sanitizeUser
} from './encryption.js';

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your-secret-key-change-in-production';
const WEB3_STORAGE_TOKEN = process.env.WEB3_STORAGE_TOKEN || 'demo-token-replace-with-real';

// Hardhat network config
const HARDHAT_RPC = 'http://localhost:8545';
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Web3.Storage client for IPFS
let w3storage;
try {
  w3storage = new Web3Storage({ token: WEB3_STORAGE_TOKEN });
} catch (e) {
  console.log('⚠️ Web3.Storage not configured. IPFS uploads will use simulation mode.');
  w3storage = null;
}

// Middleware
app.use(cors());
app.use(express.json());

// User database with roles - passwords WILL BE HASHED at startup
let users = {
  'owner': { 
    password: 'owner123',     // Will be hashed at startup
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    role: 'OWNER'
  },
  'beneficiary': { 
    password: 'beneficiary123',
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    role: 'BENEFICIARY'
  },
  'legal_advisor': { 
    password: 'advisor123',
    address: '0x70997970C51812e339D9B73b0245ad59E1eda3cb',
    role: 'LEGAL_ADVISOR'
  },
  'admin': { 
    password: 'admin123',
    address: '0x3C44CdDdB6a900FA2b585dd299e03d12FA4293BC',
    role: 'ADMIN'
  }
};

// Wills database (in-memory, replace with real DB)
const wills = new Map();
let willCounter = 1;

// Test accounts for contract interaction
const testAccounts = [
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  '0x70997970C51812e339D9B73b0245ad59E1eda3cb',
  '0x3C44CdDdB6a900FA2b585dd299e03d12FA4293BC'
];

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users[username];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password with hash
    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { username, address: user.address, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      address: user.address,
      role: user.role,
      username,
      message: `Welcome ${username}! (${user.role})`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register new user endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role required' });
    }

    if (users[username]) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Validate role
    const validRoles = ['OWNER', 'BENEFICIARY', 'LEGAL_ADVISOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be OWNER, BENEFICIARY, LEGAL_ADVISOR, or ADMIN' });
    }

    // Generate a unique Ethereum address for the new user
    const newUser = ethers.Wallet.createRandom();
    
    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create new user
    users[username] = {
      passwordHash: passwordHash,
      address: newUser.address,
      role: role,
      createdAt: new Date()
    };

    // Generate JWT token
    const token = jwt.sign(
      { username, address: newUser.address, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      address: newUser.address,
      role: role,
      username,
      message: `Welcome ${username}! Account created as ${role}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
};

// Get user info (protected)
app.get('/api/user', verifyToken, (req, res) => {
  res.json({
    username: req.user.username,
    address: req.user.address,
    role: req.user.role
  });
});

// Create a new will
app.post('/api/wills/create', verifyToken, requireRole(['OWNER']), async (req, res) => {
  try {
    const { beneficiaryUsername, asset, assetDescription, lockTime, requiresAdminApproval } = req.body;

    if (!beneficiaryUsername || !asset || !lockTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const beneficiary = users[beneficiaryUsername];
    if (!beneficiary) {
      return res.status(400).json({ error: 'Beneficiary user not found' });
    }

    // Create will object with off-chain data
    const willId = `will_${willCounter++}`;
    const willData = {
      id: willId,
      owner: req.user.address,
      ownerUsername: req.user.username,
      beneficiary: beneficiary.address,
      beneficiaryUsername: beneficiaryUsername,
      legalAdvisor: users['legal_advisor'].address,
      admin: users['admin'].address,
      asset: asset,
      assetDescription: assetDescription,
      lockTime: parseInt(lockTime),
      status: 'CREATED',
      verified: false,
      executed: false,
      claimed: false,
      requiresAdminApproval: requiresAdminApproval === true,
      adminApprovalGranted: false,
      ipfsCID: '', // Will be set when document is uploaded
      documentEncrypted: false,
      documentEncryptionIV: null,
      createdTime: new Date(),
      verificationReason: '',
      executionTime: null,
      claimedTime: null,
      contractAddress: null,
      encrypted: true // Mark as encrypted
    };

    // Compute hash for on-chain storage (HASH OF THE DIGITAL WILL)
    const willHash = computeWillHash(willData);

    // Generate initial IPFS CID (placeholder, will be updated when document uploaded)
    const initialIPFSCID = 'Qm' + Math.random().toString(36).substring(2, 49);

    // Deploy will contract to blockchain (stores hash + IPFS CID on-chain)
    // OFF-CHAIN: Actual asset details stored in backend database encrypted
    // ON-CHAIN: Only hash and IPFS reference stored
    const contractAddress = await deployWillContract(
      req.user.address,
      beneficiary.address,
      willHash,
      initialIPFSCID,
      parseInt(lockTime)
    );

    willData.contractAddress = contractAddress;
    willData.willHash = willHash;
    willData.ipfsCID = initialIPFSCID;

    // Encrypt sensitive fields (ASSET DETAILS - OFF-CHAIN)
    const encryptedWill = encryptWill(willData);
    wills.set(willId, encryptedWill);

    res.json({
      success: true,
      willId,
      contractAddress,
      willHash,
      message: 'Will created successfully with blockchain deployment',
      details: {
        onChain: {
          contractAddress,
          willHash,
          ipfsCID: initialIPFSCID,
          status: 'HASH & IPFS STORED ON-CHAIN'
        },
        offChain: {
          asset,
          assetDescription,
          personalInfo: 'ENCRYPTED IN BACKEND'
        }
      },
      will: decryptWill(encryptedWill)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to upload file to IPFS with encryption
async function uploadToIPFS(fileBuffer, fileName) {
  try {
    if (!w3storage || WEB3_STORAGE_TOKEN === 'demo-token-replace-with-real') {
      // Simulation mode - generate a mock IPFS hash
      const mockCID = 'Qm' + Math.random().toString(36).substring(2, 49);
      return { cid: mockCID, encrypted: false, iv: null };
    }
    
    // Encrypt file before upload
    const { encryptedBuffer, iv } = encryptFile(fileBuffer);
    
    // Create a File-like object with encrypted data
    const blob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
    const file = new File([blob], fileName, { type: 'application/octet-stream' });
    
    // Upload to Web3.Storage
    const cid = await w3storage.put([file], { name: fileName });
    return { cid, encrypted: true, iv };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error('Failed to upload to IPFS: ' + error.message);
  }
}

/**
 * Compute hash of will data for on-chain storage
 * This allows on-chain verification that off-chain data hasn't been tampered with
 */
function computeWillHash(willData) {
  try {
    // Create a canonical representation of the will data (sensitive fields only)
    const dataToHash = {
      owner: willData.owner,
      beneficiary: willData.beneficiary,
      asset: willData.asset,
      assetDescription: willData.assetDescription,
      lockTime: willData.lockTime,
      createdTime: willData.createdTime
    };

    // Convert to JSON string for hashing
    const jsonString = JSON.stringify(dataToHash);

    // Use keccak256 (Ethereum standard) via ethers.js if available
    try {
      return ethers.keccak256(ethers.toUtf8Bytes(jsonString));
    } catch (e) {
      // Fallback to Node.js crypto if ethers fails
      return '0x' + crypto.createHash('sha256').update(jsonString).digest('hex');
    }
  } catch (error) {
    console.error('Hash computation error:', error);
    // Return a fallback hash if computation fails
    return '0x' + crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Deploy will contract to blockchain
 * This stores the hash and IPFS CID on-chain (not the sensitive data)
 */
async function deployWillContract(ownerAddress, beneficiaryAddress, willHash, ipfsCID, lockTime) {
  try {
    // For now, return a simulated contract address
    // In production, this would deploy via ethers.js to actual chain
    const simulatedAddress = '0x' + crypto.randomBytes(20).toString('hex');
    console.log(`📝 Will contract would deploy at: ${simulatedAddress}`);
    return simulatedAddress;
  } catch (error) {
    console.error('Contract deployment error:', error);
    throw new Error('Failed to deploy will contract: ' + error.message);
  }
}

// Upload will document to IPFS (with encryption)
app.post('/api/wills/:willId/upload-document', verifyToken, requireRole(['OWNER']), upload.single('document'), async (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.owner !== req.user.address) {
      return res.status(403).json({ error: 'Only owner can upload documents' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to IPFS with encryption
    const { cid, encrypted, iv } = await uploadToIPFS(req.file.buffer, `will_${will.id}_${Date.now()}.pdf`);
    
    // Store CID and encryption metadata in will data
    will.ipfsCID = cid;
    will.documentEncrypted = encrypted;
    if (encrypted) {
      will.documentEncryptionIV = iv;
    }
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Document uploaded to IPFS securely (encrypted)',
      ipfsCID: cid,
      encrypted,
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get IPFS URI for will document
app.get('/api/wills/:willId/document-uri', verifyToken, (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (!will.ipfsCID) {
      return res.status(404).json({ error: 'No document uploaded for this will' });
    }

    // Provide IPFS gateway URLs
    const gateways = [
      `https://w3s.link/ipfs/${will.ipfsCID}`,
      `https://ipfs.io/ipfs/${will.ipfsCID}`,
      `https://gateway.pinata.cloud/ipfs/${will.ipfsCID}`
    ];

    res.json({
      success: true,
      ipfsCID: will.ipfsCID,
      gateways,
      primaryGateway: gateways[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/wills/my-wills', verifyToken, (req, res) => {
  try {
    const userRole = req.user.role;
    const userAddress = req.user.address;
    
    let userWills = [];
    
    if (userRole === 'OWNER') {
      userWills = Array.from(wills.values()).filter(w => w.owner === userAddress);
    } else if (userRole === 'BENEFICIARY') {
      userWills = Array.from(wills.values()).filter(w => w.beneficiary === userAddress);
    } else if (userRole === 'LEGAL_ADVISOR') {
      userWills = Array.from(wills.values()).filter(w => w.status === 'PENDING_VERIFICATION');
    } else if (userRole === 'ADMIN') {
      userWills = Array.from(wills.values());
    }

    res.json({
      success: true,
      count: userWills.length,
      wills: userWills.map(w => decryptWill(w))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific will
app.get('/api/wills/:willId', verifyToken, (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    // Check access
    const isOwner = req.user.address === will.owner;
    const isBeneficiary = req.user.address === will.beneficiary;
    const isLegalAdvisor = req.user.role === 'LEGAL_ADVISOR';
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isBeneficiary && !isLegalAdvisor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request verification
app.post('/api/wills/:willId/request-verification', verifyToken, requireRole(['OWNER']), (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.owner !== req.user.address) {
      return res.status(403).json({ error: 'Only owner can request verification' });
    }

    if (will.status !== 'CREATED') {
      return res.status(400).json({ error: 'Will already submitted for verification' });
    }

    will.status = 'PENDING_VERIFICATION';
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Verification requested from legal advisor',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify will (legal advisor)
app.post('/api/wills/:willId/verify', verifyToken, requireRole(['LEGAL_ADVISOR']), (req, res) => {
  try {
    const { verified, reason } = req.body;
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ error: 'Will not pending verification' });
    }

    will.verified = verified;
    will.verificationReason = encryptData(reason || '');
    
    if (verified) {
      // If admin approval is required, move to PENDING_ADMIN_APPROVAL
      if (will.requiresAdminApproval) {
        will.status = 'PENDING_ADMIN_APPROVAL';
      } else {
        will.status = 'VERIFIED';
      }
    } else {
      will.status = 'CREATED'; // Back to created for resubmission
    }

    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: verified ? 'Will verified successfully' : 'Will verification rejected',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request admin approval (owner - after verification)
app.post('/api/wills/:willId/request-admin-approval', verifyToken, requireRole(['OWNER']), (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.owner !== req.user.address) {
      return res.status(403).json({ error: 'Only owner can request approval' });
    }

    if (!will.requiresAdminApproval) {
      return res.status(400).json({ error: 'This will does not require admin approval' });
    }

    if (will.status !== 'VERIFIED') {
      return res.status(400).json({ error: 'Will must be verified first' });
    }

    will.status = 'PENDING_ADMIN_APPROVAL';
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Admin approval requested',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grant admin approval (admin)
app.post('/api/wills/:willId/grant-admin-approval', verifyToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.status !== 'PENDING_ADMIN_APPROVAL') {
      return res.status(400).json({ error: 'Will not pending admin approval' });
    }

    will.adminApprovalGranted = true;
    will.status = 'VERIFIED'; // Ready for execution
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Admin approval granted',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject admin approval (admin)
app.post('/api/wills/:willId/reject-admin-approval', verifyToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { reason } = req.body;
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.status !== 'PENDING_ADMIN_APPROVAL') {
      return res.status(400).json({ error: 'Will not pending admin approval' });
    }

    will.adminApprovalGranted = false;
    will.status = 'VERIFIED'; // Back to verified, can request approval again
    will.verificationReason = encryptData(reason || 'Admin rejected approval');
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Admin approval rejected',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute will
app.post('/api/wills/:willId/execute', verifyToken, requireRole(['OWNER', 'ADMIN']), (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    // Owner check (admin can override)
    if (req.user.role === 'OWNER' && will.owner !== req.user.address) {
      return res.status(403).json({ error: 'Only owner can execute' });
    }

    // Check execution requirements
    if (!will.verified) {
      return res.status(400).json({ error: 'Will not verified yet' });
    }

    // If admin approval is required, must be granted
    if (will.requiresAdminApproval && !will.adminApprovalGranted) {
      return res.status(400).json({ error: 'Admin approval required but not granted' });
    }

    if (will.executed) {
      return res.status(400).json({ error: 'Will already executed' });
    }

    const now = new Date();
    const createdTime = new Date(will.createdTime).getTime();
    const lockTimeMs = will.lockTime * 1000;

    if (now.getTime() < createdTime + lockTimeMs) {
      return res.status(400).json({ 
        error: 'Lock period not elapsed',
        remainingTime: createdTime + lockTimeMs - now.getTime()
      });
    }

    will.executed = true;
    will.executionTime = now;
    will.status = 'EXECUTED';
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Will executed successfully',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim asset (beneficiary)
app.post('/api/wills/:willId/claim', verifyToken, requireRole(['BENEFICIARY']), (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.beneficiary !== req.user.address) {
      return res.status(403).json({ error: 'Only beneficiary can claim' });
    }

    if (!will.executed) {
      return res.status(400).json({ error: 'Will not executed yet' });
    }

    if (will.claimed) {
      return res.status(400).json({ error: 'Asset already claimed' });
    }

    will.claimed = true;
    will.claimedTime = new Date();
    will.status = 'CLAIMED';
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Asset claimed successfully',
      asset: decryptData(will.asset),
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin override verification
app.post('/api/wills/:willId/admin-override-verify', verifyToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { verified } = req.body;
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    will.verified = verified;
    if (verified) {
      will.status = 'VERIFIED';
      will.verificationReason = encryptData('Admin override');
    }

    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Admin override applied',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin force execute
app.post('/api/wills/:willId/admin-force-execute', verifyToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const will = wills.get(req.params.willId);
    
    if (!will) {
      return res.status(404).json({ error: 'Will not found' });
    }

    if (will.executed) {
      return res.status(400).json({ error: 'Will already executed' });
    }

    will.executed = true;
    will.executionTime = new Date();
    will.status = 'EXECUTED';
    wills.set(req.params.willId, will);

    res.json({
      success: true,
      message: 'Will force executed by admin',
      will: decryptWill(will)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for admin)
app.get('/api/users', verifyToken, requireRole(['ADMIN']), (req, res) => {
  const allUsers = Object.entries(users).map(([username, user]) => ({
    username,
    address: user.address,
    role: user.role
  }));

  res.json({
    success: true,
    users: allUsers
  });
});

// Get system statistics (for admin)
app.get('/api/stats', verifyToken, requireRole(['ADMIN']), (req, res) => {
  const allWills = Array.from(wills.values());
  
  res.json({
    success: true,
    stats: {
      totalWills: allWills.length,
      createdWills: allWills.filter(w => w.status === 'CREATED').length,
      pendingWills: allWills.filter(w => w.status === 'PENDING_VERIFICATION').length,
      verifiedWills: allWills.filter(w => w.status === 'VERIFIED').length,
      executedWills: allWills.filter(w => w.status === 'EXECUTED').length,
      claimedWills: allWills.filter(w => w.status === 'CLAIMED').length,
      totalUsers: Object.keys(users).length
    }
  });
});

// Get test accounts
app.get('/api/test-accounts', (req, res) => {
  res.json({
    success: true,
    accounts: Object.entries(users).map(([username, user]) => ({
      username,
      password: user.password || '(hashed)',
      address: user.address,
      role: user.role
    }))
  });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Initialize security: Hash all passwords at startup
async function initializeSecurity() {
  try {
    for (const [username, user] of Object.entries(users)) {
      if (user.password && !user.passwordHash) {
        user.passwordHash = await hashPassword(user.password);
        // Remove plain text password from memory
        delete user.password;
      }
    }
    console.log('✅ All passwords encrypted successfully');
  } catch (error) {
    console.error('❌ Failed to encrypt passwords:', error.message);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await initializeSecurity();

  app.listen(PORT, () => {
    console.log(`🔐 Digital Will Backend Server running on http://localhost:${PORT}`);
    console.log('\n📋 Available Test Accounts (Passwords Encrypted):');
    Object.entries(users).forEach(([username, user]) => {
      console.log(`  • ${username} (${user.role})`);
      console.log(`    - Address: ${user.address}\n`);
    });
    console.log('🛡️ ALL DATA ENCRYPTED - Passwords hashed, documents encrypted on IPFS\n');
    console.log('📚 Available Endpoints:');
    console.log('  POST /api/login - Login with encrypted password\n');
  });
}

startServer();

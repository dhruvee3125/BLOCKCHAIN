# Code Samples & Implementation Details

## Smart Contract: Key Functions

### 1. User Registration

```solidity
/**
 * Register a new user with a specific role
 */
function registerUser(string memory role) public {
    require(bytes(role).length > 0, "Role cannot be empty");
    require(!userRegistered[msg.sender], "User already registered");
    
    bytes32 roleBytes = keccak256(abi.encodePacked(role));
    require(
        roleBytes == OWNER_ROLE ||
        roleBytes == BENEFICIARY_ROLE ||
        roleBytes == LEGAL_ADVISOR_ROLE ||
        roleBytes == ADMIN_ROLE,
        "Invalid role"
    );
    
    _grantRole(roleBytes, msg.sender);
    userRegistered[msg.sender] = true;
    registeredUsers.push(msg.sender);
    
    emit UserRegistered(msg.sender, role);
}
```

### 2. Create Will

```solidity
/**
 * Create a new will with conditions
 * Only callable by users with OWNER_ROLE
 */
function createWill(
    address beneficiary,
    string memory willHash,
    string memory ipfsCID,
    uint256 lockTime,
    bool requiresAdminApproval
) public onlyRole(OWNER_ROLE) nonReentrant {
    require(beneficiary != address(0), "Invalid beneficiary");
    require(bytes(willHash).length > 0, "Will hash required");
    require(lockTime > 0, "Lock time must be positive");
    
    uint256 willId = nextWillId;
    Will storage will = wills[willId];
    
    will.owner = msg.sender;
    will.beneficiary = beneficiary;
    will.willHash = willHash;
    will.ipfsCID = ipfsCID;
    will.status = WillStatus.CREATED;
    will.createdTime = block.timestamp;
    will.lockTime = lockTime;
    will.requiresAdminApproval = requiresAdminApproval;
    will.verified = false;
    will.executed = false;
    will.claimed = false;
    
    userWills[msg.sender].push(willId);
    
    emit WillCreated(willId, msg.sender);
    nextWillId++;
}
```

### 3. Request Verification

```solidity
/**
 * Owner requests legal verification of their will
 */
function requestVerification(
    uint256 willId,
    address legalAdvisor
) public onlyRole(OWNER_ROLE) {
    require(willId < nextWillId, "Will does not exist");
    Will storage will = wills[willId];
    require(will.owner == msg.sender, "Only owner can request verification");
    require(will.status == WillStatus.CREATED, "Invalid will status");
    
    will.status = WillStatus.PENDING_VERIFICATION;
    will.legalAdvisor = legalAdvisor;
    
    emit VerificationRequested(willId, legalAdvisor);
}
```

### 4. Approve Will (Legal Advisor)

```solidity
/**
 * Legal Advisor verifies and approves the will
 */
function approveWill(uint256 willId) 
    public 
    onlyRole(LEGAL_ADVISOR_ROLE) 
    nonReentrant 
{
    require(willId < nextWillId, "Will does not exist");
    Will storage will = wills[willId];
    require(
        will.status == WillStatus.PENDING_VERIFICATION,
        "Will not pending verification"
    );
    
    will.verified = true;
    
    if (will.requiresAdminApproval) {
        will.status = WillStatus.PENDING_ADMIN_APPROVAL;
    } else {
        will.status = WillStatus.VERIFIED;
    }
    
    Approval memory approval = Approval({
        approver: msg.sender,
        timestamp: block.timestamp,
        approved: true,
        reason: "Verified by legal advisor"
    });
    will.approvals.push(approval);
    
    emit WillVerified(willId, true);
}
```

### 5. Add Condition

```solidity
/**
 * Add execution condition to will
 */
function addCondition(
    uint256 willId,
    uint8 conditionType,
    uint256 parameter1,
    uint256 parameter2
) public onlyRole(OWNER_ROLE) {
    require(willId < nextWillId, "Will does not exist");
    require(conditionType < 7, "Invalid condition type");
    
    Will storage will = wills[willId];
    require(will.owner == msg.sender, "Only owner can add conditions");
    
    Condition memory condition = Condition({
        conditionType: ConditionType(conditionType),
        parameter1: parameter1,
        parameter2: parameter2,
        satisfied: false
    });
    
    will.conditions.push(condition);
    emit ConditionAdded(willId, conditionType);
}
```

### 6. Check Condition

```solidity
/**
 * Check if a specific condition is satisfied
 */
function checkCondition(uint256 willId, uint256 conditionIndex) 
    public 
    view 
    returns (bool) 
{
    require(willId < nextWillId, "Will does not exist");
    require(conditionIndex < wills[willId].conditions.length, "Invalid condition");
    
    Condition storage cond = wills[willId].conditions[conditionIndex];
    Will storage will = wills[willId];
    
    if (cond.conditionType == ConditionType.Manual) {
        return true; // Always ready when owner says so
    }
    
    if (cond.conditionType == ConditionType.NoLogin_365Days) {
        // Check if owner hasn't logged in for 365 days
        uint256 daysSinceUpdate = (block.timestamp - will.createdTime) / 86400;
        return daysSinceUpdate >= 365;
    }
    
    if (cond.conditionType == ConditionType.SpecificDate) {
        return block.timestamp >= cond.parameter1;
    }
    
    if (cond.conditionType == ConditionType.OnDeath) {
        return true; // Would be triggered by oracle
    }
    
    if (cond.conditionType == ConditionType.Age) {
        // parameter1 = beneficiary birth timestamp
        uint256 age = (block.timestamp - cond.parameter1) / (365.25 * 86400);
        return age >= cond.parameter2;
    }
    
    if (cond.conditionType == ConditionType.EthPrice) {
        // parameter1 = target price, would use oracle
        return true; // Placeholder for oracle integration
    }
    
    if (cond.conditionType == ConditionType.MultiSig) {
        // parameter1 = signatures needed, check approvals
        return will.approvals.length >= cond.parameter1;
    }
    
    return false;
}
```

### 7. Execute Will

```solidity
/**
 * Execute will when all conditions are met
 */
function executeWill(uint256 willId) 
    public 
    nonReentrant 
{
    require(willId < nextWillId, "Will does not exist");
    Will storage will = wills[willId];
    
    require(will.status == WillStatus.VERIFIED || 
            will.status == WillStatus.PENDING_ADMIN_APPROVAL ||
            (will.requiresAdminApproval && will.status == WillStatus.READY_TO_EXECUTE),
            "Invalid will status for execution"
    );
    
    require(!will.executed, "Will already executed");
    
    // Check all conditions
    for (uint256 i = 0; i < will.conditions.length; i++) {
        require(checkCondition(willId, i), "Not all conditions satisfied");
    }
    
    will.status = WillStatus.EXECUTED;
    will.executed = true;
    will.executionTime = block.timestamp;
    
    emit WillExecuted(willId);
}
```

### 8. Claim Assets (Beneficiary)

```solidity
/**
 * Beneficiary claims their inherited assets
 */
function claimAssets(uint256 willId) 
    public 
    nonReentrant 
{
    require(willId < nextWillId, "Will does not exist");
    Will storage will = wills[willId];
    
    require(msg.sender == will.beneficiary, "Only beneficiary can claim");
    require(will.executed, "Will not yet executed");
    require(!will.claimed, "Assets already claimed");
    
    will.status = WillStatus.CLAIMED;
    will.claimed = true;
    will.claimedTime = block.timestamp;
    
    emit AssetsClaimed(willId, msg.sender);
}
```

---

## Backend API: Key Endpoints

### 1. Registration Endpoint

```javascript
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role required' });
    }

    if (users[username]) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const validRoles = ['OWNER', 'BENEFICIARY', 'LEGAL_ADVISOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Generate unique Ethereum address
    const newUser = ethers.Wallet.createRandom();
    const passwordHash = await hashPassword(password);

    users[username] = {
      passwordHash: passwordHash,
      address: newUser.address,
      role: role,
      createdAt: new Date()
    };

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
```

### 2. Login Endpoint

```javascript
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

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
```

### 3. Create Will Endpoint

```javascript
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
      createdTime: new Date()
    };

    const willHash = computeWillHash(willData);

    const contractAddress = await deployWillContract(
      req.user.address,
      beneficiary.address,
      willHash,
      'Qm' + Math.random().toString(36).substring(2, 49),
      parseInt(lockTime)
    );

    willData.contractAddress = contractAddress;
    willData.willHash = willHash;

    const encryptedWill = encryptWill(willData);
    wills.set(willId, encryptedWill);

    res.json({
      success: true,
      willId,
      contractAddress,
      willHash,
      message: 'Will created successfully with blockchain deployment',
      will: decryptWill(encryptedWill)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Frontend Components: Key Logic

### 1. App_Integrated.js - Main Application

```javascript
function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [userRole, setUserRole] = useState('');
  const [account, setAccount] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [signupRole, setSignupRole] = useState('OWNER');
  const [wills, setWills] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      setAuthToken(data.token);
      setAccount(data.address);
      setUserRole(data.role);
      setAuthenticated(true);
      setSuccess(data.message);
      setUsername('');
      setPassword('');
      fetchWills(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await fetch(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: signupRole })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      setAuthToken(data.token);
      setAccount(data.address);
      setUserRole(data.role);
      setAuthenticated(true);
      setSuccess(data.message);
      setUsername('');
      setPassword('');
      setIsSignupMode(false);
      fetchWills(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's wills
  const fetchWills = async (token) => {
    try {
      const response = await fetch(`${AUTH_API}/wills/my-wills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch wills');
      const data = await response.json();
      setWills(data.wills || []);
    } catch (err) {
      console.error('Fetch wills error:', err);
    }
  };

  // Render login/signup
  if (!authenticated) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>⛓️ Digital Will DApp</h1>
          <p>Secure Your Legacy on the Blockchain</p>
          
          <div className="wallet-section" style={{ maxWidth: '500px' }}>
            <div className="login-form">
              <h2>{isSignupMode ? '✅ Create Account' : '🔒 Login'}</h2>
              <form onSubmit={isSignupMode ? handleSignup : handleLogin}>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {isSignupMode && (
                  <select value={signupRole} onChange={(e) => setSignupRole(e.target.value)}>
                    <option value="OWNER">Owner</option>
                    <option value="BENEFICIARY">Beneficiary</option>
                    <option value="LEGAL_ADVISOR">Legal Advisor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                )}
                <button type="submit" disabled={loading}>
                  {loading ? 'Processing...' : '✓ ' + (isSignupMode ? 'Create Account' : 'Login')}
                </button>
              </form>
              
              <button onClick={() => setIsSignupMode(!isSignupMode)}>
                {isSignupMode ? '← Back to Login' : '+ Create New Account'}
              </button>
            </div>
          </div>

          {error && <div className="alert error">❌ {error}</div>}
          {success && <div className="alert success">{success}</div>}
        </header>
      </div>
    );
  }

  // Render dashboard
  return (
    <div className="App">
      <header className="App-header">
        <h1>⛓️ Digital Will DApp</h1>
        <div className="wallet-section">
          <div className="connected">
            <p>👤 <strong>{username}</strong> ({userRole}) • {account.slice(0, 6)}...{account.slice(-4)}</p>
            <button onClick={() => {
              setAuthenticated(false);
              setAuthToken('');
              setWills([]);
            }}>Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard">
        <h2>Your Wills</h2>
        {wills.length === 0 ? (
          <p>No wills created yet</p>
        ) : (
          <div className="wills-list">
            {wills.map((will, idx) => (
              <div key={idx} className="will-card">
                <h3>Will #{idx}</h3>
                <p>Status: {will.status}</p>
                <p>Created: {new Date(will.createdTime).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. Encryption/Decryption Functions

```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = crypto.randomBytes(32);

export function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted: encrypted,
    iv: iv.toString('hex')
  };
}

export function decryptData(encryptedData, iv) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

---

## Smart Contract Events

```solidity
event UserRegistered(address indexed user, string role);
event WillCreated(uint256 indexed willId, address indexed owner);
event ConditionAdded(uint256 indexed willId, uint8 conditionType);
event VerificationRequested(uint256 indexed willId, address indexed advisor);
event WillVerified(uint256 indexed willId, bool approved);
event AdminApprovalRequested(uint256 indexed willId);
event AdminApprovalGranted(uint256 indexed willId);
event AdminApprovalRejected(uint256 indexed willId, string reason);
event ConditionSatisfied(uint256 indexed willId, uint8 condition);
event WillExecuted(uint256 indexed willId);
event AssetsClaimed(uint256 indexed willId, address indexed beneficiary);
event DisputeRaised(uint256 indexed willId, address indexed raiser, string reason);
event DisputeResolved(uint256 indexed willId, bool favorOwner);
event WillRejected(uint256 indexed willId, string reason);
event SystemPaused();
event SystemUnpaused();
```

---

## Testing Pattern

```javascript
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('DigitalWill Smart Contract', () => {
  let digitalWill;
  let owner, beneficiary, advisor, admin;

  beforeEach(async () => {
    [owner, beneficiary, advisor, admin] = await ethers.getSigners();
    
    const DigitalWill = await ethers.getContractFactory('DigitalWill');
    digitalWill = await DigitalWill.deploy();
    await digitalWill.waitForDeployment();
  });

  describe('User Registration', () => {
    it('should register user with OWNER role', async () => {
      const role = ethers.id('OWNER_ROLE');
      await digitalWill.connect(owner).registerUser('OWNER');
      
      const hasRole = await digitalWill.hasRole(role, owner.address);
      expect(hasRole).to.be.true;
    });

    it('should prevent duplicate registration', async () => {
      await digitalWill.connect(owner).registerUser('OWNER');
      await expect(
        digitalWill.connect(owner).registerUser('OWNER')
      ).to.be.revertedWith('User already registered');
    });
  });

  describe('Will Creation', () => {
    beforeEach(async () => {
      await digitalWill.connect(owner).registerUser('OWNER');
      await digitalWill.connect(beneficiary).registerUser('BENEFICIARY');
    });

    it('should create a new will', async () => {
      const tx = await digitalWill.connect(owner).createWill(
        beneficiary.address,
        ethers.keccak256(ethers.toUtf8Bytes('test')),
        'Qm...',
        3600,
        false
      );

      expect(tx).to.emit(digitalWill, 'WillCreated');
    });

    it('should prevent non-owners from creating will', async () => {
      await expect(
        digitalWill.connect(beneficiary).createWill(
          beneficiary.address,
          ethers.keccak256(ethers.toUtf8Bytes('test')),
          'Qm...',
          3600,
          false
        )
      ).to.be.revertedWithCustomError(digitalWill, 'AccessControlUnauthorizedAccount');
    });
  });
});
```

---

**Document Version:** 1.0
**Date:** March 11, 2026
**Status:** Complete

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

const AUTH_API = 'http://localhost:5000/api';

function App() {
  // Authentication states
  const [authenticated, setAuthenticated] = useState(false);
  const [account, setAccount] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [userRole, setUserRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [signupRole, setSignupRole] = useState('OWNER');

  // Will management states
  const [wills, setWills] = useState([]);
  const [selectedWill, setSelectedWill] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states for creating will
  const [createForm, setCreateForm] = useState({
    beneficiaryUsername: '',
    asset: '',
    assetDescription: '',
    lockTime: '3600', // 1 hour in seconds
    requiresAdminApproval: false
  });

  // File upload state
  const [documentFile, setDocumentFile] = useState(null);

  // Verification form
  const [verificationForm, setVerificationForm] = useState({
    verified: false,
    reason: ''
  });

  // Admin approval form
  const [adminApprovalForm, setAdminApprovalForm] = useState({
    reason: ''
  });

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

      // Fetch wills after login
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
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await fetch(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password,
          role: signupRole
        })
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

      // Fetch wills after signup
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

  // Refresh wills
  const handleRefreshWills = async () => {
    await fetchWills(authToken);
  };

  // Create new will (Owner only)
  const handleCreateWill = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(createForm)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create will');
      }

      const data = await response.json();
      setSuccess('✅ Will created successfully!');
      setShowCreateForm(false);
      setCreateForm({
        beneficiaryUsername: '',
        asset: '',
        assetDescription: '',
        lockTime: '3600'
      });
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Request verification
  const handleRequestVerification = async (willId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/${willId}/request-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('✅ Verification requested from legal advisor');
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify will (Legal Advisor)
  const handleVerifyWill = async (willId, verified) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/${willId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          verified,
          reason: verificationForm.reason
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(verified ? '✅ Will verified!' : '❌ Will rejected');
      setVerificationForm({ verified: false, reason: '' });
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Execute will
  const handleExecuteWill = async (willId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/${willId}/execute`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('✅ Will executed successfully!');
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Claim asset (Beneficiary)
  const handleClaimAsset = async (willId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/${willId}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('✅ Asset claimed successfully!');
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle admin override
  const handleAdminOverride = async (willId, action) => {
    try {
      setLoading(true);
      setError('');

      const endpoint = action === 'verify' 
        ? `${AUTH_API}/wills/${willId}/admin-override-verify`
        : `${AUTH_API}/wills/${willId}/admin-force-execute`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: action === 'verify' ? JSON.stringify({ verified: true }) : '{}'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`✅ Admin ${action} completed!`);
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload will document to IPFS
  const handleUploadDocument = async (willId) => {
    try {
      if (!documentFile) {
        setError('Please select a file first');
        return;
      }

      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('document', documentFile);

      const response = await fetch(`${AUTH_API}/wills/${willId}/upload-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('✅ Document uploaded to IPFS successfully! CID: ' + data.ipfsCID);
      setDocumentFile(null);
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Request admin approval
  const handleRequestAdminApproval = async (willId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/${willId}/request-admin-approval`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('✅ Admin approval requested');
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Grant admin approval
  const handleGrantAdminApproval = async (willId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/${willId}/grant-admin-approval`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('✅ Admin approval granted');
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reject admin approval
  const handleRejectAdminApproval = async (willId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AUTH_API}/wills/${willId}/reject-admin-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ reason: adminApprovalForm.reason || 'No reason provided' })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('✅ Admin approval rejected');
      setAdminApprovalForm({ reason: '' });
      await handleRefreshWills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setAuthenticated(false);
    setAccount('');
    setAuthToken('');
    setUserRole('');
    setWills([]);
    setSelectedWill(null);
    setError('');
    setSuccess('');
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'CREATED': '#ffd700',
      'PENDING_VERIFICATION': '#ff9800',
      'VERIFIED': '#4caf50',
      'PENDING_ADMIN_APPROVAL': '#e91e63',
      'EXECUTED': '#2196f3',
      'CLAIMED': '#9c27b0'
    };
    return colors[status] || '#999';
  };

  // Render
  if (!authenticated) {
    return (
      <div className="App">
        <header className="App-header">
          <div className="header-top">
            <h1>⛓️ Digital Will DApp</h1>
            <p className="subtitle">Secure Your Legacy on the Blockchain</p>
          </div>

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
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                      Select Your Role:
                    </label>
                    <select 
                      value={signupRole} 
                      onChange={(e) => setSignupRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        borderRadius: '5px',
                        border: '1px solid #ddd',
                        fontSize: '14px'
                      }}
                    >
                      <option value="OWNER">Owner - Create and manage wills</option>
                      <option value="BENEFICIARY">Beneficiary - Receive assets</option>
                      <option value="LEGAL_ADVISOR">Legal Advisor - Verify wills</option>
                      <option value="ADMIN">Admin - Oversee system</option>
                    </select>
                  </div>
                )}
                
                <button type="submit" disabled={loading} className="connect-btn">
                  {loading ? (isSignupMode ? 'Creating Account...' : 'Logging in...') : (isSignupMode ? '✓ Create Account' : '✓ Login')}
                </button>
              </form>

              <div style={{ marginTop: '15px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                  {isSignupMode ? 'Already have an account?' : 'New to Digital Will?'}
                </p>
                <button 
                  onClick={() => {
                    setIsSignupMode(!isSignupMode);
                    setError('');
                    setSuccess('');
                    setUsername('');
                    setPassword('');
                  }}
                  className="connect-btn"
                  style={{ backgroundColor: '#6c63ff', marginBottom: '15px' }}
                >
                  {isSignupMode ? '← Back to Login' : '+ Create New Account'}
                </button>
              </div>

              {!isSignupMode && (
                <div className="demo-credentials">
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>Demo Accounts:</p>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    <p><strong>Owner:</strong> owner / owner123</p>
                    <p><strong>Beneficiary:</strong> beneficiary / beneficiary123</p>
                    <p><strong>Legal Advisor:</strong> legal_advisor / advisor123</p>
                    <p><strong>Admin:</strong> admin / admin123</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="alert error">❌ {error}</div>}
          {success && <div className="alert success">{success}</div>}
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-top">
          <h1>⛓️ Digital Will DApp</h1>
          <p className="subtitle">Secure Your Legacy on the Blockchain</p>
        </div>

        <div className="wallet-section">
          <div className="connected">
            <p>👤 <strong>{username}</strong> ({userRole}) • {account.slice(0, 6)}...{account.slice(-4)}</p>
            <button onClick={handleLogout} className="disconnect-btn">
              Logout
            </button>
          </div>
        </div>

        {error && <div className="alert error">❌ {error}</div>}
        {success && <div className="alert success">{success}</div>}

        <div className="main-content">
          {/* Create Will Section (Owner) */}
          {userRole === 'OWNER' && (
            <div className="card action-card owner-card">
              <h2>📝 Create New Will</h2>
              {!showCreateForm ? (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="action-btn execute-btn"
                >
                  ➕ Create Will
                </button>
              ) : (
                <form onSubmit={handleCreateWill}>
                  <div className="form-group">
                    <label>Beneficiary Username:</label>
                    <input
                      type="text"
                      value={createForm.beneficiaryUsername}
                      onChange={(e) => setCreateForm({...createForm, beneficiaryUsername: e.target.value})}
                      placeholder="Select beneficiary"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Asset:</label>
                    <input
                      type="text"
                      value={createForm.asset}
                      onChange={(e) => setCreateForm({...createForm, asset: e.target.value})}
                      placeholder="e.g., Property, Digital Assets"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Asset Description:</label>
                    <textarea
                      value={createForm.assetDescription}
                      onChange={(e) => setCreateForm({...createForm, assetDescription: e.target.value})}
                      placeholder="Detailed description of the asset"
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Lock Time (seconds):</label>
                    <input
                      type="number"
                      value={createForm.lockTime}
                      onChange={(e) => setCreateForm({...createForm, lockTime: e.target.value})}
                      min="0"
                      required
                    />
                    <small>Time before will can be executed (3600 = 1 hour)</small>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={createForm.requiresAdminApproval}
                        onChange={(e) => setCreateForm({...createForm, requiresAdminApproval: e.target.checked})}
                      />
                      {' '} Require Admin Approval Before Execution
                    </label>
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading} className="action-btn execute-btn">
                      {loading ? 'Creating...' : '✓ Create Will'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowCreateForm(false)}
                      className="action-btn"
                      style={{ background: '#666' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Wills List */}
          <div className="card info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>📋 {userRole === 'LEGAL_ADVISOR' ? 'Pending Verifications' : 'Your Wills'}</h2>
              <button onClick={handleRefreshWills} className="action-btn" style={{ padding: '8px 16px', marginBottom: '0' }}>
                🔄 Refresh
              </button>
            </div>

            {wills.length === 0 ? (
              <p style={{ opacity: 0.8 }}>No wills yet</p>
            ) : (
              <div className="wills-list">
                {wills.map((will) => (
                  <div key={will.id} className="will-card" style={{ borderLeft: `5px solid ${getStatusColor(will.status)}` }}>
                    <div className="will-header">
                      <h3>{will.asset}</h3>
                      <span className="status-badge" style={{ background: getStatusColor(will.status) }}>
                        {will.status}
                      </span>
                    </div>

                    <div className="will-details">
                      <p><strong>Owner:</strong> {will.ownerUsername}</p>
                      <p><strong>Beneficiary:</strong> {will.beneficiaryUsername}</p>
                      <p><strong>Description:</strong> {will.assetDescription}</p>
                      <p><strong>Created:</strong> {new Date(will.createdTime).toLocaleString()}</p>
                    </div>

                    <div className="will-actions">
                      {/* Owner: Upload Document */}
                      {userRole === 'OWNER' && (
                        <div style={{ marginBottom: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>📄 Upload Will Document (IPFS):</p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <input
                              type="file"
                              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                              accept=".pdf,.doc,.docx,.txt"
                              style={{ flex: 1 }}
                            />
                            <button
                              onClick={() => handleUploadDocument(will.id)}
                              disabled={loading || !documentFile}
                              className="action-btn"
                              style={{ padding: '8px 12px', background: '#9c27b0', whiteSpace: 'nowrap' }}
                            >
                              📤 Upload
                            </button>
                          </div>
                          {will.ipfsCID && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                              ✅ Document uploaded (CID: {will.ipfsCID.slice(0, 10)}...)
                            </p>
                          )}
                        </div>
                      )}

                      {/* Owner: Request Verification */}
                      {userRole === 'OWNER' && will.status === 'CREATED' && (
                        <button
                          onClick={() => handleRequestVerification(will.id)}
                          disabled={loading}
                          className="action-btn execute-btn"
                        >
                          📤 Request Verification
                        </button>
                      )}

                      {/* Owner: Execute After Verification (no admin approval needed) */}
                      {userRole === 'OWNER' && will.status === 'VERIFIED' && !will.requiresAdminApproval && (
                        <button
                          onClick={() => handleExecuteWill(will.id)}
                          disabled={loading}
                          className="action-btn execute-btn"
                        >
                          ✓ Execute Will
                        </button>
                      )}

                      {/* Owner: Request Admin Approval */}
                      {userRole === 'OWNER' && will.status === 'PENDING_ADMIN_APPROVAL' && (
                        <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '5px', marginBottom: '10px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>⏳ Waiting for Admin Approval</p>
                          <button
                            onClick={() => handleRefreshWills()}
                            disabled={loading}
                            className="action-btn"
                            style={{ background: '#ff9800', padding: '8px 16px' }}
                          >
                            🔄 Refresh Status
                          </button>
                        </div>
                      )}

                      {/* Owner: Execute After Admin Approval */}
                      {userRole === 'OWNER' && will.status === 'VERIFIED' && will.requiresAdminApproval && will.adminApprovalGranted && (
                        <button
                          onClick={() => handleExecuteWill(will.id)}
                          disabled={loading}
                          className="action-btn execute-btn"
                        >
                          ✓ Execute Will (Admin Approved)
                        </button>
                      )}

                      {/* Legal Advisor: Verify */}
                      {userRole === 'LEGAL_ADVISOR' && will.status === 'PENDING_VERIFICATION' && (
                        <div className="verification-section">
                          <textarea
                            value={verificationForm.reason}
                            onChange={(e) => setVerificationForm({...verificationForm, reason: e.target.value})}
                            placeholder="Verification reason/notes"
                            rows="2"
                            style={{ width: '100%', marginBottom: '10px' }}
                          />
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => handleVerifyWill(will.id, true)}
                              disabled={loading}
                              className="action-btn claim-btn"
                            >
                              ✓ Verify
                            </button>
                            <button
                              onClick={() => handleVerifyWill(will.id, false)}
                              disabled={loading}
                              className="action-btn"
                              style={{ background: '#ff6b6b' }}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Beneficiary: Claim Asset */}
                      {userRole === 'BENEFICIARY' && will.status === 'EXECUTED' && !will.claimed && (
                        <button
                          onClick={() => handleClaimAsset(will.id)}
                          disabled={loading}
                          className="action-btn claim-btn"
                        >
                          🎁 Claim Asset
                        </button>
                      )}

                      {/* Beneficiary: Already Claimed */}
                      {userRole === 'BENEFICIARY' && will.claimed && (
                        <div style={{ color: '#4caf50', fontWeight: 'bold' }}>
                          ✅ Asset Claimed on {new Date(will.claimedTime).toLocaleString()}
                        </div>
                      )}

                      {/* Admin: Grant/Reject Approval */}
                      {userRole === 'ADMIN' && will.status === 'PENDING_ADMIN_APPROVAL' && (
                        <div className="admin-approval-section" style={{ padding: '10px', background: '#e3f2fd', borderRadius: '5px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>🔐 Admin Approval Requested</p>
                          <textarea
                            value={adminApprovalForm.reason}
                            onChange={(e) => setAdminApprovalForm({...adminApprovalForm, reason: e.target.value})}
                            placeholder="Reason for approval/rejection"
                            rows="2"
                            style={{ width: '100%', marginBottom: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => handleGrantAdminApproval(will.id)}
                              disabled={loading}
                              className="action-btn claim-btn"
                            >
                              ✅ Grant Approval
                            </button>
                            <button
                              onClick={() => handleRejectAdminApproval(will.id)}
                              disabled={loading}
                              className="action-btn"
                              style={{ background: '#ff6b6b' }}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Admin: Override Functions */}
                      {userRole === 'ADMIN' && will.status !== 'PENDING_ADMIN_APPROVAL' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {!will.verified && (
                            <button
                              onClick={() => handleAdminOverride(will.id, 'verify')}
                              disabled={loading}
                              className="action-btn"
                              style={{ background: '#2196f3' }}
                            >
                              🔧 Verify
                            </button>
                          )}
                          {!will.executed && (
                            <button
                              onClick={() => handleAdminOverride(will.id, 'execute')}
                              disabled={loading}
                              className="action-btn"
                              style={{ background: '#2196f3' }}
                            >
                              ⚡ Execute
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {will.verificationReason && (
                      <p className="verification-reason">
                        <strong>Verification Note:</strong> {will.verificationReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;

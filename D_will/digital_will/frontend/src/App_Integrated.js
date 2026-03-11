import React, { useState, useEffect } from 'react';
import './App.css';
import digitalWillService from './services/DigitalWillService';
import WalletConnect from './components/WalletConnect';
import UserDashboard from './components/UserDashboard';
import WillManager from './components/WillManager';

function App() {
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Initialize Web3 connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (window.ethereum && digitalWillService.isConnected()) {
          setConnected(true);
          setUserAddress(digitalWillService.getAddress());
          await loadUserData();
        }
      } catch (err) {
        console.log('Not connected yet');
      }
    };
    checkConnection();
  }, []);

  // Connect wallet
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await digitalWillService.initialize();
      setConnected(true);
      setUserAddress(digitalWillService.getAddress());
      await loadUserData();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load user data
  const loadUserData = async () => {
    try {
      const address = digitalWillService.getAddress();
      const userData = await digitalWillService.getUser(address);
      setUser(userData);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  // Register user
  const handleRegisterUser = async (roleNumber) => {
    setLoading(true);
    setError(null);
    try {
      await digitalWillService.registerUser(roleNumber);
      await loadUserData();
      alert('✅ User registered successfully!');
    } catch (err) {
      setError(err.message);
      alert('❌ Registration failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔗 Digital Will - Blockchain Estate Management</h1>
        <div className="header-info">
          {connected ? (
            <div className="connected-info">
              <span>✅ Connected: {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</span>
              {user && user.isActive && (
                <span>📝 Role: {['', 'Owner', 'Beneficiary', 'Legal Advisor', 'Admin', 'Emergency Contact', 'Arbiter'][user.role]}</span>
              )}
            </div>
          ) : (
            <button className="btn-primary" onClick={handleConnect} disabled={loading}>
              {loading ? '⏳ Connecting...' : '🔌 Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-message">❌ {error}</div>}

      {connected ? (
        <div className="app-container">
          {user && user.isActive ? (
            <>
              <nav className="tabs">
                <button 
                  className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className={`tab ${activeTab === 'wills' ? 'active' : ''}`}
                  onClick={() => setActiveTab('wills')}
                >
                  📋 Will Manager
                </button>
              </nav>

              <div className="tab-content">
                {activeTab === 'dashboard' && (
                  <UserDashboard 
                    user={user} 
                    onRefresh={loadUserData}
                    loading={loading}
                  />
                )}
                {activeTab === 'wills' && (
                  <WillManager 
                    userAddress={userAddress}
                    onRefresh={loadUserData}
                    loading={loading}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="register-section">
              <h2>👤 Register Your Account</h2>
              <p>Select your role to get started:</p>
              <div className="role-buttons">
                <button 
                  className="btn-role"
                  onClick={() => handleRegisterUser(1)}
                  disabled={loading}
                >
                  👤 Will Owner
                </button>
                <button 
                  className="btn-role"
                  onClick={() => handleRegisterUser(2)}
                  disabled={loading}
                >
                  💰 Beneficiary
                </button>
                <button 
                  className="btn-role"
                  onClick={() => handleRegisterUser(3)}
                  disabled={loading}
                >
                  ⚖️ Legal Advisor
                </button>
              </div>
              {loading && <p>⏳ Registering...</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>Welcome to Digital Will</h2>
            <p>Secure, immutable, and automated estate management on the blockchain.</p>
            
            <div className="features">
              <div className="feature">
                <h3>🔒 Secure</h3>
                <p>Your will is stored on the blockchain with military-grade encryption.</p>
              </div>
              <div className="feature">
                <h3>⚡ Automated</h3>
                <p>Chainlink automation executes conditions like inactivity checks daily.</p>
              </div>
              <div className="feature">
                <h3>📜 Immutable</h3>
                <p>Once verified, your will cannot be tampered with or lost.</p>
              </div>
              <div className="feature">
                <h3>🎯 Transparent</h3>
                <p>All transactions are recorded and verified on the blockchain.</p>
              </div>
            </div>

            <button 
              className="btn-primary btn-large"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? '⏳ Connecting...' : '🚀 Get Started'}
            </button>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>🔗 Ethereum Mainnet | 📱 MetaMask Required | 🛡️ Audited Smart Contract</p>
      </footer>
    </div>
  );
}

export default App;

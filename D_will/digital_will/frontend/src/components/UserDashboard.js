import React, { useState, useEffect } from 'react';
import digitalWillService from '../services/DigitalWillService';

function UserDashboard({ user, onRefresh, loading }) {
  const [wills, setWills] = useState([]);
  const [beneficiaryWills, setBeneficiaryWills] = useState([]);
  const [loadingWills, setLoadingWills] = useState(false);

  useEffect(() => {
    loadWills();
  }, [user]);

  const loadWills = async () => {
    setLoadingWills(true);
    try {
      const userAddress = digitalWillService.getAddress();
      
      // Load wills created by user
      const userWills = await digitalWillService.getUserWills(userAddress);
      setWills(userWills);

      // Load wills where user is beneficiary
      const benWills = await digitalWillService.getBeneficiaryWills(userAddress);
      setBeneficiaryWills(benWills);
    } catch (err) {
      console.error('Error loading wills:', err);
    } finally {
      setLoadingWills(false);
    }
  };

  const handleLogActivity = async () => {
    try {
      await digitalWillService.logUserActivity();
      alert('✅ Activity logged');
      onRefresh();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const daysSinceLogin = user.lastLogin 
    ? Math.floor((Date.now() / 1000 - user.lastLogin) / (24 * 60 * 60))
    : 0;

  const roleNames = ['', 'Owner', 'Beneficiary', 'Legal Advisor', 'Admin', 'Emergency Contact', 'Arbiter'];

  return (
    <div className="dashboard">
      <div className="user-info-card">
        <h2>👤 Your Profile</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Role:</span>
            <span className="value">{roleNames[user.role]}</span>
          </div>
          <div className="info-item">
            <span className="label">Status:</span>
            <span className="value">{user.isActive ? '✅ Active' : '❌ Inactive'}</span>
          </div>
          <div className="info-item">
            <span className="label">Days Since Last Login:</span>
            <span className="value">{daysSinceLogin}</span>
          </div>
          <div className="info-item">
            <span className="label">Total Wills:</span>
            <span className="value">{user.willCount || 0}</span>
          </div>
          <div className="info-item">
            <span className="label">Reputation:</span>
            <span className="value">⭐ {user.reputation || 0}</span>
          </div>
          <div className="info-item">
            <span className="label">Registered:</span>
            <span className="value">{new Date(user.registrationTime * 1000).toLocaleDateString()}</span>
          </div>
        </div>

        <button 
          className="btn-primary"
          onClick={handleLogActivity}
          disabled={loading || loadingWills}
        >
          🔄 Log Activity (Update Last Login)
        </button>
      </div>

      <div className="wills-section">
        <h2>📋 Your Wills Created ({wills.length})</h2>
        {wills.length === 0 ? (
          <p>No wills created yet. Go to Will Manager to create one.</p>
        ) : (
          <div className="wills-list">
            {wills.map((willId, idx) => (
              <div key={idx} className="will-item">
                <div className="will-id">Will #{idx + 1}</div>
                <div className="will-hash">{willId.slice(0, 10)}...{willId.slice(-10)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="wills-section">
        <h2>💰 Wills You're Beneficiary Of ({beneficiaryWills.length})</h2>
        {beneficiaryWills.length === 0 ? (
          <p>No wills assigned to you as beneficiary yet.</p>
        ) : (
          <div className="wills-list">
            {beneficiaryWills.map((willId, idx) => (
              <div key={idx} className="will-item beneficiary">
                <div className="will-id">Will #{idx + 1}</div>
                <div className="will-hash">{willId.slice(0, 10)}...{willId.slice(-10)}</div>
                <div className="will-status">⏳ Awaiting conditions</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loadingWills && <p>⏳ Loading wills...</p>}
    </div>
  );
}

export default UserDashboard;

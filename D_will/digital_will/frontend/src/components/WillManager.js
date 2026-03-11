import React, { useState } from 'react';
import digitalWillService from '../services/DigitalWillService';
import { ethers } from 'ethers';

function WillManager({ userAddress, onRefresh, loading }) {
  const [formData, setFormData] = useState({
    beneficiaryAddress: '',
    willHash: '',
    ipfsCID: '',
    lockTimeDays: '365',
    assetValueEth: '0',
  });
  const [submitted, setSubmitted] = useState(false);
  const [txStatus, setTxStatus] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateWill = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!formData.beneficiaryAddress || !formData.willHash || !formData.ipfsCID) {
      alert('❌ Please fill in all fields');
      return;
    }

    if (!ethers.isAddress(formData.beneficiaryAddress)) {
      alert('❌ Invalid beneficiary address');
      return;
    }

    setTxStatus('Processing...');
    setSubmitted(true);

    try {
      // Create will hash if needed
      let willHash = formData.willHash;
      if (!willHash.startsWith('0x')) {
        willHash = ethers.keccak256(ethers.toUtf8Bytes(formData.willHash));
      }

      console.log('Creating will with:', {
        beneficiary: formData.beneficiaryAddress,
        willHash: willHash,
        ipfsCID: formData.ipfsCID,
        lockTimeDays: Number(formData.lockTimeDays),
        assetValue: formData.assetValueEth,
      });

      await digitalWillService.createWill(
        formData.beneficiaryAddress,
        willHash,
        formData.ipfsCID,
        Number(formData.lockTimeDays),
        Number(formData.assetValueEth)
      );

      setTxStatus('✅ Will created successfully!');
      setFormData({
        beneficiaryAddress: '',
        willHash: '',
        ipfsCID: '',
        lockTimeDays: '365',
        assetValueEth: '0',
      });

      setTimeout(() => {
        onRefresh();
        setTxStatus(null);
        setSubmitted(false);
      }, 2000);

    } catch (err) {
      setTxStatus('❌ Error: ' + err.message);
      console.error('Error creating will:', err);
    }
  };

  return (
    <div className="will-manager">
      <div className="form-card">
        <h2>📝 Create New Will</h2>
        <p>Set up your digital will on the blockchain. Your will is encrypted and verified.</p>

        {txStatus && (
          <div className={`status-message ${txStatus.includes('✅') ? 'success' : 'error'}`}>
            {txStatus}
          </div>
        )}

        <form onSubmit={handleCreateWill} className="will-form">
          <div className="form-group">
            <label>💰 Beneficiary Address *</label>
            <input
              type="text"
              name="beneficiaryAddress"
              placeholder="0x..."
              value={formData.beneficiaryAddress}
              onChange={handleInputChange}
              required
              disabled={submitted && !txStatus?.includes('❌')}
            />
            <small>The address that will receive your assets</small>
          </div>

          <div className="form-group">
            <label>📜 Will Content Hash *</label>
            <input
              type="text"
              name="willHash"
              placeholder="Enter will content or document hash (will be hashed if not already)"
              value={formData.willHash}
              onChange={handleInputChange}
              required
              disabled={submitted && !txStatus?.includes('❌')}
            />
            <small>Plain text content (will be encrypted with SHA-256) or a hex hash (0x...)</small>
          </div>

          <div className="form-group">
            <label>📁 IPFS CID *</label>
            <input
              type="text"
              name="ipfsCID"
              placeholder="QmXxxx... (IPFS hash of encrypted document)"
              value={formData.ipfsCID}
              onChange={handleInputChange}
              required
              disabled={submitted && !txStatus?.includes('❌')}
            />
            <small>IPFS CID where encrypted will document is stored</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>⏱️ Lock Time (Days)</label>
              <input
                type="number"
                name="lockTimeDays"
                value={formData.lockTimeDays}
                onChange={handleInputChange}
                min="30"
                disabled={submitted && !txStatus?.includes('❌')}
              />
              <small>Minimum days before will can be executed (min 30 days)</small>
            </div>

            <div className="form-group">
              <label>💎 Asset Value (ETH)</label>
              <input
                type="number"
                name="assetValueEth"
                value={formData.assetValueEth}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                disabled={submitted && !txStatus?.includes('❌')}
              />
              <small>Total estate value in ETH (for reference)</small>
            </div>
          </div>

          <button 
            type="submit"
            className="btn-primary btn-large"
            disabled={submitted || loading}
          >
            {submitted ? '⏳ Creating...' : '✍️ Create Will'}
          </button>
        </form>
      </div>

      <div className="info-card">
        <h3>📋 What Happens Next?</h3>
        <ol>
          <li>Your will is encrypted and stored on IPFS</li>
          <li>Will hash is recorded on blockchain</li>
          <li>You request verification from a legal advisor</li>
          <li>Legal advisor reviews and approves</li>
          <li>Admin approves and locks the will</li>
          <li>Conditions are checked automatically via Chainlink</li>
          <li>When conditions met, beneficiary can claim</li>
        </ol>
      </div>

      <div className="info-card">
        <h3>🔒 Security Features</h3>
        <ul>
          <li>✅ AES-256-CBC encryption for document</li>
          <li>✅ SHA-256 hashing for integrity</li>
          <li>✅ Immutable blockchain record</li>
          <li>✅ Multi-signature verification required</li>
          <li>✅ Automated condition checking via Chainlink</li>
        </ul>
      </div>

      <div className="info-card">
        <h3>📊 Current Network</h3>
        <p><strong>Contract:</strong> 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707</p>
        <p><strong>Network:</strong> Hardhat Localhost (Port 8545)</p>
        <p><strong>Status:</strong> ✅ Connected and Ready</p>
      </div>
    </div>
  );
}

export default WillManager;

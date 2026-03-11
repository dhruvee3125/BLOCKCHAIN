import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Import the contract ABI
import DigitalWillABI from '../../blockchain/artifacts/contracts/DigitalWill.sol/DigitalWill.json';

function App() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Connect wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask extension.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const userAccount = accounts[0];
      setAccount(userAccount);

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instance
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        DigitalWillABI.abi,
        signer
      );

      setContract(contractInstance);
      setConnected(true);
    } catch (err) {
      setError(err.message);
      console.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setConnected(false);
    setAccount('');
    setContract(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>⛓️ Digital Will DApp</h1>
        
        <div className="wallet-section">
          {!connected ? (
            <button 
              onClick={connectWallet} 
              disabled={loading}
              className="connect-btn"
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          ) : (
            <div className="connected">
              <p>Connected: <strong>{account.slice(0, 6)}...{account.slice(-4)}</strong></p>
              <button onClick={disconnectWallet} className="disconnect-btn">
                Disconnect
              </button>
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {connected && contract && (
          <div className="contract-info">
            <h2>Contract Connected</h2>
            <p>Address: {CONTRACT_ADDRESS}</p>
            <p>Ready to interact with your Digital Will</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;

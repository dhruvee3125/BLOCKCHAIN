import React from 'react';

function WalletConnect({ onConnect, loading }) {
  return (
    <div className="wallet-connect">
      <h2>🔌 Connect Your Wallet</h2>
      <p>Connect MetaMask to interact with the Digital Will smart contract.</p>
      <button 
        className="btn-primary"
        onClick={onConnect}
        disabled={loading}
      >
        {loading ? '⏳ Connecting...' : '🦊 Connect MetaMask'}
      </button>
    </div>
  );
}

export default WalletConnect;

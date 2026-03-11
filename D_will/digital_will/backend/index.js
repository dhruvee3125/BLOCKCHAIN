import { ethers } from 'ethers';

// Contract address from deployment
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Contract ABI (Application Binary Interface)
// Import from the compiled contract artifacts
import DigitalWillABI from '../blockchain/artifacts/contracts/DigitalWill.sol/DigitalWill.json' assert { type: 'json' };

async function main() {
  // Connect to Hardhat local network
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  
  // Get the first signer (account with funds for transactions)
  const signer = await provider.getSigner(0);
  
  // Create contract instance
  const will = new ethers.Contract(CONTRACT_ADDRESS, DigitalWillABI.abi, signer);
  
  console.log('Connected to DigitalWill contract at:', CONTRACT_ADDRESS);
  
  // Example: Read contract data
  try {
    const beneficiary = await will.beneficiary();
    console.log('Beneficiary:', beneficiary);
  } catch (error) {
    console.error('Error reading contract:', error.message);
  }
}

main().catch(console.error);

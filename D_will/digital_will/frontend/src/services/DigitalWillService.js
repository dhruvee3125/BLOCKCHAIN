import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import DigitalWillABI from '../abi/DigitalWill_Full_Blockchain.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afccb33f7461d5f9f006';

/**
 * DigitalWillService - Web3 integration service for blockchain interactions
 * All blockchain operations go through this service
 */
class DigitalWillService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.userAddress = null;
        this.connected = false;
    }

    /**
     * Initialize Web3 connection
     */
    async initialize() {
        console.log('🔌 Initializing Web3 connection...');
        
        if (!window.ethereum) {
            throw new Error('MetaMask not installed. Please install MetaMask extension.');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.userAddress = accounts[0];

            // Create contract instance
            this.contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                DigitalWillABI,
                this.signer
            );

            this.connected = true;
            console.log(`✅ Connected to wallet: ${this.userAddress}`);

            return true;
        } catch (error) {
            if (error.code === 4001) {
                console.error('User rejected connection');
            } else {
                console.error('Connection error:', error.message);
            }
            throw error;
        }
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected && this.userAddress;
    }

    /**
     * Get current wallet address
     */
    getAddress() {
        return this.userAddress;
    }

    // ===== USER MANAGEMENT =====

    /**
     * Register user on blockchain
     * @param {number} roleNumber - Role enum (1=Owner, 2=Beneficiary, etc.)
     */
    async registerUser(roleNumber) {
        console.log(`📝 Registering user with role ${roleNumber}...`);
        
        try {
            const tx = await this.contract.registerUser(roleNumber);
            console.log(`⏳ Transaction: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`✅ User registered!`);
            
            return receipt;
        } catch (error) {
            console.error('Registration error:', error.message);
            throw error;
        }
    }

    /**
     * Get user information
     * @param {string} address - User address
     */
    async getUser(address) {
        try {
            return await this.contract.getUser(address);
        } catch (error) {
            console.error('Get user error:', error.message);
            throw error;
        }
    }

    /**
     * Log user activity (update last login)
     */
    async logUserActivity() {
        console.log('📍 Logging user activity...');
        
        try {
            const tx = await this.contract.logUserActivity();
            await tx.wait();
            console.log('✅ Activity logged');
            
            return tx;
        } catch (error) {
            console.error('Activity log error:', error.message);
            throw error;
        }
    }

    // ===== WILL MANAGEMENT =====

    /**
     * Create new will
     * @param {string} beneficiaryAddress - Beneficiary address
     * @param {string} willHash - SHA256 hash of will
     * @param {string} ipfsCID - IPFS content ID
     * @param {number} lockTimeInDays - Days until executable
     * @param {string} assetValueInEth - Asset value in ETH
     */
    async createWill(beneficiaryAddress, willHash, ipfsCID, lockTimeInDays, assetValueInEth) {
        console.log('✍️  Creating will...');
        
        try {
            // Convert days to seconds
            const lockTimeInSeconds = lockTimeInDays * 24 * 60 * 60;
            
            // Convert ETH to Wei
            const assetValue = ethers.utils.parseEther(assetValueInEth.toString());

            const tx = await this.contract.createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTimeInSeconds,
                assetValue
            );

            console.log(`⏳ Transaction: ${tx.hash}`);
            const receipt = await tx.wait();
            
            // Extract will ID from event
            const event = receipt.events.find(e => e.event === 'WillCreated');
            const willId = event?.args?.wellId;
            
            console.log(`✅ Will created! ID: ${willId}`);
            
            return { receipt, willId };
        } catch (error) {
            console.error('Will creation error:', error.message);
            throw error;
        }
    }

    /**
     * Get will details
     * @param {string} willId - Will ID
     */
    async getWill(willId) {
        try {
            return await this.contract.getWill(willId);
        } catch (error) {
            console.error('Get will error:', error.message);
            throw error;
        }
    }

    /**
     * Get all wills created by user
     */
    async getUserWills(address) {
        try {
            return await this.contract.getUserWills(address);
        } catch (error) {
            console.error('Get user wills error:', error.message);
            throw error;
        }
    }

    /**
     * Get all wills for beneficiary
     */
    async getBeneficiaryWills(address) {
        try {
            return await this.contract.getBeneficiaryWills(address);
        } catch (error) {
            console.error('Get beneficiary wills error:', error.message);
            throw error;
        }
    }

    // ===== CONDITION MANAGEMENT =====

    /**
     * Add condition to will
     * @param {string} willId - Will ID
     * @param {number} conditionType - Type of condition
     * @param {number} conditionValue - Condition value
     * @param {string} metadata - Additional metadata
     */
    async addCondition(willId, conditionType, conditionValue, metadata = '') {
        console.log(`➕ Adding condition type ${conditionType}...`);
        
        try {
            const tx = await this.contract.addCondition(
                willId,
                conditionType,
                conditionValue,
                metadata
            );

            console.log(`⏳ Transaction: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log('✅ Condition added');
            
            return receipt;
        } catch (error) {
            console.error('Add condition error:', error.message);
            throw error;
        }
    }

    /**
     * Get all conditions for a will
     */
    async getWillConditions(willId) {
        try {
            return await this.contract.getWillConditions(willId);
        } catch (error) {
            console.error('Get conditions error:', error.message);
            throw error;
        }
    }

    /**
     * Check all conditions for a will
     */
    async checkAllConditions(willId) {
        console.log('🔍 Checking all conditions...');
        
        try {
            const tx = await this.contract.checkAllConditions(willId);
            const receipt = await tx.wait();
            console.log('✅ Conditions checked');
            
            return receipt;
        } catch (error) {
            console.error('Condition check error:', error.message);
            throw error;
        }
    }

    // ===== VERIFICATION WORKFLOW =====

    /**
     * Request verification from legal advisor
     */
    async requestVerification(willId, legalAdvisorAddress) {
        console.log('📨 Requesting verification...');
        
        try {
            const tx = await this.contract.requestVerification(willId, legalAdvisorAddress);
            console.log(`⏳ Transaction: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ Verification requested');
            
            return receipt;
        } catch (error) {
            console.error('Request verification error:', error.message);
            throw error;
        }
    }

    /**
     * Approve will as legal advisor
     */
    async approveByLegalAdvisor(willId, documentHash, comments) {
        console.log('✅ Approving will as legal advisor...');
        
        try {
            const tx = await this.contract.approveByLegalAdvisor(
                willId,
                documentHash,
                comments
            );

            console.log(`⏳ Transaction: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log('✅ Will approved by legal advisor');
            
            return receipt;
        } catch (error) {
            console.error('Legal advisor approval error:', error.message);
            throw error;
        }
    }

    /**
     * Reject will as legal advisor
     */
    async rejectByLegalAdvisor(willId, reason) {
        console.log('❌ Rejecting will as legal advisor...');
        
        try {
            const tx = await this.contract.rejectByLegalAdvisor(wellId, reason);
            const receipt = await tx.wait();
            console.log('✅ Will rejected');
            
            return receipt;
        } catch (error) {
            console.error('Legal advisor rejection error:', error.message);
            throw error;
        }
    }

    // ===== ADMIN APPROVAL =====

    /**
     * Approve will as admin
     */
    async approveByAdmin(willId, comments, feeInEther = 0.01) {
        console.log(`💰 Approving will as admin (fee: ${feeInEther} ETH)...`);
        
        try {
            const tx = await this.contract.approveByAdmin(
                willId,
                comments,
                { value: ethers.utils.parseEther(feeInEther.toString()) }
            );

            console.log(`⏳ Transaction: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log('✅ Will approved by admin');
            
            return receipt;
        } catch (error) {
            console.error('Admin approval error:', error.message);
            throw error;
        }
    }

    /**
     * Reject will as admin
     */
    async rejectByAdmin(willId, reason) {
        console.log('❌ Rejecting will as admin...');
        
        try {
            const tx = await this.contract.rejectByAdmin(willId, reason);
            const receipt = await tx.wait();
            console.log('✅ Will rejected');
            
            return receipt;
        } catch (error) {
            console.error('Admin rejection error:', error.message);
            throw error;
        }
    }

    // ===== ASSET CLAIMING =====

    /**
     * Claim assets as beneficiary
     */
    async claimAssets(willId) {
        console.log('🎁 Claiming assets...');
        
        try {
            const tx = await this.contract.claimAssets(willId);
            console.log(`⏳ Transaction: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ Assets claimed successfully!');
            
            return receipt;
        } catch (error) {
            console.error('Asset claim error:', error.message);
            throw error;
        }
    }

    // ===== EMERGENCY & DISPUTE =====

    /**
     * Report death (emergency contact)
     */
    async reportDeath(willId) {
        console.log('💔 Reporting death...');
        
        try {
            const tx = await this.contract.reportDeath(willId);
            const receipt = await tx.wait();
            console.log('✅ Death reported');
            
            return receipt;
        } catch (error) {
            console.error('Report death error:', error.message);
            throw error;
        }
    }

    /**
     * File dispute
     */
    async fileDispute(willId, reason) {
        console.log('⚖️  Filing dispute...');
        
        try {
            const tx = await this.contract.fileDispute(willId, reason);
            const receipt = await tx.wait();
            console.log('✅ Dispute filed');
            
            return receipt;
        } catch (error) {
            console.error('File dispute error:', error.message);
            throw error;
        }
    }

    // ===== EVENT LISTENERS =====

    /**
     * Listen to WillCreated event
     */
    onWillCreated(callback) {
        this.contract.on('WillCreated', (...args) => {
            console.log('📢 WillCreated event:', args);
            callback(args);
        });
    }

    /**
     * Listen to WillVerified event
     */
    onWillVerified(callback) {
        this.contract.on('WillVerified', (...args) => {
            console.log('📢 WillVerified event:', args);
            callback(args);
        });
    }

    /**
     * Listen to AdminApproved event
     */
    onAdminApproved(callback) {
        this.contract.on('AdminApproved', (...args) => {
            console.log('📢 AdminApproved event:', args);
            callback(args);
        });
    }

    /**
     * Listen to AssetClaimed event
     */
    onAssetClaimed(callback) {
        this.contract.on('AssetClaimed', (...args) => {
            console.log('📢 AssetClaimed event:', args);
            callback(args);
        });
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.contract.removeAllListeners();
    }
}

// Create singleton instance
const digitalWillService = new DigitalWillService();

export default digitalWillService;

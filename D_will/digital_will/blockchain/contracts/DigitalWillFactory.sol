// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DigitalWill.sol";

/**
 * @title DigitalWillFactory
 * @dev Factory contract for creating and managing digital wills with proper on-chain/off-chain separation
 * 
 * RESPONSIBILITY:
 * - Create new will contracts (stores only hash on-chain)
 * - Track will ownership and status
 * - Coordinate with off-chain backend for sensitivedata (asset details, personal info, documents)
 */
contract DigitalWillFactory {
    
    // Track off-chain data references
    struct WillReference {
        bytes32 willHash;               // Hash of full will data (verifiable)
        string ipfsCID;                 // Encrypted document on IPFS
        uint256 createdAt;              // Creation timestamp
        address creator;                // Creator/owner
    }

    // ON-CHAIN: Only references to off-chain data (hashes and CIDs)
    mapping(address => WillReference) public willReferences;

    // Events for transaction records (stored on-chain)
    event WillCreated(
        address indexed creator,
        address indexed willContract,
        address indexed beneficiary,
        bytes32 willHash,
        string ipfsCID,
        uint256 timestamp
    );

    event WillStatusChanged(
        address indexed willContract,
        string status,
        uint256 timestamp
    );

    event OffChainDataLinked(
        address indexed willContract,
        bytes32 willHash,
        string ipfsCID,
        uint256 timestamp
    );

    // State variables
    mapping(address => address[]) public userWills;
    address[] public allWills;
    mapping(address => bool) public isWill;
    mapping(address => WillReference) public willHashReferences;

    /**
     * @dev Create a new will contract
     * Only hash and IPFS CID are passed (not sensitive asset details)
     * 
     * @param _beneficiary Beneficiary address
     * @param _willHash Hash of the full will document (for verification)
     * @param _ipfsCID IPFS CID of encrypted will document (off-chain storage)
     * @param _lockTime Time lock before claiming
     * @return willAddress Address of created will contract
     */
    function createWill(
        address _beneficiary,
        bytes32 _willHash,
        string memory _ipfsCID,
        uint256 _lockTime
    ) 
        external 
        returns (address) 
    {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_willHash != bytes32(0), "Invalid will hash");
        require(bytes(_ipfsCID).length > 0, "IPFS CID required");

        // Create new will contract (stores only hash on-chain)
        DigitalWill newWill = new DigitalWill(
            _beneficiary,
            _willHash,
            _ipfsCID
        );

        address willAddress = address(newWill);

        // Store off-chain reference
        willReferences[willAddress] = WillReference({
            willHash: _willHash,
            ipfsCID: _ipfsCID,
            createdAt: block.timestamp,
            creator: msg.sender
        });

        // Track will
        userWills[msg.sender].push(willAddress);
        allWills.push(willAddress);
        isWill[willAddress] = true;

        // Emit event with hash (not sensitive data)
        emit WillCreated(
            msg.sender,
            willAddress,
            _beneficiary,
            _willHash,
            _ipfsCID,
            block.timestamp
        );

        // Emit linking event for off-chain backend
        emit OffChainDataLinked(
            willAddress,
            _willHash,
            _ipfsCID,
            block.timestamp
        );

        return willAddress;
    }

    /**
     * @dev Update IPFS CID (if document is updated)
     */
    function updateIPFSCID(
        address _willAddress,
        string memory _newIPFSCID,
        bytes32 _newWillHash
    ) 
        external 
    {
        require(isWill[_willAddress], "Not a will contract");
        require(willReferences[_willAddress].creator == msg.sender, "Unauthorized");

        willReferences[_willAddress].ipfsCID = _newIPFSCID;
        willReferences[_willAddress].willHash = _newWillHash;

        emit OffChainDataLinked(
            _willAddress,
            _newWillHash,
            _newIPFSCID,
            block.timestamp
        );
    }

    /**
     * @dev Get will reference (hash and IPFS CID only)
     */
    function getWillReference(address _willAddress) 
        external 
        view 
        returns (WillReference memory) 
    {
        require(isWill[_willAddress], "Not a will contract");
        return willReferences[_willAddress];
    }

    /**
     * @dev Get all wills for a user
     */
    function getUserWills(address _user) 
        external 
        view 
        returns (address[] memory) 
    {
        return userWills[_user];
    }

    /**
     * @dev Get all wills
     */
    function getAllWills() 
        external 
        view 
        returns (address[] memory) 
    {
        return allWills;
    }

    /**
     * @dev Check if address is a will contract
     */
    function isWillContract(address _address) 
        external 
        view 
        returns (bool) 
    {
        return isWill[_address];
    }

    /**
     * @dev Get user's will count
     */
    function getUserWillCount(address _user) 
        external 
        view 
        returns (uint256) 
    {
        return userWills[_user].length;
    }

    /**
     * @dev Get total wills count
     */
    function getTotalWillsCount() 
        external 
        view 
        returns (uint256) 
    {
        return allWills.length;
    }
}

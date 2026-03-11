// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DigitalWill
 * @dev On-chain digital will contract - stores only hash and verification status
 * Sensitive data (asset details, personal info) stored off-chain in encrypted IPFS
 */
contract DigitalWill {

    // ON-CHAIN: Only hash, status, and transaction records
    address public owner;
    address public beneficiary;
    bytes32 public willHash;           // Hash of the full will data
    string public ipfsCID;              // IPFS CID for encrypted document
    bool public executed;
    bool public verified;
    uint256 public createdAt;
    uint256 public executedAt;

    // Events for transaction records
    event WillCreated(
        address indexed owner,
        address indexed beneficiary,
        bytes32 willHash,
        string ipfsCID,
        uint256 timestamp
    );

    event WillVerified(
        address indexed verifier,
        bytes32 willHash,
        uint256 timestamp
    );

    event WillExecuted(
        address indexed owner,
        bytes32 willHash,
        uint256 timestamp
    );

    event AssetClaimed(
        address indexed beneficiary,
        bytes32 willHash,
        uint256 timestamp
    );

    constructor(
        address _beneficiary,
        bytes32 _willHash,
        string memory _ipfsCID
    ) {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_willHash != bytes32(0), "Invalid will hash");
        require(bytes(_ipfsCID).length > 0, "IPFS CID required");

        owner = msg.sender;
        beneficiary = _beneficiary;
        willHash = _willHash;
        ipfsCID = _ipfsCID;
        executed = false;
        verified = false;
        createdAt = block.timestamp;

        emit WillCreated(
            owner,
            beneficiary,
            willHash,
            ipfsCID,
            block.timestamp
        );
    }

    /**
     * @dev Verify the will (called by legal advisor or verification authority)
     */
    function verifyWill(address _verifier) public {
        require(msg.sender == owner || msg.sender == _verifier, "Unauthorized");
        require(!verified, "Already verified");

        verified = true;

        emit WillVerified(_verifier, willHash, block.timestamp);
    }

    /**
     * @dev Execute the will (only owner can execute)
     */
    function executeWill() public {
        require(msg.sender == owner, "Only owner can execute");
        require(!executed, "Already executed");

        executed = true;
        executedAt = block.timestamp;

        emit WillExecuted(owner, willHash, block.timestamp);
    }

    /**
     * @dev Claim asset (only beneficiary can call after execution)
     */
    function claimAsset() public {
        require(executed, "Will not executed yet");
        require(msg.sender == beneficiary, "Not beneficiary");

        emit AssetClaimed(beneficiary, willHash, block.timestamp);
    }

    /**
     * @dev Get will metadata (on-chain only)
     */
    function getWillMetadata() public view returns (
        address,
        address,
        bytes32,
        string memory,
        bool,
        bool,
        uint256
    ) {
        return (
            owner,
            beneficiary,
            willHash,
            ipfsCID,
            executed,
            verified,
            createdAt
        );
    }
}
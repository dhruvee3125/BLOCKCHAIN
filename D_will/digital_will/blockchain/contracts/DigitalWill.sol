// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DigitalWill {

    address public owner;
    address public beneficiary;
    string public asset;
    bool public executed;

    constructor(address _beneficiary, string memory _asset) {
        owner = msg.sender;
        beneficiary = _beneficiary;
        asset = _asset;
        executed = false;
    }

    function executeWill() public {
        require(msg.sender == owner, "Only owner can execute");
        executed = true;
    }

    function claimAsset() public view returns(string memory) {
        require(executed == true, "Will not executed yet");
        require(msg.sender == beneficiary, "Not beneficiary");
        return asset;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TraitKit
 * @dev A simple contract to store string-based trait kits for users on-chain.
 */
contract TraitKit {
    
    mapping(address => string[]) private userTraitKits;

    
    event TraitKitMinted(address indexed owner, string traitKitData, uint256 timestamp);

    
    function mintTraitKit(string memory _traitKitData) public {
       
        userTraitKits[msg.sender].push(_traitKitData);

        
        emit TraitKitMinted(msg.sender, _traitKitData, block.timestamp);
    }

    
    function getTraitKits(address _owner) public view returns (string[] memory) {
        return userTraitKits[_owner];
    }
}
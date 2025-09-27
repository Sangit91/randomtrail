// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TraitKitNFT
 * @author Tử Vận
 * @notice Contract cho phép bất kỳ ai cũng có thể mint (Public Mint).
 */
contract TraitKitNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    constructor(address initialOwner)
        ERC721("TraitKit NFT", "TKN")
        Ownable(initialOwner)
    {}

    /**
     * @notice Mint một NFT mới. Bất kỳ ai cũng có thể gọi hàm này.
     * @dev Đã xóa bỏ modifier 'onlyOwner' để cho phép public mint.
     */
    function safeMint(address to, string memory uri) public { // <<<< THAY ĐỔI QUAN TRỌNG Ở ĐÂY
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    
    function getTokensOfOwner(address owner) public view returns (string[] memory) {
        uint256 ownerTokenCount = balanceOf(owner);
        if (ownerTokenCount == 0) {
            return new string[](0);
        }
        string[] memory uris = new string[](ownerTokenCount);
        for (uint256 i = 0; i < ownerTokenCount; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            uris[i] = tokenURI(tokenId);
        }
        return uris;
    }

    // Các hàm Override Bắt buộc cho OpenZeppelin v5.x
    // ==============================================================================

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
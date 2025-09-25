// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TraitKitNFT
 * @dev An ERC721 contract to mint NFTs with on-chain traits.
 */
contract TraitKitNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Mapping from token ID to its metadata URI
    mapping(uint264 => string) private _tokenURIs;

    // Base URI for metadata (optional, can be useful)
    string public baseURI;

    constructor() ERC721("TraitKit NFT", "TKN") {}

    /**
     * @dev Mints a new NFT and assigns it to the `to` address.
     * The metadata URI is stored on-chain.
     */
    function safeMint(address to, string memory uri) public {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev Sets the metadata URI for a given token ID.
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721URIStorage: URI set for nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev Returns the metadata URI for a token.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }
    
    /**
     * @dev Returns all token URIs owned by a specific address.
     * Useful for frontend to display the collection.
     */
    function getTokensOfOwner(address owner) public view returns (string[] memory) {
        uint256 ownerTokenCount = balanceOf(owner);
        if (ownerTokenCount == 0) {
            return new string[](0);
        }

        string[] memory uris = new string[](ownerTokenCount);
        uint256 currentIndex = 0;
        uint256 totalTokens = _tokenIdCounter.current();

        for (uint256 i = 1; i <= totalTokens; i++) {
            if (ownerOf(i) == owner) {
                uris[currentIndex] = tokenURI(i);
                currentIndex++;
            }
        }
        return uris;
    }
}
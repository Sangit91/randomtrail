// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import các contract cần thiết từ OpenZeppelin v4.9.3
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/token/ERC721/ERC721.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/utils/Counters.sol";

/**
 * @title TraitKitNFT (Chuẩn Mực V4)
 * @author Tử Vận (dựa trên OpenZeppelin v4)
 * @dev Contract sử dụng ERC721Enumerable để quản lý token một cách tự động và chính xác.
 *      Tương thích hoàn toàn với OpenZeppelin v4.9.3.
 */
contract TraitKitNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 public constant TOKENS_REQUIRED_FOR_BLEND = 3;

    // Constructor không cần tham số cho Ownable vì v4.9.3 tự động dùng msg.sender
    constructor() ERC721("TraitKit NFT", "TKN") {}

    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function blendAndMint(
        address user,
        uint256[] calldata tokenIdsToBurn,
        string memory newUri
    ) public onlyOwner {
        require(
            tokenIdsToBurn.length == TOKENS_REQUIRED_FOR_BLEND,
            "Blend: Invalid number of tokens provided"
        );

        for (uint256 i = 0; i < tokenIdsToBurn.length; i++) {
            // ERC721Enumerable tự động cập nhật khi token bị đốt
            require(ownerOf(tokenIdsToBurn[i]) == user, "Blend: User does not own token");
            _burn(tokenIdsToBurn[i]);
        }

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(user, newTokenId);
        _setTokenURI(newTokenId, newUri);
    }

    // --- CÁC HÀM TRUY VẤN ĐƯỢC ĐƠN GIẢN HÓA NHỜ ERC721ENUMERABLE ---

    function getTokensOfOwner(address owner) public view returns (string[] memory) {
        uint256 ownerTokenCount = balanceOf(owner);
        string[] memory uris = new string[](ownerTokenCount);
        for (uint256 i = 0; i < ownerTokenCount; i++) {
            // tokenOfOwnerByIndex là hàm có sẵn của ERC721Enumerable
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            uris[i] = tokenURI(tokenId);
        }
        return uris;
    }

    function getAllTokenURIs() public view returns (string[] memory) {
        uint256 total = totalSupply(); // totalSupply của ERC721Enumerable trả về số token hiện có
        string[] memory uris = new string[](total);
        for (uint256 i = 0; i < total; i++) {
            // tokenByIndex là hàm có sẵn của ERC721Enumerable
            uint256 tokenId = tokenByIndex(i);
            uris[i] = tokenURI(tokenId);
        }
        return uris;
    }

    // --- CÁC HÀM OVERRIDE BẮT BUỘC KHI SỬ DỤNG NHIỀU EXTENSION ---

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
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
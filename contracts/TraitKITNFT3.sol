// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Nhập các contract tiêu chuẩn từ OpenZeppelin
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title TraitKitNFT (Final Version)
 * @dev Contract hoàn chỉnh, đã sửa lỗi biên dịch và lỗi logic on-chain.
 */
contract TraitKitNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    constructor(address initialOwner)
        ERC721("TraitKit NFT", "TKN")
        Ownable(initialOwner)
    {}

    /**
     * @dev Hàm để mint một NFT mới. Chỉ có chủ sở hữu contract mới có thể gọi.
     */
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /**
     * @notice Lấy danh sách tất cả các token URI của một địa chỉ ví cụ thể.
     * @dev ĐÂY LÀ PHIÊN BẢN AN TOÀN DO BẠN CUNG CẤP.
     */
    function getTokensOfOwner(address owner) public view returns (string[] memory) {
    uint256 ownerTokenCount = 0;
    uint256 total = _tokenIdCounter.current();

    for (uint256 i = 0; i < total; i++) {
        if (ownerOf(i) != address(0) && ownerOf(i) == owner) {
            ownerTokenCount++;
        }
    }

    if (ownerTokenCount == 0) {
        return new string[](0);
    }

    string[] memory uris = new string[](ownerTokenCount);
    uint256 uriIndex = 0;
    for (uint256 i = 0; i < total; i++) {
        if (ownerOf(i) != address(0) && ownerOf(i) == owner) {
            uris[uriIndex] = tokenURI(i);
            uriIndex++;
        }
    }
    return uris;
}

    // Các hàm Override bắt buộc khi kết hợp các module
    // ==============================================================================

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
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MeloSeed is ERC1155, ERC1155Burnable, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;

    struct TokenData {
        uint256 seed;
        string imageUrl;
        string title;
    }

    mapping(uint256 => TokenData) private _tokenData;
    mapping(uint256 => string) private _tokenURIs;

    string public name = "MeloSeed";
    string public symbol = "MELO";

    constructor() ERC1155("") Ownable(msg.sender) {}

    function mint(
        address account,
        uint256 amount,
        uint256 seed,
        string memory imageUrl,
        string memory title,
        bytes memory data
    ) public {
        uint256 tokenId = _nextTokenId++;
        _mint(account, tokenId, amount, data);
        _setTokenData(tokenId, seed, imageUrl, title);
    }

    function _setTokenData(uint256 tokenId, uint256 seed, string memory imageUrl, string memory title) internal {
        _tokenData[tokenId] = TokenData(seed, imageUrl, title);
    }

    function getTokenData(uint256 tokenId) public view returns (uint256 seed, string memory imageUrl, string memory title) {
        TokenData memory data = _tokenData[tokenId];
        return (data.seed, data.imageUrl, data.title);
    }

    function setURI(uint256 tokenId, string memory newuri) public onlyOwner {
        _tokenURIs[tokenId] = newuri;
        emit URI(newuri, tokenId);
    }

    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];
        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }
        return super.uri(tokenId);
    }
}

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
        string metadataUri;
    }

    mapping(uint256 => TokenData) private _tokenData;

    string public name = "MeloSeed";
    string public symbol = "MELO";

    constructor() ERC1155("") Ownable(msg.sender) {}

    function mint(
        address account,
        uint256 amount,
        uint256 seed,
        string memory metadataUri,
        bytes memory data
    ) public {
        uint256 tokenId = _nextTokenId++;
        _mint(account, tokenId, amount, data);
        _setTokenData(tokenId, seed, metadataUri);
    }

    function _setTokenData(uint256 tokenId, uint256 seed, string memory metadataUri) internal {
        _tokenData[tokenId] = TokenData(seed, metadataUri);
    }

    function getTokenData(uint256 tokenId) public view returns (uint256 seed, string memory metadataUri) {
        TokenData memory data = _tokenData[tokenId];
        return (data.seed, data.metadataUri);
    }

    function setURI(uint256 tokenId, string memory newuri) public onlyOwner {
        _tokenData[tokenId].metadataUri = newuri;
        emit URI(newuri, tokenId);
    }

    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        TokenData memory data = _tokenData[tokenId];
        if (bytes(data.metadataUri).length > 0) {
            return data.metadataUri;
        }
        return super.uri(tokenId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MeloSeed is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Keep track of seeds for on-chain verification/indexing
    mapping(uint256 => uint256) public tokenSeeds;

    constructor() ERC721("MeloSeed", "MELO") Ownable(msg.sender) {}

    function mint(uint256 seed, string memory _tokenURI) public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        tokenSeeds[tokenId] = seed;
    }

    // The following functions are overrides required by Solidity.

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

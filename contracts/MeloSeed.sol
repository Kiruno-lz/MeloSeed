// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MeloSeed is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;

    // Mapping from tokenId to audio data (Base64 string)
    mapping(uint256 => string) public audioData;
    mapping(uint256 => uint256) public tokenSeeds;

    constructor() ERC721("MeloSeed", "MELO") Ownable(msg.sender) {}

    function mint(uint256 seed, string memory _audioBase64) public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        audioData[tokenId] = _audioBase64;
        tokenSeeds[tokenId] = seed;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory audio = audioData[tokenId];
        uint256 seed = tokenSeeds[tokenId];

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "MeloSeed #', tokenId.toString(), '",',
                        '"description": "Fully on-chain AI generated music on Monad.",',
                        '"attributes": [{"trait_type": "Seed", "value": "', seed.toString(), '"}],',
                        '"animation_url": "data:audio/mp3;base64,', audio, '"}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}

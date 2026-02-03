// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MeloSeed is ERC1155, ERC1155Burnable, Ownable {
    using Strings for uint256;

    // Counter for new token IDs
    uint256 private _nextTokenId;

    // Optional: Mapping to store individual token URIs if they are unique
    mapping(uint256 => string) private _tokenURIs;

    // Optional: Name and Symbol (ERC1155 doesn't enforce this but tools like OpenSea use it)
    string public name = "MeloSeed";
    string public symbol = "MELO";

    constructor() ERC1155("") Ownable(msg.sender) {}

    /**
     * @dev Mint a new unique music NFT (Edition 1/1 by default, but scalable).
     * @param account The address to receive the NFT.
     * @param amount The number of copies (usually 1 for unique generated music).
     * @param tokenURI The IPFS URI for the metadata.
     * @param data Additional data.
     */
    function mint(
        address account,
        uint256 amount,
        string memory tokenURI,
        bytes memory data
    ) public {
        uint256 tokenId = _nextTokenId++;
        _mint(account, tokenId, amount, data);
        _setTokenURI(tokenId, tokenURI);
    }

    /**
     * @dev Sets `tokenURI` for a specific `tokenId`.
     */
    function _setTokenURI(uint256 tokenId, string memory tokenURI) internal {
        _tokenURIs[tokenId] = tokenURI;
        emit URI(tokenURI, tokenId);
    }

    /**
     * @dev Returns the URI for a given token ID.
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];
        
        // If specific URI is set, return it
        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }

        // Fallback to super implementation (which returns the base URI)
        return super.uri(tokenId);
    }

    // Function to update metadata if needed (e.g. revealing or fixing IPFS link)
    function setURI(uint256 tokenId, string memory newuri) public onlyOwner {
        _setTokenURI(tokenId, newuri);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ERC721 } from "solady/tokens/ERC721.sol";
import { OwnableRoles } from "solady/auth/OwnableRoles.sol";

contract GladiatorNFT is ERC721, OwnableRoles {
    uint256 private _tokenIds;
    address public marketFactory;

    // Mapping from token ID to gladiator metadata
    mapping(uint256 => string) public gladiatorNames;
    mapping(uint256 => string) public gladiatorModels;

    constructor() {
        _initializeOwner(msg.sender);
    }

    function name() public pure override returns (string memory) {
        return "Aigora Gladiator";
    }

    function symbol() public pure override returns (string memory) {
        return "AIGORA";
    }

    function setMarketFactory(address _marketFactory) external onlyOwner {
        marketFactory = _marketFactory;
    }

    function mintGladiator(
        address to,
        string memory name,
        string memory model
    ) external returns (uint256) {
        require(msg.sender == marketFactory, "Only MarketFactory can mint");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _mint(to, newTokenId);
        gladiatorNames[newTokenId] = name;
        gladiatorModels[newTokenId] = model;
        
        return newTokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        // Return a basic JSON metadata string
        // In a production environment, you'd want to implement proper metadata handling
        return "";
    }

    function getGladiatorInfo(uint256 tokenId) external view returns (string memory name, string memory model) {
        require(_exists(tokenId), "Token does not exist");
        return (gladiatorNames[tokenId], gladiatorModels[tokenId]);
    }

    function _exists(uint256 tokenId) internal view override returns (bool) {
        return ownerOf(tokenId) != address(0);
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        return super.ownerOf(tokenId);
    }
} 
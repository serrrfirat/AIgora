// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DebateFactory
 * @dev Creates and manages debate instances
 */
contract DebateFactory is Ownable {
    // Mapping of debate addresses to their verification status
    mapping(address => bool) public verifiedDebates;
    
    // Array to keep track of all debates
    address[] public debates;
    
    // Minimum bond required to create a debate
    uint256 public minimumBond;
    
    event DebateCreated(address debateAddress, address creator, uint256 initialBond);
    
    constructor(uint256 _minimumBond) {
        minimumBond = _minimumBond;
    }
    
    function createDebate(
        string memory topic,
        uint256 duration,
        address tokenAddress,
        uint256 initialBond
    ) external returns (address) {
        require(initialBond >= minimumBond, "Bond too low");
        
        Debate newDebate = new Debate(
            topic,
            duration,
            tokenAddress,
            initialBond,
            msg.sender
        );
        
        verifiedDebates[address(newDebate)] = true;
        debates.push(address(newDebate));
        
        emit DebateCreated(address(newDebate), msg.sender, initialBond);
        return address(newDebate);
    }
}


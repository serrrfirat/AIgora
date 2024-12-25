// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title IDebateFun
 * @notice Interface defining the core functionality of the DebateFun contract
 */
interface IDebate {
    event BetPlaced(address indexed better, uint256 amount, bool outcome, string evidence, bool isEarlyBetter);
    event RoundCompleted(uint256 indexed roundNumber, uint256[] scores);
    event BondingCurveComplete(uint256 timestamp, uint256 finalPrice);
    event DebateFinalized(bool outcome, uint256 totalPot, uint256 winningAmount);
    event EvidenceSubmitted(address indexed user, string evidence, string twitterHandle);
    
    function placeBet(uint256 amount, bool outcome, string calldata evidence) external;
    function submitEvidence(string calldata evidence, string calldata twitterHandle) external;
    function getCurrentPrice() external view returns (uint256);
    function getRoundStatus(uint256 roundNumber) external view returns (bool isComplete, uint256[] memory scores);
}
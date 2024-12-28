// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/utils/SafeTransferLib.sol";
import { LibString } from "solady/utils/LibString.sol";
import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { ReentrancyGuard } from "solady/utils/ReentrancyGuard.sol";
import { ERC20 } from "solady/tokens/ERC20.sol";

/**
 * @title Debate
 * @notice A contract for managing AI-driven debates with scoring and outcome determination
 * @dev Implements debate rounds and AI scoring for multi-outcome questions
 */
contract Debate is ReentrancyGuard, OwnableRoles {
    // Constants
    uint256 public constant MAX_SCORE = 10;
    uint256 public constant MIN_SCORE = 0;
    uint256 public constant REQUIRED_JUDGES = 3; // Number of judges required to score each round
    uint256 public constant OUTCOME_COUNT = 5;   // Number of possible outcomes

    // Roles
    uint256 public constant _JUDGE_ROLE = _ROLE_0;
    uint256 public constant _ADMIN_ROLE = _ROLE_1;

    struct Round {
        mapping(address => mapping(uint256 => uint256)) judgeScores;  // Judge => outcome => score
        mapping(uint256 => uint256) totalScores;                      // Outcome => total score
        uint256 judgeCount;      // Number of judges who have scored
        bool isComplete;         // Round completion status
        uint256 startTime;       // Round start time
        uint256 endTime;         // Round end time
    }

    // State Variables
    string public topic;
    address public creator;
    uint256 public debateEndTime;
    uint256 public currentRound;
    uint256 public totalRounds;
    bool public isActive;
    address public market;       // Associated prediction market
    
    mapping(uint256 => Round) public rounds;
    uint256 public finalOutcome;  // Final outcome index
    bool public hasOutcome;       // Whether final outcome has been determined
    
    // Events
    event DebateCreated(string topic, address creator);
    event RoundStarted(uint256 roundNumber, uint256 startTime);
    event RoundScored(uint256 roundNumber, address judge, uint256[] scores);
    event RoundCompleted(uint256 roundNumber, uint256[] totalScores);
    event DebateFinalized(uint256 finalOutcome);
    event MarketSet(address market);

    modifier onlyActive() {
        require(isActive && block.timestamp < debateEndTime, "Debate not active");
        _;
    }

    constructor(
        string memory _topic,
        uint256 _duration,
        uint256 _totalRounds,
        address[] memory _judges
    ) {
        require(_duration > 0, "Invalid duration");
        require(_totalRounds > 0, "Invalid round count");
        
        topic = _topic;
        creator = msg.sender;
        debateEndTime = block.timestamp + _duration;
        totalRounds = _totalRounds;
        isActive = true;

        _initializeOwner(msg.sender);
        _grantRoles(msg.sender, _ADMIN_ROLE);
        for (uint256 i = 0; i < _judges.length; i++) {
            _grantRoles(_judges[i], _JUDGE_ROLE);
        }
        
        // Start first round
        startNewRound();
        
        emit DebateCreated(_topic, msg.sender);
    }

    /**
     * @notice Score a round by providing confidence scores for each outcome
     * @param roundNumber The round to score
     * @param scores Array of confidence scores for each outcome (must sum to MAX_SCORE)
     */
    function scoreRound(uint256 roundNumber, uint256[] calldata scores) 
        external  
        onlyActive 
        onlyRoles(_JUDGE_ROLE)
    {
        require(scores.length == OUTCOME_COUNT, "Invalid scores length");
        require(roundNumber == currentRound, "Invalid round");
        require(!rounds[roundNumber].isComplete, "Round already complete");
        require(rounds[roundNumber].judgeCount < REQUIRED_JUDGES, "Round fully scored");
        require(!hasJudgeScored(roundNumber, msg.sender), "Already scored");

        // Verify scores sum to MAX_SCORE
        uint256 totalScore = 0;
        for (uint256 i = 0; i < scores.length; i++) {
            require(scores[i] <= MAX_SCORE, "Score too high");
            totalScore += scores[i];
        }
        require(totalScore == MAX_SCORE, "Scores must sum to MAX_SCORE");

        Round storage round = rounds[roundNumber];
        
        // Record scores for each outcome
        for (uint256 i = 0; i < scores.length; i++) {
            round.judgeScores[msg.sender][i] = scores[i];
            round.totalScores[i] += scores[i];
        }
        round.judgeCount++;

        emit RoundScored(roundNumber, msg.sender, scores);

        if (round.judgeCount == REQUIRED_JUDGES) {
            round.isComplete = true;
            
            // Get total scores for event
            uint256[] memory totalScores = new uint256[](OUTCOME_COUNT);
            for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
                totalScores[i] = round.totalScores[i];
            }
            emit RoundCompleted(roundNumber, totalScores);
            
            if (currentRound < totalRounds - 1) {
                startNewRound();
            } else {
                finalizeDebate();
            }
        }
    }

    function hasJudgeScored(uint256 roundNumber, address judge) internal view returns (bool) {
        Round storage round = rounds[roundNumber];
        uint256 totalScore = 0;
        for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
            totalScore += round.judgeScores[judge][i];
        }
        return totalScore > 0;
    }

    function startNewRound() internal {
        currentRound++;
        Round storage newRound = rounds[currentRound];
        newRound.startTime = block.timestamp;
        newRound.endTime = block.timestamp + ((debateEndTime - block.timestamp) / (totalRounds - currentRound + 1));
        
        emit RoundStarted(currentRound, block.timestamp);
    }

    function finalizeDebate() internal {
        require(isActive, "Already finalized");
        isActive = false;

        // Calculate final outcome
        finalOutcome = determineOutcome();
        hasOutcome = true;
        emit DebateFinalized(finalOutcome);
    }

    /**
     * @notice Determine the winning outcome based on cumulative judge scores
     * @return outcome The outcome with highest cumulative score
     */
    function determineOutcome() internal view returns (uint256) {
        uint256[] memory totalScores = new uint256[](OUTCOME_COUNT);
        uint256 completedRounds = 0;

        // Sum up scores across all rounds
        for (uint256 round = 1; round <= currentRound; round++) {
            if (rounds[round].isComplete) {
                completedRounds++;
                for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
                    totalScores[i] += rounds[round].totalScores[i];
                }
            }
        }

        require(completedRounds > 0, "No completed rounds");
        
        // Find outcome with highest score
        uint256 maxScore = 0;
        uint256 winningOutcome = 0;
        for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
            if (totalScores[i] > maxScore) {
                maxScore = totalScores[i];
                winningOutcome = i;
            }
        }
        
        return winningOutcome;
    }

    /**
     * @notice Set the associated prediction market
     * @param _market Address of the market contract
     */
    function setMarket(address _market) external onlyOwner {
        require(market == address(0), "Market already set");
        require(_market != address(0), "Invalid market");
        market = _market;
        emit MarketSet(_market);
    }

    // View functions
    function getRoundInfo(uint256 roundNumber) 
        external 
        view 
        returns (
            bool isComplete,
            uint256 judgeCount,
            uint256[] memory totalScores,
            uint256 startTime,
            uint256 endTime
        ) 
    {
        Round storage round = rounds[roundNumber];
        totalScores = new uint256[](OUTCOME_COUNT);
        for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
            totalScores[i] = round.totalScores[i];
        }
        return (
            round.isComplete,
            round.judgeCount,
            totalScores,
            round.startTime,
            round.endTime
        );
    }

    /**
     * @notice Get a judge's scores for a specific round
     */
    function getJudgeScores(uint256 roundNumber, address judge) 
        external 
        view 
        returns (uint256[] memory scores) 
    {
        scores = new uint256[](OUTCOME_COUNT);
        for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
            scores[i] = rounds[roundNumber].judgeScores[judge][i];
        }
        return scores;
    }

    /**
     * @notice Get current outcome probabilities based on judge scores
     * @return Normalized probabilities for each outcome (in basis points)
     */
    function getCurrentProbabilities() external view returns (uint256[] memory) {
        uint256[] memory totalScores = new uint256[](OUTCOME_COUNT);
        uint256 completedRounds = 0;
        uint256 grandTotal = 0;

        // Sum up scores across all rounds
        for (uint256 round = 1; round <= currentRound; round++) {
            if (rounds[round].isComplete) {
                completedRounds++;
                for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
                    totalScores[i] += rounds[round].totalScores[i];
                    grandTotal += rounds[round].totalScores[i];
                }
            }
        }

        require(completedRounds > 0, "No completed rounds");
        require(grandTotal > 0, "No scores recorded");

        // Convert to probabilities in basis points
        uint256[] memory probabilities = new uint256[](OUTCOME_COUNT);
        for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
            probabilities[i] = (totalScores[i] * 10000) / grandTotal;
        }

        return probabilities;
    }
}
    
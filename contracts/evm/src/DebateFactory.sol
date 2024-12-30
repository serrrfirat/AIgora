// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { ReentrancyGuard } from "solady/utils/ReentrancyGuard.sol";

contract DebateFactory is ReentrancyGuard, OwnableRoles {
    // Constants
    uint256 public constant MAX_SCORE = 10;
    uint256 public constant MIN_SCORE = 0;
    uint256 public constant REQUIRED_JUDGES = 3;
    uint256 public constant OUTCOME_COUNT = 5;

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

    struct Debate {
        string topic;
        uint256 startTime;
        uint256 duration;
        uint256 debateEndTime;
        uint256 currentRound;
        uint256 totalRounds;
        bool isActive;
        address creator;
        address market;
        address[] judges;
        mapping(uint256 => Round) rounds;
        uint256 finalOutcome;
        bool hasOutcome;
    }

    // Mapping from debate ID to Debate struct
    mapping(uint256 => Debate) public debates;
    uint256 public debateCount;

    // Events
    event DebateCreated(
        uint256 indexed debateId,
        string topic,
        uint256 duration,
        uint256 totalRounds,
        address[] judges
    );
    event RoundStarted(uint256 indexed debateId, uint256 roundNumber, uint256 startTime);
    event RoundScored(uint256 indexed debateId, uint256 roundNumber, address judge, uint256[] scores);
    event RoundCompleted(uint256 indexed debateId, uint256 roundNumber, uint256[] totalScores);
    event DebateFinalized(uint256 indexed debateId, uint256 finalOutcome);
    event MarketSet(uint256 indexed debateId, address market);

    constructor() {
        _initializeOwner(msg.sender);
        _grantRoles(msg.sender, _ADMIN_ROLE);
    }

    modifier onlyDebateActive(uint256 debateId) {
        Debate storage debate = debates[debateId];
        require(debate.isActive && block.timestamp < debate.debateEndTime, "Debate not active");
        _;
    }

    function createDebate(
        string memory topic,
        uint256 duration,
        uint256 totalRounds,
        address[] memory judges
    ) external returns (uint256 debateId) {
        require(duration > 0, "Invalid duration");
        require(totalRounds > 0, "Invalid round count");
        require(judges.length > 0, "Must have judges");

        debateId = debateCount++;
        Debate storage newDebate = debates[debateId];
        
        newDebate.topic = topic;
        newDebate.startTime = block.timestamp;
        newDebate.duration = duration;
        newDebate.debateEndTime = block.timestamp + duration;
        newDebate.totalRounds = totalRounds;
        newDebate.isActive = true;
        newDebate.creator = msg.sender;
        newDebate.judges = judges;

        // Grant judge roles
        for (uint256 i = 0; i < judges.length; i++) {
            _grantRoles(judges[i], _JUDGE_ROLE);
        }

        // Start first round
        startNewRound(debateId);

        emit DebateCreated(
            debateId,
            topic,
            duration,
            totalRounds,
            judges
        );
    }

    function scoreRound(uint256 debateId, uint256 roundNumber, uint256[] calldata scores) 
        external
        onlyDebateActive(debateId)
        onlyRoles(_JUDGE_ROLE)
    {
        Debate storage debate = debates[debateId];
        require(scores.length == OUTCOME_COUNT, "Invalid scores length");
        require(roundNumber == debate.currentRound, "Invalid round");
        require(!debate.rounds[roundNumber].isComplete, "Round already complete");
        require(debate.rounds[roundNumber].judgeCount < REQUIRED_JUDGES, "Round fully scored");
        require(!hasJudgeScored(debateId, roundNumber, msg.sender), "Already scored");

        // Verify scores sum to MAX_SCORE
        uint256 totalScore = 0;
        for (uint256 i = 0; i < scores.length; i++) {
            require(scores[i] <= MAX_SCORE, "Score too high");
            totalScore += scores[i];
        }
        require(totalScore == MAX_SCORE, "Scores must sum to MAX_SCORE");

        Round storage round = debate.rounds[roundNumber];
        
        // Record scores for each outcome
        for (uint256 i = 0; i < scores.length; i++) {
            round.judgeScores[msg.sender][i] = scores[i];
            round.totalScores[i] += scores[i];
        }
        round.judgeCount++;

        emit RoundScored(debateId, roundNumber, msg.sender, scores);

        if (round.judgeCount == REQUIRED_JUDGES) {
            round.isComplete = true;
            
            // Get total scores for event
            uint256[] memory totalScores = new uint256[](OUTCOME_COUNT);
            for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
                totalScores[i] = round.totalScores[i];
            }
            emit RoundCompleted(debateId, roundNumber, totalScores);
            
            if (debate.currentRound < debate.totalRounds - 1) {
                startNewRound(debateId);
            } else {
                finalizeDebate(debateId);
            }
        }
    }

    function hasJudgeScored(uint256 debateId, uint256 roundNumber, address judge) public view returns (bool) {
        Round storage round = debates[debateId].rounds[roundNumber];
        uint256 totalScore = 0;
        for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
            totalScore += round.judgeScores[judge][i];
        }
        return totalScore > 0;
    }

    function startNewRound(uint256 debateId) internal {
        Debate storage debate = debates[debateId];
        debate.currentRound++;
        Round storage newRound = debate.rounds[debate.currentRound];
        newRound.startTime = block.timestamp;
        newRound.endTime = block.timestamp + ((debate.debateEndTime - block.timestamp) / (debate.totalRounds - debate.currentRound + 1));
        
        emit RoundStarted(debateId, debate.currentRound, block.timestamp);
    }

    function finalizeDebate(uint256 debateId) internal {
        Debate storage debate = debates[debateId];
        require(debate.isActive, "Already finalized");
        debate.isActive = false;

        // Calculate final outcome
        debate.finalOutcome = determineOutcome(debateId);
        debate.hasOutcome = true;
        emit DebateFinalized(debateId, debate.finalOutcome);
    }

    function determineOutcome(uint256 debateId) internal view returns (uint256) {
        Debate storage debate = debates[debateId];
        uint256[] memory totalScores = new uint256[](OUTCOME_COUNT);
        uint256 completedRounds = 0;

        // Sum up scores across all rounds
        for (uint256 round = 1; round <= debate.currentRound; round++) {
            if (debate.rounds[round].isComplete) {
                completedRounds++;
                for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
                    totalScores[i] += debate.rounds[round].totalScores[i];
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

    function setMarket(uint256 debateId, address _market) external onlyOwner {
        Debate storage debate = debates[debateId];
        require(debate.market == address(0), "Market already set");
        require(_market != address(0), "Invalid market");
        debate.market = _market;
        emit MarketSet(debateId, _market);
    }

    // View functions

    function getDebateDetails(uint256 debateId) external view returns (
        string memory topic,
        uint256 startTime,
        uint256 duration,
        uint256 debateEndTime,
        uint256 currentRound,
        uint256 totalRounds,
        bool isActive,
        address creator,
        address market,
        address[] memory judges,
        bool hasOutcome,
        uint256 finalOutcome
    ) {
        Debate storage debate = debates[debateId];
        return (
            debate.topic,
            debate.startTime,
            debate.duration,
            debate.debateEndTime,
            debate.currentRound,
            debate.totalRounds,
            debate.isActive,
            debate.creator,
            debate.market,
            debate.judges,
            debate.hasOutcome,
            debate.finalOutcome
        );
    }

    function getRoundInfo(uint256 debateId, uint256 roundNumber) 
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
        Round storage round = debates[debateId].rounds[roundNumber];
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

    function getJudgeScores(uint256 debateId, uint256 roundNumber, address judge) 
        external 
        view 
        returns (uint256[] memory scores) 
    {
        scores = new uint256[](OUTCOME_COUNT);
        Round storage round = debates[debateId].rounds[roundNumber];
        for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
            scores[i] = round.judgeScores[judge][i];
        }
        return scores;
    }

    function getCurrentProbabilities(uint256 debateId) external view returns (uint256[] memory) {
        Debate storage debate = debates[debateId];
        uint256[] memory totalScores = new uint256[](OUTCOME_COUNT);
        uint256 completedRounds = 0;
        uint256 grandTotal = 0;

        // Sum up scores across all rounds
        for (uint256 round = 1; round <= debate.currentRound; round++) {
            if (debate.rounds[round].isComplete) {
                completedRounds++;
                for (uint256 i = 0; i < OUTCOME_COUNT; i++) {
                    totalScores[i] += debate.rounds[round].totalScores[i];
                    grandTotal += debate.rounds[round].totalScores[i];
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

// return debate structs
    function getAllDebates() external view returns (uint256[] memory) {
        uint256[] memory debateIds = new uint256[](debateCount);
        for (uint256 i = 0; i < debateCount; i++) {
            debateIds[i] = i;
        }
        return debateIds;
    }
} 
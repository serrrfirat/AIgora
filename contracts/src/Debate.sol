// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/utils/SafeTransferLib.sol";
import { LibString } from "solady/utils/LibString.sol";
import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { ReentrancyGuard } from "solady/utils/ReentrancyGuard.sol";
import { ERC20 } from "solady/tokens/ERC20.sol";
/**
 * @title Debate
 * @notice A contract for managing AI-driven debates with betting and bonding curve mechanics
 * @dev Implements debate rounds, AI scoring, bonding curve, and reward distribution
 */
contract Debate is ReentrancyGuard, OwnableRoles {
    // Constants
    uint256 public constant MAX_SCORE = 10;
    uint256 public constant MIN_SCORE = 1;
    uint256 public constant EARLY_BETTER_BONUS_PERCENTAGE = 20; // 20% bonus
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant REQUIRED_JUDGES = 3; // Number of judges required to score each round

    // Roles
    uint256 public constant _JUDGE_ROLE = _ROLE_0;
    uint256 public constant _ADMIN_ROLE = _ROLE_1;

    struct BondingCurve {
        uint256 target;          // Target amount to reach
        uint256 current;         // Current amount raised
        uint256 basePrice;       // Starting price
        uint256 currentPrice;    // Current price
        bool isFulfilled;        // Whether target is reached
        uint256 endTime;         // When bonding period ends
    }

    struct Bet {
        uint256 amount;          // Amount bet
        bool prediction;         // True/False prediction
        bool isEarlyBetter;      // Whether bet during bonding
        string evidence;         // Supporting evidence
        string twitterHandle;    // Twitter handle if provided
    }

    struct Round {
        mapping(address => uint256) judgeScores;  // Judge => score
        uint256 totalScore;      // Sum of all scores
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
    
    BondingCurve public bondingCurve;
    mapping(address => Bet) public bets;
    mapping(uint256 => Round) public rounds;
    
    uint256 public totalPot;
    uint256 public totalForOutcome;
    uint256 public totalAgainstOutcome;
    address[] public participants;
    address public token;

    // Events
    event DebateCreated(string topic, address creator, uint256 bondingTarget);
    event BetPlaced(address better, uint256 amount, bool prediction, bool isEarly);
    event EvidenceSubmitted(address user, string evidence, string twitterHandle);
    event RoundStarted(uint256 roundNumber, uint256 startTime);
    event RoundScored(uint256 roundNumber, address judge, uint256 score);
    event RoundCompleted(uint256 roundNumber, uint256 totalScore);
    event BondingComplete(uint256 timestamp, uint256 finalPrice);
    event DebateFinalized(bool outcome, uint256 totalPot, uint256 winningPool);

    modifier onlyDuringBonding() {
        require(!bondingCurve.isFulfilled && block.timestamp <= bondingCurve.endTime, "Not in bonding period");
        _;
    }

    modifier onlyActive() {
        require(isActive && block.timestamp < debateEndTime, "Debate not active");
        _;
    }

    constructor(
        string memory _topic,
        address _tokenAddress,
        uint256 _duration,
        uint256 _bondingTarget,
        uint256 _bondingDuration,
        uint256 _basePrice,
        uint256 _totalRounds,
        address[] memory _judges
    ) {
        require(_duration > _bondingDuration, "Invalid durations");
        require(_bondingTarget > 0, "Invalid bonding target");
        require(_totalRounds > 0, "Invalid round count");
        
        topic = _topic;
        creator = msg.sender;
        token = _tokenAddress;
        debateEndTime = block.timestamp + _duration;
        totalRounds = _totalRounds;
        isActive = true;

        bondingCurve = BondingCurve({
            target: _bondingTarget,
            current: 0,
            basePrice: _basePrice,
            currentPrice: _basePrice,
            isFulfilled: false,
            endTime: block.timestamp + _bondingDuration
        });

        _initializeOwner(msg.sender);
        _grantRoles(msg.sender, _ADMIN_ROLE);
        for (uint256 i = 0; i < _judges.length; i++) {
            _grantRoles(_judges[i], _JUDGE_ROLE);
        }
        
        // Start first round
        startNewRound();
        
        emit DebateCreated(_topic, msg.sender, _bondingTarget);
    }

    function placeBet(uint256 amount, bool prediction, string calldata evidence, string calldata twitterHandle) 
        external 
        nonReentrant 
        onlyActive 
    {
        require(amount > 0, "Invalid bet amount");
        require(bets[msg.sender].amount == 0, "Already bet");
        SafeTransferLib.safeTransferFrom(token, msg.sender, address(this), amount);

        bool isEarly = !bondingCurve.isFulfilled && block.timestamp <= bondingCurve.endTime;
        uint256 effectiveAmount = amount;

        if (isEarly) {
            effectiveAmount = amount + (amount * EARLY_BETTER_BONUS_PERCENTAGE / 100);
        }

        bets[msg.sender] = Bet({
            amount: amount,
            prediction: prediction,
            isEarlyBetter: isEarly,
            evidence: evidence,
            twitterHandle: twitterHandle
        });

        if (prediction) {
            totalForOutcome += effectiveAmount;
        } else {
            totalAgainstOutcome += effectiveAmount;
        }

        totalPot += amount;
        participants.push(msg.sender);

        if (isEarly) {
            updateBondingCurve(amount);
        }

        emit BetPlaced(msg.sender, amount, prediction, isEarly);
        emit EvidenceSubmitted(msg.sender, evidence, twitterHandle);
    }

    function scoreRound(uint256 roundNumber, uint256 score) 
        external  
        onlyActive 
        onlyRoles(_JUDGE_ROLE)
    {
        require(score >= MIN_SCORE && score <= MAX_SCORE, "Invalid score");
        require(roundNumber == currentRound, "Invalid round");
        require(!rounds[roundNumber].isComplete, "Round already complete");
        require(rounds[roundNumber].judgeScores[msg.sender] == 0, "Already scored");

        Round storage round = rounds[roundNumber];
        round.judgeScores[msg.sender] = score;
        round.totalScore += score;
        round.judgeCount++;

        emit RoundScored(roundNumber, msg.sender, score);

        if (round.judgeCount == REQUIRED_JUDGES) {
            round.isComplete = true;
            emit RoundCompleted(roundNumber, round.totalScore);
            
            if (currentRound < totalRounds - 1) {
                startNewRound();
            } else {
                finalizeDebate();
            }
        }
    }

    function startNewRound() internal {
        currentRound++;
        Round storage newRound = rounds[currentRound];
        newRound.startTime = block.timestamp;
        newRound.endTime = block.timestamp + ((debateEndTime - block.timestamp) / (totalRounds - currentRound + 1));
        
        emit RoundStarted(currentRound, block.timestamp);
    }

    function updateBondingCurve(uint256 amount) internal {
        bondingCurve.current += amount;
        
        // Update price using a linear bonding curve for simplicity
        bondingCurve.currentPrice = bondingCurve.basePrice + 
            (bondingCurve.basePrice * bondingCurve.current) / bondingCurve.target;

        if (bondingCurve.current >= bondingCurve.target) {
            bondingCurve.isFulfilled = true;
            emit BondingComplete(block.timestamp, bondingCurve.currentPrice);
        }
    }

    function finalizeDebate() internal {
        require(isActive, "Already finalized");
        isActive = false;

        bool outcome = determineOutcome();
        uint256 winningPool = outcome ? totalForOutcome : totalAgainstOutcome;

        emit DebateFinalized(outcome, totalPot, winningPool);

        distributeRewards(outcome);
    }

    function determineOutcome() internal view returns (bool) {
        uint256 totalRoundScore = 0;
        uint256 completedRounds = 0;

        for (uint256 i = 1; i <= currentRound; i++) {
            if (rounds[i].isComplete) {
                totalRoundScore += rounds[i].totalScore;
                completedRounds++;
            }
        }

        // If average score > (MAX_SCORE * REQUIRED_JUDGES) / 2, outcome is true
        return completedRounds > 0 && 
            (totalRoundScore / completedRounds) > ((MAX_SCORE * REQUIRED_JUDGES) / 2);
    }

    function distributeRewards(bool outcome) internal {
        uint256 winningPool = outcome ? totalForOutcome : totalAgainstOutcome;

        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            Bet storage bet = bets[participant];

            if (bet.prediction == outcome) {
                uint256 effectiveAmount = bet.amount;
                if (bet.isEarlyBetter) {
                    effectiveAmount += (bet.amount * EARLY_BETTER_BONUS_PERCENTAGE / 100);
                }

                uint256 share = (effectiveAmount * BASIS_POINTS) / winningPool;
                uint256 reward = (totalPot * share) / BASIS_POINTS;

                SafeTransferLib.safeTransfer(token, participant, reward);
            }
        }
    }

    // View functions
    function getCurrentPrice() external view returns (uint256) {
        return bondingCurve.currentPrice;
    }

    function getRoundInfo(uint256 roundNumber) 
        external 
        view 
        returns (
            bool isComplete,
            uint256 judgeCount,
            uint256 totalScore,
            uint256 startTime,
            uint256 endTime
        ) 
    {
        Round storage round = rounds[roundNumber];
        return (
            round.isComplete,
            round.judgeCount,
            round.totalScore,
            round.startTime,
            round.endTime
        );
    }

    function getBetInfo(address better)
        external
        view
        returns (
            uint256 amount,
            bool prediction,
            bool isEarlyBetter,
            string memory evidence,
            string memory twitterHandle
        )
    {
        Bet storage bet = bets[better];
        return (
            bet.amount,
            bet.prediction,
            bet.isEarlyBetter,
            bet.evidence,
            bet.twitterHandle
        );
    }
}
    
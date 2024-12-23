
// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19;
import { ReentrancyGuard } from "solady/auth/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Debate
 * @dev Manages individual debate instances including bonding curve and stake distribution
 */
contract Debate is ReentrancyGuard {
    struct Stake {
        uint256 amount;
        uint256 timestamp;
        string context;
        uint8 outcome;  // 0 = undecided, 1 = for, 2 = against
    }
    
    struct BondingCurve {
        uint256 baseRate;
        uint256 exponent;
        uint256 currentSupply;
    }
    
    string public topic;
    uint256 public duration;
    uint256 public startTime;
    bool public isActive;
    address public creator;
    IERC20 public token;
    
    BondingCurve public bondingCurve;
    mapping(address => Stake) public stakes;
    
    uint256 public totalStakeFor;
    uint256 public totalStakeAgainst;
    
    event StakeSubmitted(address indexed staker, uint256 amount, uint8 outcome);
    event DebateFinalized(uint8 winningOutcome, uint256 totalReward);
    
    constructor(
        string memory _topic,
        uint256 _duration,
        address _tokenAddress,
        uint256 _initialBond,
        address _creator
    ) {
        topic = _topic;
        duration = _duration;
        token = IERC20(_tokenAddress);
        creator = _creator;
        
        // Initialize bonding curve parameters
        bondingCurve = BondingCurve({
            baseRate: 100,  // Base rate for price calculation
            exponent: 2,    // Exponential growth factor
            currentSupply: 0
        });
        
        startTime = block.timestamp;
        isActive = true;
    }
    
    function calculatePrice(uint256 amount) public view returns (uint256) {
        return bondingCurve.baseRate * (
            (bondingCurve.currentSupply + amount) ** bondingCurve.exponent
        ) / (10 ** (bondingCurve.exponent - 1));
    }
    
    function stake(uint256 amount, string memory context, uint8 outcome) 
        external 
        nonReentrant 
    {
        require(isActive, "Debate is not active");
        require(block.timestamp < startTime + duration, "Debate has ended");
        require(outcome == 1 || outcome == 2, "Invalid outcome");
        
        uint256 price = calculatePrice(amount);
        require(token.transferFrom(msg.sender, address(this), price), "Transfer failed");
        
        stakes[msg.sender] = Stake({
            amount: amount,
            timestamp: block.timestamp,
            context: context,
            outcome: outcome
        });
        
        if (outcome == 1) {
            totalStakeFor += amount;
        } else {
            totalStakeAgainst += amount;
        }
        
        bondingCurve.currentSupply += amount;
        emit StakeSubmitted(msg.sender, amount, outcome);
    }
    
    function finalizeDebate(uint8 winningOutcome) external {
        require(msg.sender == creator, "Only creator can finalize");
        require(block.timestamp >= startTime + duration, "Debate not ended");
        require(isActive, "Already finalized");
        
        isActive = false;
        
        // Calculate rewards for winning side
        uint256 totalReward = token.balanceOf(address(this));
        emit DebateFinalized(winningOutcome, totalReward);
        
        // Distribute rewards (implementation depends on specific requirements)
        distributeRewards(winningOutcome, totalReward);
    }
    
    function distributeRewards(uint8 winningOutcome, uint256 totalReward) 
        internal 
    {
        uint256 winningTotal = winningOutcome == 1 ? totalStakeFor : totalStakeAgainst;
        
        // Iterate through stakes and distribute rewards to winners
        // This is a simplified version - you might want to optimize this
        // based on your specific requirements
    }
}

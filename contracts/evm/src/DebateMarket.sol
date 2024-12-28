// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/utils/SafeTransferLib.sol";
import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { ReentrancyGuard } from "solady/utils/ReentrancyGuard.sol";
import { ERC20 } from "solady/tokens/ERC20.sol";

/**
 * @title DebateMarket
 * @notice A peer-to-peer prediction market for multiple outcome scenarios with bonding curve activation
 * @dev Implements order book mechanics and bonding curve for debate activation
 */
contract DebateMarket is ReentrancyGuard, OwnableRoles {
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_PRICE = 1; // $0.01 in basis points
    uint256 public constant MAX_PRICE = 9900; // $0.99 in basis points
    uint256 public constant MIN_ORDER_SIZE = 10**18; // 1 full token

    // Structs
    struct BondingCurve {
        uint256 target;          // Target amount to reach
        uint256 current;         // Current amount raised
        uint256 basePrice;       // Starting price
        uint256 currentPrice;    // Current price
        bool isFulfilled;        // Whether target is reached
        uint256 endTime;         // When bonding period ends
    }

    struct Outcome {
        string name;           // e.g. "75+ bps decrease"
        uint256 index;        // Index in outcomes array
        bool isValid;         // Whether this outcome is valid
    }

    struct Order {
        uint256 price;        // Price in basis points (100 = 1%)
        uint256 amount;       // Amount of shares
        uint256 outcomeIndex; // Which outcome this order is for
        address owner;        // Order creator
    }

    struct Position {
        mapping(uint256 => uint256) shares; // outcomeIndex => number of shares
    }

    // State Variables
    address public immutable token;        // Settlement token (e.g., USDC)
    address public immutable debate;       // Associated debate contract
    bool public resolved;                  // Whether market has been resolved
    uint256 public winningOutcome;        // Index of winning outcome when resolved
    
    // Bonding curve state
    BondingCurve public bondingCurve;
    uint256 public totalBondingAmount;     // Total amount contributed during bonding
    
    // Outcomes and order books
    Outcome[] public outcomes;            // All possible outcomes
    mapping(uint256 => Order[]) public orderBooks; // outcomeIndex => orders
    mapping(uint256 => uint256) public lastTradedPrices; // outcomeIndex => price
    
    // User positions
    mapping(address => Position) private positions;
    mapping(uint256 => uint256) public outcomeVolumes; // Total volume per outcome
    
    // Events
    event OutcomeAdded(uint256 indexed index, string name);
    event OrderPlaced(
        address indexed trader,
        uint256 indexed outcomeIndex,
        uint256 price,
        uint256 amount
    );
    event OrderMatched(
        address indexed buyer,
        address indexed seller,
        uint256 indexed outcomeIndex,
        uint256 price,
        uint256 amount
    );
    event OrderCancelled(address indexed trader, uint256 indexed outcomeIndex, uint256 price, uint256 amount);
    event MarketResolved(uint256 indexed winningOutcomeIndex);
    event SharesRedeemed(address indexed trader, uint256 amount);
    event BondingContribution(address indexed contributor, uint256 amount);
    event BondingComplete(uint256 timestamp, uint256 finalPrice);

    modifier onlyDuringBonding() {
        require(!bondingCurve.isFulfilled && block.timestamp <= bondingCurve.endTime, "Not in bonding period");
        _;
    }

    constructor(
        address _token,
        address _debate,
        string[] memory _outcomeNames,
        uint256 _bondingTarget,
        uint256 _bondingDuration,
        uint256 _basePrice
    ) {
        require(_token != address(0), "Invalid token");
        require(_debate != address(0), "Invalid debate");
        require(_outcomeNames.length > 1, "Need multiple outcomes");
        require(_bondingTarget > 0, "Invalid bonding target");
        require(_bondingDuration > 0, "Invalid bonding duration");
        
        token = _token;
        debate = _debate;
        
        // Initialize bonding curve
        bondingCurve = BondingCurve({
            target: _bondingTarget,
            current: 0,
            basePrice: _basePrice,
            currentPrice: _basePrice,
            isFulfilled: false,
            endTime: block.timestamp + _bondingDuration
        });
        
        // Initialize outcomes
        for (uint256 i = 0; i < _outcomeNames.length; i++) {
            outcomes.push(Outcome({
                name: _outcomeNames[i],
                index: i,
                isValid: true
            }));
            emit OutcomeAdded(i, _outcomeNames[i]);
        }
        
        _initializeOwner(msg.sender);
    }

    /**
     * @notice Place a limit order for an outcome
     * @param outcomeIndex Index of the outcome to buy
     * @param price Price in basis points (100 = 1%)
     * @param amount Amount of shares to buy
     */
    function placeLimitOrder(
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount
    ) external nonReentrant {
        require(!resolved, "Market resolved");
        require(outcomeIndex < outcomes.length, "Invalid outcome");
        require(outcomes[outcomeIndex].isValid, "Invalid outcome");
        require(price >= MIN_PRICE && price <= MAX_PRICE, "Invalid price");
        require(amount >= MIN_ORDER_SIZE, "Order too small");
        
        // Calculate required collateral
        uint256 collateral = (amount * price) / BASIS_POINTS;
        
        // Transfer collateral from user
        SafeTransferLib.safeTransferFrom(token, msg.sender, address(this), collateral);
        
        // Update bonding curve if during bonding period
        if (!bondingCurve.isFulfilled && block.timestamp <= bondingCurve.endTime) {
            updateBondingCurve(amount);
        }
        
        // Try to match with existing orders
        uint256 remainingAmount = matchOrder(outcomeIndex, price, amount, msg.sender);
        
        // Add remaining amount as new order if any
        if (remainingAmount > 0) {
            orderBooks[outcomeIndex].push(Order({
                price: price,
                amount: remainingAmount,
                outcomeIndex: outcomeIndex,
                owner: msg.sender
            }));

            // Update position for remaining amount
            positions[msg.sender].shares[outcomeIndex] += remainingAmount;
        }
        
        // Update outcome volume
        outcomeVolumes[outcomeIndex] += amount;
        
        emit OrderPlaced(msg.sender, outcomeIndex, price, amount);
    }

    /**
     * @notice Update the bonding curve with new contribution
     * @param amount Amount contributed
     */
    function updateBondingCurve(uint256 amount) internal {
        bondingCurve.current += amount;
        totalBondingAmount += amount;
        
        // Linear price increase from basePrice to 2x basePrice as we reach target
        bondingCurve.currentPrice = bondingCurve.basePrice + 
            (bondingCurve.basePrice * bondingCurve.current) / bondingCurve.target;
        
        if (bondingCurve.current >= bondingCurve.target) {
            bondingCurve.isFulfilled = true;
            emit BondingComplete(block.timestamp, bondingCurve.currentPrice);
        }
        
        emit BondingContribution(msg.sender, amount);
    }

    /**
     * @notice Match an incoming order against the order book
     */
    function matchOrder(
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        address trader
    ) internal returns (uint256) {
        Order[] storage orderBook = orderBooks[outcomeIndex];
        uint256 remainingAmount = amount;
        uint256 i = 0;
        
        while (i < orderBook.length && remainingAmount > 0) {
            Order storage order = orderBook[i];
            
            // Check if price is acceptable
            if (order.price > price) break;
            
            // Calculate fill amount
            uint256 fillAmount = remainingAmount < order.amount ? 
                remainingAmount : order.amount;
            
            // Update buyer position
            positions[trader].shares[outcomeIndex] += fillAmount;
            
            // Update seller position
            positions[order.owner].shares[outcomeIndex] -= fillAmount;
            
            // Update order
            order.amount -= fillAmount;
            remainingAmount -= fillAmount;
            
            // Update last traded price
            lastTradedPrices[outcomeIndex] = order.price;
            
            emit OrderMatched(trader, order.owner, outcomeIndex, order.price, fillAmount);
            
            // Remove filled order
            if (order.amount == 0) {
                orderBook[i] = orderBook[orderBook.length - 1];
                orderBook.pop();
            } else {
                i++;
            }
        }
        
        return remainingAmount;
    }

    /**
     * @notice Cancel an existing limit order
     * @param outcomeIndex Index of the outcome
     * @param orderId Index of the order in the order book
     */
    function cancelOrder(uint256 outcomeIndex, uint256 orderId) external nonReentrant {
        require(outcomeIndex < outcomes.length, "Invalid outcome");
        Order[] storage orderBook = orderBooks[outcomeIndex];
        require(orderId < orderBook.length, "Invalid order");
        
        Order storage order = orderBook[orderId];
        require(order.owner == msg.sender, "Not owner");
        
        // Calculate refund
        uint256 refund = (order.amount * order.price) / BASIS_POINTS;
        
        // Remove order
        orderBook[orderId] = orderBook[orderBook.length - 1];
        orderBook.pop();
        
        // Refund collateral
        SafeTransferLib.safeTransfer(token, msg.sender, refund);
        
        emit OrderCancelled(msg.sender, outcomeIndex, order.price, order.amount);
    }

    /**
     * @notice Resolve the market with winning outcome
     * @param _winningOutcome Index of the winning outcome
     */
    function resolveMarket(uint256 _winningOutcome) external onlyOwner {
        require(!resolved, "Already resolved");
        require(_winningOutcome < outcomes.length, "Invalid outcome");
        require(outcomes[_winningOutcome].isValid, "Invalid outcome");
        
        resolved = true;
        winningOutcome = _winningOutcome;
        emit MarketResolved(_winningOutcome);
    }

    /**
     * @notice Redeem winning shares after market resolution
     */
    function redeemWinningShares() external nonReentrant {
        require(resolved, "Not resolved");
        
        uint256 winningShares = positions[msg.sender].shares[winningOutcome];
        require(winningShares > 0, "No winning shares");
        
        // Reset position
        positions[msg.sender].shares[winningOutcome] = 0;
        
        // Transfer winnings
        SafeTransferLib.safeTransfer(token, msg.sender, winningShares);
        
        emit SharesRedeemed(msg.sender, winningShares);
    }

    /**
     * @notice Get current order book for an outcome
     * @param outcomeIndex Index of the outcome
     * @return orders Array of current orders
     */
    function getOrderBook(uint256 outcomeIndex) external view returns (Order[] memory) {
        require(outcomeIndex < outcomes.length, "Invalid outcome");
        return orderBooks[outcomeIndex];
    }

    /**
     * @notice Get current price for an outcome
     * @param outcomeIndex Index of the outcome
     * @return price Current market price in basis points
     */
    function getCurrentPrice(uint256 outcomeIndex) external view returns (uint256) {
        require(outcomeIndex < outcomes.length, "Invalid outcome");
        Order[] storage orderBook = orderBooks[outcomeIndex];
        
        if (orderBook.length == 0) {
            return lastTradedPrices[outcomeIndex];
        }
        
        return orderBook[0].price;
    }

    /**
     * @notice Get all outcomes
     * @return Array of all outcomes
     */
    function getOutcomes() external view returns (Outcome[] memory) {
        return outcomes;
    }

    /**
     * @notice Get user's position for an outcome
     * @param user Address of the user
     * @param outcomeIndex Index of the outcome
     * @return shares Number of shares held
     */
    function getPosition(address user, uint256 outcomeIndex) external view returns (uint256) {
        require(outcomeIndex < outcomes.length, "Invalid outcome");
        return positions[user].shares[outcomeIndex];
    }
} 
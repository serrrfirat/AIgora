// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/utils/SafeTransferLib.sol";
import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { ReentrancyGuard } from "solady/utils/ReentrancyGuard.sol";
import { ERC20 } from "solady/tokens/ERC20.sol";

contract MarketFactory is ReentrancyGuard, OwnableRoles {
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

    struct Market {
        address token;           // Settlement token (e.g., USDC)
        uint256 debateId;       // Associated debate ID
        bool resolved;          // Whether market has been resolved
        uint256 winningOutcome; // Index of winning outcome when resolved
        BondingCurve bondingCurve;
        uint256 totalBondingAmount;
        Outcome[] outcomes;
        mapping(uint256 => Order[]) orderBooks; // outcomeIndex => orders
        mapping(uint256 => uint256) lastTradedPrices;
        mapping(address => Position) positions;
        mapping(uint256 => uint256) outcomeVolumes;
    }

    // State Variables
    mapping(uint256 => Market) public markets;
    mapping(uint256 => uint256) public debateIdToMarketId; // debateId => marketId
    mapping(uint256 => uint256) public marketIdToDebateId; // marketId => debateId
    uint256 public marketCount;

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        address token,
        uint256 indexed debateId,
        string[] outcomeNames
    );
    event OutcomeAdded(uint256 indexed marketId, uint256 indexed index, string name);
    event OrderPlaced(
        uint256 indexed marketId,
        address indexed trader,
        uint256 indexed outcomeIndex,
        uint256 price,
        uint256 amount
    );
    event OrderMatched(
        uint256 indexed marketId,
        address indexed buyer,
        address indexed seller,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount
    );
    event OrderCancelled(
        uint256 indexed marketId,
        address indexed trader,
        uint256 indexed outcomeIndex,
        uint256 price,
        uint256 amount
    );
    event MarketResolved(uint256 indexed marketId, uint256 indexed winningOutcomeIndex);
    event SharesRedeemed(uint256 indexed marketId, address indexed trader, uint256 amount);
    event BondingContribution(uint256 indexed marketId, address indexed contributor, uint256 amount);
    event BondingComplete(uint256 indexed marketId, uint256 timestamp, uint256 finalPrice);

    modifier onlyDuringBonding(uint256 marketId) {
        Market storage market = markets[marketId];
        require(
            !market.bondingCurve.isFulfilled && 
            block.timestamp <= market.bondingCurve.endTime, 
            "Not in bonding period"
        );
        _;
    }

    constructor() {
        _initializeOwner(msg.sender);
    }

    function createMarket(
        address _token,
        uint256 _debateId,
        string[] memory _outcomeNames,
        uint256 _bondingTarget,
        uint256 _bondingDuration,
        uint256 _basePrice
    ) external returns (uint256 marketId) {
        require(_token != address(0), "Invalid token");
        require(debateIdToMarketId[_debateId] == 0, "Market exists");
        require(_outcomeNames.length > 1, "Need multiple outcomes");
        require(_bondingTarget > 0, "Invalid bonding target");
        require(_bondingDuration > 0, "Invalid bonding duration");

        marketId = marketCount++;
        Market storage market = markets[marketId];

        market.token = _token;
        market.debateId = _debateId;
        market.resolved = false;

        // Initialize bonding curve
        market.bondingCurve = BondingCurve({
            target: _bondingTarget,
            current: 0,
            basePrice: _basePrice,
            currentPrice: _basePrice,
            isFulfilled: false,
            endTime: block.timestamp + _bondingDuration
        });

        // Initialize outcomes
        for (uint256 i = 0; i < _outcomeNames.length; i++) {
            market.outcomes.push(Outcome({
                name: _outcomeNames[i],
                index: i,
                isValid: true
            }));
            emit OutcomeAdded(marketId, i, _outcomeNames[i]);
        }

        // Register market
        debateIdToMarketId[_debateId] = marketId;
        marketIdToDebateId[marketId] = _debateId;

        emit MarketCreated(marketId, _token, _debateId, _outcomeNames);
    }

    function placeLimitOrder(
        uint256 marketId,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(!market.resolved, "Market resolved");
        require(outcomeIndex < market.outcomes.length, "Invalid outcome");
        require(market.outcomes[outcomeIndex].isValid, "Invalid outcome");
        require(price >= MIN_PRICE && price <= MAX_PRICE, "Invalid price");
        require(amount >= MIN_ORDER_SIZE, "Order too small");

        // Calculate required collateral
        uint256 collateral = (amount * price) / BASIS_POINTS;

        // Transfer collateral from user
        SafeTransferLib.safeTransferFrom(market.token, msg.sender, address(this), collateral);

        // Update bonding curve if during bonding period
        if (!market.bondingCurve.isFulfilled && block.timestamp <= market.bondingCurve.endTime) {
            _updateBondingCurve(marketId, amount);
        }

        // Try to match with existing orders
        uint256 remainingAmount = _matchOrder(marketId, outcomeIndex, price, amount, msg.sender);

        // Add remaining amount as new order if any
        if (remainingAmount > 0) {
            market.orderBooks[outcomeIndex].push(Order({
                price: price,
                amount: remainingAmount,
                outcomeIndex: outcomeIndex,
                owner: msg.sender
            }));

            // Update position for remaining amount
            market.positions[msg.sender].shares[outcomeIndex] += remainingAmount;
        }

        // Update outcome volume
        market.outcomeVolumes[outcomeIndex] += amount;

        emit OrderPlaced(marketId, msg.sender, outcomeIndex, price, amount);
    }

    function _updateBondingCurve(uint256 marketId, uint256 amount) internal {
        Market storage market = markets[marketId];
        market.bondingCurve.current += amount;
        market.totalBondingAmount += amount;

        // Linear price increase from basePrice to 2x basePrice as we reach target
        market.bondingCurve.currentPrice = market.bondingCurve.basePrice +
            (market.bondingCurve.basePrice * market.bondingCurve.current) / market.bondingCurve.target;

        if (market.bondingCurve.current >= market.bondingCurve.target) {
            market.bondingCurve.isFulfilled = true;
            emit BondingComplete(marketId, block.timestamp, market.bondingCurve.currentPrice);
        }

        emit BondingContribution(marketId, msg.sender, amount);
    }

    function _matchOrder(
        uint256 marketId,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        address trader
    ) internal returns (uint256) {
        Market storage market = markets[marketId];
        Order[] storage orderBook = market.orderBooks[outcomeIndex];
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
            market.positions[trader].shares[outcomeIndex] += fillAmount;

            // Update seller position
            market.positions[order.owner].shares[outcomeIndex] -= fillAmount;

            // Update order
            order.amount -= fillAmount;
            remainingAmount -= fillAmount;

            // Update last traded price
            market.lastTradedPrices[outcomeIndex] = order.price;

            emit OrderMatched(marketId, trader, order.owner, outcomeIndex, order.price, fillAmount);

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

    function cancelOrder(
        uint256 marketId,
        uint256 outcomeIndex,
        uint256 orderId
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(outcomeIndex < market.outcomes.length, "Invalid outcome");
        Order[] storage orderBook = market.orderBooks[outcomeIndex];
        require(orderId < orderBook.length, "Invalid order");

        Order storage order = orderBook[orderId];
        require(order.owner == msg.sender, "Not owner");

        // Calculate refund
        uint256 refund = (order.amount * order.price) / BASIS_POINTS;

        // Remove order
        orderBook[orderId] = orderBook[orderBook.length - 1];
        orderBook.pop();

        // Refund collateral
        SafeTransferLib.safeTransfer(market.token, msg.sender, refund);

        emit OrderCancelled(marketId, msg.sender, outcomeIndex, order.price, order.amount);
    }

    function resolveMarket(uint256 marketId, uint256 _winningOutcome) external onlyOwner {
        Market storage market = markets[marketId];
        require(!market.resolved, "Already resolved");
        require(_winningOutcome < market.outcomes.length, "Invalid outcome");
        require(market.outcomes[_winningOutcome].isValid, "Invalid outcome");

        market.resolved = true;
        market.winningOutcome = _winningOutcome;
        emit MarketResolved(marketId, _winningOutcome);
    }

    function redeemWinningShares(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Not resolved");

        uint256 winningShares = market.positions[msg.sender].shares[market.winningOutcome];
        require(winningShares > 0, "No winning shares");

        // Reset position
        market.positions[msg.sender].shares[market.winningOutcome] = 0;

        // Transfer winnings
        SafeTransferLib.safeTransfer(market.token, msg.sender, winningShares);

        emit SharesRedeemed(marketId, msg.sender, winningShares);
    }

    // View functions
    function getMarketDetails(uint256 marketId) external view returns (
        address token,
        uint256 debateId,
        bool resolved,
        uint256 winningOutcome,
        BondingCurve memory bondingCurve,
        uint256 totalBondingAmount
    ) {
        Market storage market = markets[marketId];
        return (
            market.token,
            market.debateId,
            market.resolved,
            market.winningOutcome,
            market.bondingCurve,
            market.totalBondingAmount
        );
    }

    function getOrderBook(uint256 marketId, uint256 outcomeIndex) external view returns (Order[] memory) {
        Market storage market = markets[marketId];
        require(outcomeIndex < market.outcomes.length, "Invalid outcome");
        return market.orderBooks[outcomeIndex];
    }

    function getCurrentPrice(uint256 marketId, uint256 outcomeIndex) external view returns (uint256) {
        Market storage market = markets[marketId];
        require(outcomeIndex < market.outcomes.length, "Invalid outcome");
        Order[] storage orderBook = market.orderBooks[outcomeIndex];

        if (orderBook.length == 0) {
            return market.lastTradedPrices[outcomeIndex];
        }

        return orderBook[0].price;
    }

    function getOutcomes(uint256 marketId) external view returns (Outcome[] memory) {
        return markets[marketId].outcomes;
    }

    function getPosition(
        uint256 marketId,
        address user,
        uint256 outcomeIndex
    ) external view returns (uint256) {
        Market storage market = markets[marketId];
        require(outcomeIndex < market.outcomes.length, "Invalid outcome");
        return market.positions[user].shares[outcomeIndex];
    }
} 
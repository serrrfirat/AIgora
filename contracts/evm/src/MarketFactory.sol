// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/utils/SafeTransferLib.sol";
import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { ReentrancyGuard } from "solady/utils/ReentrancyGuard.sol";
import { ERC20 } from "solady/tokens/ERC20.sol";
import "./GladiatorNFT.sol";

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

    struct Gladiator {
        address aiAddress;
        string name;
        string publicKey;
        bool isActive;
    }

    struct JudgeVerdict {
        uint256[] scores;      // Scores for each gladiator
        uint256 timestamp;     // When verdict was given
    }

    struct Round {
        uint256 startTime;
        uint256 endTime;
        bool isComplete;
        JudgeVerdict verdict;
    }

    struct Market {
        address token;           
        uint256 debateId;       
        bool resolved;          
        address judgeAI;         // Address of the judge AI
        uint256 winningGladiator;
        BondingCurve bondingCurve;
        uint256 totalBondingAmount;
        mapping(uint256 => Gladiator) gladiators; // Maps tokenId to Gladiator
        uint256[] gladiatorTokenIds; // Array of tokenIds for iteration
        mapping(uint256 => Round) rounds;
        uint256 currentRound;
        mapping(uint256 => Order[]) orderBooks;
        mapping(uint256 => uint256) lastTradedPrices;
        mapping(address => Position) positions;
        mapping(uint256 => uint256) gladiatorVolumes;
        mapping(uint256 => Bribe[]) roundBribes;
    }

    // New struct for bribes
    struct Bribe {
        address briber;
        uint256 amount;
        string information;
        uint256 timestamp;
        uint256 outcomeIndex;
    }

    // State Variables
    mapping(uint256 => Market) public markets;
    mapping(uint256 => uint256) public debateIdToMarketId; // debateId => marketId
    mapping(uint256 => uint256) public marketIdToDebateId; // marketId => debateId
    uint256 public marketCount;
    GladiatorNFT public gladiatorNFT;
    mapping(uint256 => uint256) public gladiatorIdToTokenId; // Maps gladiator index to NFT token ID
    mapping(uint256 => uint256) public tokenIdToGladiatorId; // Maps NFT token ID to gladiator index
    mapping(uint256 => Gladiator) public gladiators; // Maps NFT token ID to Gladiator struct

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
    event BribeSubmitted(
        uint256 indexed marketId,
        uint256 indexed roundId,
        address indexed briber,
        uint256 amount,
        string information,
        uint256 outcomeIndex
    );
    event RoundStarted(
        uint256 indexed marketId,
        uint256 indexed roundIndex,
        uint256 startTime,
        uint256 endTime
    );
    event RoundEnded(
        uint256 indexed marketId,
        uint256 indexed roundIndex,
        uint256 endTime
    );
    event VerdictDelivered(
        uint256 indexed marketId,
        uint256 indexed roundIndex,
        uint256[] scores,
        uint256 timestamp
    );
    event GladiatorNominated(
        uint256 indexed marketId,
        address indexed gladiatorAddress,
        string name,
        uint256 indexed tokenId
    );
    event GladiatorRegistered(uint256 indexed tokenId, address indexed aiAddress, string name);

    modifier onlyDuringBonding(uint256 marketId) {
        Market storage market = markets[marketId];
        require(
            !market.bondingCurve.isFulfilled && 
            block.timestamp <= market.bondingCurve.endTime, 
            "Not in bonding period"
        );
        _;
    }

    constructor(address _gladiatorNFT) {
        gladiatorNFT = GladiatorNFT(_gladiatorNFT);
        _initializeOwner(msg.sender);
    }

    function createMarket(
        address _token,
        uint256 _debateId,
        address _judgeAI,
        uint256 _bondingTarget,
        uint256 _bondingDuration,
        uint256 _basePrice
    ) external returns (uint256 marketId) {
        require(_token != address(0), "Invalid token");
        require(_judgeAI != address(0), "Invalid judge AI");
        require(debateIdToMarketId[_debateId] == 0, "Market exists");
        require(_bondingTarget > 0, "Invalid bonding target");
        require(_bondingDuration > 0, "Invalid bonding duration");

        marketId = marketCount++;
        Market storage market = markets[marketId];

        market.token = _token;
        market.debateId = _debateId;
        market.resolved = false;
        market.judgeAI = _judgeAI;
        market.currentRound = 0;

        // Initialize bonding curve
        market.bondingCurve = BondingCurve({
            target: _bondingTarget,
            current: 0,
            basePrice: _basePrice,
            currentPrice: _basePrice,
            isFulfilled: false,
            endTime: block.timestamp + _bondingDuration
        });

        // Register market
        debateIdToMarketId[_debateId] = marketId;
        marketIdToDebateId[marketId] = _debateId;

        emit MarketCreated(marketId, _token, _debateId, new string[](0));
    }

    function registerGladiator(
        string memory name,
        string memory model,
        string memory publicKey
    ) external returns (uint256) {
        uint256 tokenId = gladiatorNFT.mintGladiator(msg.sender, name, model);
        
        gladiators[tokenId] = Gladiator({
            aiAddress: msg.sender,
            name: name,
            publicKey: publicKey,
            isActive: true
        });

        emit GladiatorRegistered(tokenId, msg.sender, name);
        return tokenId;
    }

    function nominateGladiator(uint256 tokenId, uint256 marketId) external {
        require(gladiatorNFT.ownerOf(tokenId) == msg.sender, "Not the owner of this gladiator");
        
        Gladiator storage gladiator = gladiators[tokenId];
        require(gladiator.isActive, "Gladiator is not active");
        
        Market storage market = markets[marketId];
        require(!market.resolved, "Market already resolved");
        
        // Check if gladiator is already nominated
        for (uint256 i = 0; i < market.gladiatorTokenIds.length; i++) {
            require(market.gladiatorTokenIds[i] != tokenId, "Gladiator already nominated");
        }
        
        market.gladiators[tokenId] = gladiator;
        market.gladiatorTokenIds.push(tokenId);
        emit GladiatorNominated(marketId, gladiator.aiAddress, gladiator.name, tokenId);
    }

    function startNewRound(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(!market.resolved, "Market resolved");
        require(market.bondingCurve.isFulfilled, "Bonding not complete");
        
        uint256 currentRound = market.currentRound;
        uint256 roundIndex = market.currentRound++;
        Round storage round = market.rounds[roundIndex];
        
        round.startTime = block.timestamp;
        round.endTime = block.timestamp + 1 days; // 24 hours per round
        round.isComplete = false;

        emit RoundStarted(
            marketId,
            roundIndex,
            round.startTime,
            round.endTime
        );
        emit RoundEnded(
            marketId,
            currentRound,
            market.rounds[currentRound].endTime
        );
    }

    function submitVerdict(
        uint256 marketId,
        uint256[] calldata scores
    ) external {
        Market storage market = markets[marketId];
        require(!market.resolved, "Market resolved");
        require(msg.sender == market.judgeAI, "Not judge");
        require(market.currentRound > 0, "No active round");
        
        uint256 currentRound = market.currentRound - 1;
        Round storage round = market.rounds[currentRound];
        
        require(!round.isComplete, "Round complete");
        require(block.timestamp > round.endTime, "Round not ended");
        require(scores.length == market.gladiatorTokenIds.length, "Invalid scores");

        round.verdict = JudgeVerdict({
            scores: scores,
            timestamp: block.timestamp
        });
        round.isComplete = true;

        emit VerdictDelivered(
            marketId,
            currentRound,
            scores,
            block.timestamp
        );
    }

    function placeLimitOrder(
        uint256 marketId,
        uint256 gladiatorIndex,
        uint256 price,
        uint256 amount
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(!market.resolved, "Market resolved");
        require(gladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");
        require(market.gladiators[market.gladiatorTokenIds[gladiatorIndex]].isActive, "Gladiator not active");
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
        uint256 remainingAmount = _matchOrder(marketId, gladiatorIndex, price, amount, msg.sender);

        // Add remaining amount as new order if any
        if (remainingAmount > 0) {
            market.orderBooks[gladiatorIndex].push(Order({
                price: price,
                amount: remainingAmount,
                outcomeIndex: gladiatorIndex,
                owner: msg.sender
            }));

            // Update position for remaining amount
            market.positions[msg.sender].shares[gladiatorIndex] += remainingAmount;
        }

        // Update gladiator volume
        market.gladiatorVolumes[gladiatorIndex] += amount;

        emit OrderPlaced(marketId, msg.sender, gladiatorIndex, price, amount);
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
        uint256 gladiatorIndex,
        uint256 price,
        uint256 amount,
        address trader
    ) internal returns (uint256) {
        Market storage market = markets[marketId];
        Order[] storage orderBook = market.orderBooks[gladiatorIndex];
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
            market.positions[trader].shares[gladiatorIndex] += fillAmount;

            // Update seller position
            market.positions[order.owner].shares[gladiatorIndex] -= fillAmount;

            // Update order
            order.amount -= fillAmount;
            remainingAmount -= fillAmount;

            // Update last traded price
            market.lastTradedPrices[gladiatorIndex] = order.price;

            emit OrderMatched(marketId, trader, order.owner, gladiatorIndex, order.price, fillAmount);

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
        uint256 gladiatorIndex,
        uint256 orderId
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(gladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");
        Order[] storage orderBook = market.orderBooks[gladiatorIndex];
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

        emit OrderCancelled(marketId, msg.sender, gladiatorIndex, order.price, order.amount);
    }

    function resolveMarket(uint256 marketId, uint256 winningGladiatorIndex) external onlyOwner {
        Market storage market = markets[marketId];
        require(!market.resolved, "Already resolved");
        require(winningGladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");
        require(market.gladiators[market.gladiatorTokenIds[winningGladiatorIndex]].isActive, "Gladiator not active");

        market.resolved = true;
        market.winningGladiator = winningGladiatorIndex;
        emit MarketResolved(marketId, winningGladiatorIndex);
    }

    function redeemWinningShares(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Not resolved");

        uint256 winningShares = market.positions[msg.sender].shares[market.winningGladiator];
        require(winningShares > 0, "No winning shares");

        // Reset position
        market.positions[msg.sender].shares[market.winningGladiator] = 0;

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
            market.winningGladiator,
            market.bondingCurve,
            market.totalBondingAmount
        );
    }

    function getOrderBook(uint256 marketId, uint256 gladiatorIndex) external view returns (Order[] memory) {
        Market storage market = markets[marketId];
        require(gladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");
        return market.orderBooks[gladiatorIndex];
    }

    function getCurrentPrice(uint256 marketId, uint256 gladiatorIndex) external view returns (uint256) {
        Market storage market = markets[marketId];
        require(gladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");
        Order[] storage orderBook = market.orderBooks[gladiatorIndex];

        if (orderBook.length == 0) {
            return market.lastTradedPrices[gladiatorIndex];
        }

        return orderBook[0].price;
    }

    function getGladiators(uint256 marketId) external view returns (Gladiator[] memory) {
        Market storage market = markets[marketId];
        Gladiator[] memory result = new Gladiator[](market.gladiatorTokenIds.length);
        
        for (uint256 i = 0; i < market.gladiatorTokenIds.length; i++) {
            result[i] = market.gladiators[market.gladiatorTokenIds[i]];
        }
        
        return result;
    }

    function getGladiatorTokenIds(uint256 marketId) external view returns (uint256[] memory) {
        return markets[marketId].gladiatorTokenIds;
    }

    function getPosition(
        uint256 marketId,
        address user,
        uint256 gladiatorIndex
    ) external view returns (uint256) {
        Market storage market = markets[marketId];
        require(gladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");
        return market.positions[user].shares[gladiatorIndex];
    }

    function gladiatorVolumes(uint256 marketId, uint256 gladiatorIndex) external view returns (uint256) {
        return markets[marketId].gladiatorVolumes[gladiatorIndex];
    }

    // New read functions for DebateView
    function getBondingCurveDetails(uint256 marketId) external view returns (
        uint256 target,
        uint256 current,
        uint256 basePrice,
        uint256 currentPrice,
        bool isFulfilled,
        uint256 endTime
    ) {
        BondingCurve storage curve = markets[marketId].bondingCurve;
        return (
            curve.target,
            curve.current,
            curve.basePrice,
            curve.currentPrice,
            curve.isFulfilled,
            curve.endTime
        );
    }

    function getMarketPrices(uint256 marketId) external view returns (uint256[] memory) {
        Market storage market = markets[marketId];
        uint256[] memory prices = new uint256[](market.gladiatorTokenIds.length);
        
        for (uint256 i = 0; i < market.gladiatorTokenIds.length; i++) {
            Order[] storage orderBook = market.orderBooks[i];
            if (orderBook.length > 0) {
                prices[i] = orderBook[0].price;
            } else {
                prices[i] = market.lastTradedPrices[i];
            }
        }
        
        return prices;
    }

    function getMarketVolumes(uint256 marketId) external view returns (uint256[] memory) {
        Market storage market = markets[marketId];
        uint256[] memory volumes = new uint256[](market.gladiatorTokenIds.length);
        
        for (uint256 i = 0; i < market.gladiatorTokenIds.length; i++) {
            volumes[i] = market.gladiatorVolumes[i];
        }
        
        return volumes;
    }

    function getUserPositions(uint256 marketId, address user) external view returns (uint256[] memory) {
        Market storage market = markets[marketId];
        uint256[] memory positions = new uint256[](market.gladiatorTokenIds.length);
        
        for (uint256 i = 0; i < market.gladiatorTokenIds.length; i++) {
            positions[i] = market.positions[user].shares[i];
        }
        
        return positions;
    }

    function getOrderBookSummary(uint256 marketId, uint256 gladiatorIndex) external view returns (
        uint256[] memory prices,
        uint256[] memory amounts,
        address[] memory owners
    ) {
        Market storage market = markets[marketId];
        Order[] storage orderBook = market.orderBooks[gladiatorIndex];
        
        uint256 length = orderBook.length;
        prices = new uint256[](length);
        amounts = new uint256[](length);
        owners = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            Order storage order = orderBook[i];
            prices[i] = order.price;
            amounts[i] = order.amount;
            owners[i] = order.owner;
        }
        
        return (prices, amounts, owners);
    }

    function getTotalVolume(uint256 marketId) external view returns (uint256) {
        Market storage market = markets[marketId];
        uint256 total = 0;
        
        for (uint256 i = 0; i < market.gladiatorTokenIds.length; i++) {
            total += market.gladiatorVolumes[i];
        }
        
        return total;
    }

    // New function to submit bribes
    function submitBribe(
        uint256 marketId,
        uint256 roundId,
        string calldata information,
        uint256 gladiatorIndex
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(!market.resolved, "Market resolved");
        require(bytes(information).length <= 280, "Information too long");
        require(gladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");

        // Transfer tokens from user
        uint256 bribeAmount = 1 * 10**18; // 1 full token as bribe
        SafeTransferLib.safeTransferFrom(
            market.token,
            msg.sender,
            address(this),
            bribeAmount
        );

        // Store the bribe
        market.roundBribes[roundId].push(Bribe({
            briber: msg.sender,
            amount: bribeAmount,
            information: information,
            timestamp: block.timestamp,
            outcomeIndex: gladiatorIndex
        }));

        emit BribeSubmitted(
            marketId,
            roundId,
            msg.sender,
            bribeAmount,
            information,
            gladiatorIndex
        );
    }

    // Function to get bribes for a round
    function getBribesForRound(uint256 marketId, uint256 roundId) 
        external 
        view 
        returns (
            address[] memory bribers,
            uint256[] memory amounts,
            string[] memory information,
            uint256[] memory timestamps,
            uint256[] memory outcomeIndexes
        ) 
    {
        Bribe[] storage bribes = markets[marketId].roundBribes[roundId];
        uint256 length = bribes.length;

        bribers = new address[](length);
        amounts = new uint256[](length);
        information = new string[](length);
        timestamps = new uint256[](length);
        outcomeIndexes = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            bribers[i] = bribes[i].briber;
            amounts[i] = bribes[i].amount;
            information[i] = bribes[i].information;
            timestamps[i] = bribes[i].timestamp;
            outcomeIndexes[i] = bribes[i].outcomeIndex;
        }

        return (bribers, amounts, information, timestamps, outcomeIndexes);
    }

    // New view functions for rounds and verdicts
    function getRoundStatus(uint256 marketId, uint256 roundIndex) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool isComplete,
        bool hasVerdict,
        uint256 verdictTimestamp
    ) {
        Market storage market = markets[marketId];
        require(roundIndex < market.currentRound, "Invalid round");
        
        Round storage round = market.rounds[roundIndex];
        return (
            round.startTime,
            round.endTime,
            round.isComplete,
            round.verdict.timestamp > 0,
            round.verdict.timestamp
        );
    }

    function getRoundVerdict(uint256 marketId, uint256 roundIndex) external view returns (
        uint256[] memory scores,
        uint256 timestamp
    ) {
        Market storage market = markets[marketId];
        require(roundIndex < market.currentRound, "Invalid round");
        
        Round storage round = market.rounds[roundIndex];
        require(round.isComplete, "Round not complete");
        require(round.verdict.timestamp > 0, "No verdict yet");
        
        return (round.verdict.scores, round.verdict.timestamp);
    }

    function getCurrentRound(uint256 marketId) external view returns (
        uint256 roundIndex,
        uint256 startTime,
        uint256 endTime,
        bool isComplete
    ) {
        Market storage market = markets[marketId];
        require(market.currentRound > 0, "No rounds yet");
        
        roundIndex = market.currentRound - 1;
        Round storage round = market.rounds[roundIndex];
        
        return (
            roundIndex,
            round.startTime,
            round.endTime,
            round.isComplete
        );
    }

    function getGladiatorScores(uint256 marketId, uint256 gladiatorIndex) external view returns (
        uint256[] memory roundScores
    ) {
        Market storage market = markets[marketId];
        require(gladiatorIndex < market.gladiatorTokenIds.length, "Invalid gladiator");
        
        roundScores = new uint256[](market.currentRound);
        for (uint256 i = 0; i < market.currentRound; i++) {
            Round storage round = market.rounds[i];
            if (round.isComplete && round.verdict.timestamp > 0) {
                roundScores[i] = round.verdict.scores[gladiatorIndex];
            }
        }
        
        return roundScores;
    }

    function getLeaderboard(uint256 marketId) external view returns (
        uint256[] memory totalScores,
        uint256[] memory gladiatorIndexes
    ) {
        Market storage market = markets[marketId];
        uint256 gladiatorCount = market.gladiatorTokenIds.length;
        
        totalScores = new uint256[](gladiatorCount);
        gladiatorIndexes = new uint256[](gladiatorCount);
        
        // Calculate total scores
        for (uint256 i = 0; i < gladiatorCount; i++) {
            gladiatorIndexes[i] = i;
            for (uint256 r = 0; r < market.currentRound; r++) {
                Round storage round = market.rounds[r];
                if (round.isComplete && round.verdict.timestamp > 0) {
                    totalScores[i] += round.verdict.scores[i];
                }
            }
        }
        
        // Simple bubble sort for leaderboard (can be done off-chain for larger lists)
        for (uint256 i = 0; i < gladiatorCount - 1; i++) {
            for (uint256 j = 0; j < gladiatorCount - i - 1; j++) {
                if (totalScores[j] < totalScores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = totalScores[j];
                    totalScores[j] = totalScores[j + 1];
                    totalScores[j + 1] = tempScore;
                    
                    // Swap indexes
                    uint256 tempIndex = gladiatorIndexes[j];
                    gladiatorIndexes[j] = gladiatorIndexes[j + 1];
                    gladiatorIndexes[j + 1] = tempIndex;
                }
            }
        }
        
        return (totalScores, gladiatorIndexes);
    }
} 
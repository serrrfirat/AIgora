// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { LibString } from "solady/utils/LibString.sol";
import "./DebateMarket.sol";

/**
 * @title DebateMarketFactory
 * @notice Factory contract for creating and managing prediction markets for debates
 */
contract DebateMarketFactory is OwnableRoles {
    // Constants
    uint256 public constant _ADMIN_ROLE = _ROLE_0;

    // State Variables
    mapping(address => bool) public isVerifiedMarket;
    mapping(address => address) public marketToDebate;
    mapping(address => address) public debateToMarket;
    mapping(address => bool) public supportedTokens;
    address[] public allMarkets;
    uint256 private _marketCounter;

    struct MarketConfig {
        uint256 bondingTarget;     // Target amount for bonding curve completion
        uint256 bondingDuration;   // Duration of bonding period in seconds
        uint256 basePrice;         // Starting price for bonding curve
    }

    // Default configuration
    MarketConfig public defaultConfig;

    // Events
    event MarketCreated(
        address indexed marketAddress,
        address indexed debateAddress,
        address indexed token,
        uint256 marketId
    );
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    constructor() {
        _initializeOwner(msg.sender);

        // Set default configuration
        defaultConfig = MarketConfig({
            bondingTarget: 1000 * 10**18,  // 1000 tokens
            bondingDuration: 1 days,
            basePrice: 1 * 10**17         // 0.1 tokens
        });
    }

    /**
     * @notice Create a new prediction market for a debate
     * @param debate Address of the debate contract
     * @param token Address of the settlement token
     * @param outcomeNames Array of outcome names
     * @param config Optional market configuration (use zeros for defaults)
     * @return market Address of the newly created market
     */
    function createMarket(
        address debate,
        address token,
        string[] calldata outcomeNames,
        MarketConfig calldata config
    ) external returns (address market) {
        require(debate != address(0), "Invalid debate address");
        require(supportedTokens[token], "Token not supported");
        require(debateToMarket[debate] == address(0), "Market exists");
        require(outcomeNames.length > 1, "Need multiple outcomes");

        // Use provided config or defaults
        uint256 bondingTarget = config.bondingTarget > 0 ? config.bondingTarget : defaultConfig.bondingTarget;
        uint256 bondingDuration = config.bondingDuration > 0 ? config.bondingDuration : defaultConfig.bondingDuration;
        uint256 basePrice = config.basePrice > 0 ? config.basePrice : defaultConfig.basePrice;

        // Deploy new market
        market = address(new DebateMarket(
            token,
            debate,
            outcomeNames,
            bondingTarget,
            bondingDuration,
            basePrice
        ));
        
        // Register market
        isVerifiedMarket[market] = true;
        marketToDebate[market] = debate;
        debateToMarket[debate] = market;
        allMarkets.push(market);

        // Transfer ownership to factory owner
        DebateMarket(market).transferOwnership(owner());

        unchecked {
            _marketCounter++;
        }

        emit MarketCreated(market, debate, token, _marketCounter);
    }

    /**
     * @notice Update the default market configuration
     * @param newConfig New default configuration
     */
    function updateDefaultConfig(MarketConfig calldata newConfig) external onlyOwner {
        require(newConfig.bondingDuration >= 1 hours, "Bonding duration too short");
        require(newConfig.bondingTarget > 0, "Invalid bonding target");
        require(newConfig.basePrice > 0, "Invalid base price");
        defaultConfig = newConfig;
    }

    /**
     * @notice Add a supported settlement token
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Already supported");
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }

    /**
     * @notice Remove a supported settlement token
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Not supported");
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    /**
     * @notice Resolve a market with the final outcome
     * @param market Address of the market to resolve
     * @param outcome Final outcome (true = YES, false = NO)
     */
    function resolveMarket(address market, uint256 outcome) external onlyOwner {
        require(isVerifiedMarket[market], "Not a verified market");
        DebateMarket(market).resolveMarket(outcome);
    }

    // View Functions

    /**
     * @notice Get the total number of markets created
     */
    function getMarketCount() external view returns (uint256) {
        return _marketCounter;
    }

    /**
     * @notice Get all markets created by this factory
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    /**
     * @notice Check if a market exists for a debate
     * @param debate Address of the debate contract
     */
    function hasMarket(address debate) external view returns (bool) {
        return debateToMarket[debate] != address(0);
    }

    /**
     * @notice Get the market address for a debate
     * @param debate Address of the debate contract
     */
    function getMarket(address debate) external view returns (address) {
        return debateToMarket[debate];
    }

    /**
     * @notice Get the debate address for a market
     * @param market Address of the market contract
     */
    function getDebate(address market) external view returns (address) {
        return marketToDebate[market];
    }
} 
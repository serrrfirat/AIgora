// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./Debate.sol";

/**
 * @title DebateFactory
 * @notice Factory contract for creating new Debate instances with ERC20 token support
 */
contract DebateFactory is AccessControl {
    using Counters for Counters.Counter;
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    Counters.Counter private _debateCounter;
    
    struct DebateConfig {
        uint256 bondingTarget;     // Target amount for bonding curve completion (in token decimals)
        uint256 bondingDuration;   // Duration of bonding period in seconds
        uint256 basePrice;         // Starting price for bonding curve (in token decimals)
        uint256 minimumDuration;   // Minimum debate duration in seconds
    }
    
    struct TokenInfo {
        string name;
        string symbol;
        uint8 decimals;
        bool isValid;
    }
    
    DebateConfig public defaultConfig;
    mapping(address => bool) public verifiedDebates;
    mapping(address => TokenInfo) public supportedTokens;
    address[] public allDebates;
    
    event DebateCreated(
        address indexed debateAddress,
        string topic,
        address indexed creator,
        address indexed token,
        uint256 debateId
    );
    
    event TokenAdded(
        address indexed token,
        string name,
        string symbol,
        uint8 decimals
    );
    
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        
        // Set default configuration (using 18 decimals as base)
        defaultConfig = DebateConfig({
            bondingTarget: 1000 * 10**18, // 1000 tokens
            bondingDuration: 1 days,
            basePrice: 1 * 10**17,    // 0.1 tokens
            minimumDuration: 1 days
        });
    }
    
    function addSupportedToken(address tokenAddress) 
        external 
        onlyRole(OPERATOR_ROLE) 
    {
        require(tokenAddress != address(0), "Invalid token address");
        require(!supportedTokens[tokenAddress].isValid, "Token already supported");
        
        IERC20Metadata token = IERC20Metadata(tokenAddress);
        
        // This will revert if the token doesn't implement the metadata interface
        string memory name = token.name();
        string memory symbol = token.symbol();
        uint8 decimals = token.decimals();
        
        supportedTokens[tokenAddress] = TokenInfo({
            name: name,
            symbol: symbol,
            decimals: decimals,
            isValid: true
        });
        
        emit TokenAdded(tokenAddress, name, symbol, decimals);
    }
    
    function updateDefaultConfig(DebateConfig calldata newConfig) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newConfig.minimumDuration >= 1 hours, "Duration too short");
        require(newConfig.bondingDuration < newConfig.minimumDuration, "Invalid bonding duration");
        defaultConfig = newConfig;
    }
    
    function createDebate(
        string memory topic,
        uint256 duration,
        address tokenAddress,
        DebateConfig memory config
    ) external returns (address) {
        require(duration >= defaultConfig.minimumDuration, "Duration too short");
        require(config.bondingDuration < duration, "Invalid bonding duration");
        require(supportedTokens[tokenAddress].isValid, "Token not supported");
        
        TokenInfo memory tokenInfo = supportedTokens[tokenAddress];
        
        // Adjust default values based on token decimals if not specified
        if (config.bondingTarget == 0) {
            config.bondingTarget = adjustForDecimals(
                defaultConfig.bondingTarget, 
                18, 
                tokenInfo.decimals
            );
        }
        if (config.basePrice == 0) {
            config.basePrice = adjustForDecimals(
                defaultConfig.basePrice,
                18,
                tokenInfo.decimals
            );
        }
        if (config.bondingDuration == 0) config.bondingDuration = defaultConfig.bondingDuration;
        
        Debate newDebate = new Debate(
            topic,
            tokenAddress,
            duration,
            config.bondingTarget,
            config.bondingDuration,
            config.basePrice
        );
        
        verifiedDebates[address(newDebate)] = true;
        allDebates.push(address(newDebate));
        
        _debateCounter.increment();
        emit DebateCreated(
            address(newDebate), 
            topic, 
            msg.sender, 
            tokenAddress,
            _debateCounter.current()
        );
        
        return address(newDebate);
    }

    function adjustForDecimals(
        uint256 amount,
        uint8 fromDecimals,
        uint8 toDecimals
    ) internal pure returns (uint256) {
        if (fromDecimals == toDecimals) return amount;
        
        if (fromDecimals > toDecimals) {
            return amount / (10 ** (fromDecimals - toDecimals));
        } else {
            return amount * (10 ** (toDecimals - fromDecimals));
        }
    }

    function getDebateCount() external view returns (uint256) {
        return _debateCounter.current();
    }

    function isVerifiedDebate(address debateAddress) external view returns (bool) {
        return verifiedDebates[debateAddress];
    }

    function getTokenInfo(address token) 
        external 
        view 
        returns (TokenInfo memory) 
    {
        require(supportedTokens[token].isValid, "Token not supported");
        return supportedTokens[token];
    }
}
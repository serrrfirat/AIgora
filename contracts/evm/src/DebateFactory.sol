// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { OwnableRoles } from "solady/auth/OwnableRoles.sol";
import { LibString } from "solady/utils/LibString.sol";
import "./Debate.sol";

/**
 * @title DebateFactory
 * @notice Factory contract for creating new Debate instances with ERC20 token support
 */
contract DebateFactory is OwnableRoles {
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
    uint256 private _debateCounter;
    
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
        _initializeOwner(msg.sender);
        
        // Set default configuration (using 18 decimals as base)
        defaultConfig = DebateConfig({
            bondingTarget: 1000 * 10**18, // 1000 tokens
            bondingDuration: 1 days,
            basePrice: 1 * 10**17,    // 0.1 tokens
            minimumDuration: 1 days
        });
    }
    
    function updateDefaultConfig(DebateConfig calldata newConfig) external onlyOwner {
        require(newConfig.minimumDuration >= 1 hours, "Minimum duration too short");
        require(newConfig.bondingDuration > 0, "Bonding duration must be > 0");
        defaultConfig = newConfig;
    }
    
    function addSupportedToken(
        address token,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) external onlyOwner {
        supportedTokens[token] = TokenInfo({
            name: name,
            symbol: symbol,
            decimals: decimals,
            isValid: true
        });
        
        emit TokenAdded(token, name, symbol, decimals);
    }
    
    function createDebate(
        string memory topic,
        uint256 duration,
        address tokenAddress,
        DebateConfig memory config,
        address[] memory judges
    ) external returns (address) {
        require(duration >= defaultConfig.minimumDuration, "Duration too short");
        require(config.bondingDuration < duration, "Invalid bonding duration");
        require(supportedTokens[tokenAddress].isValid, "Token not supported");
                
        // Adjust default values based on token decimals if not specified
        if (config.bondingTarget == 0) {
            config.bondingTarget = adjustForDecimals(
                defaultConfig.bondingTarget, 
                18, 
                supportedTokens[tokenAddress].decimals
            );
        }
        if (config.basePrice == 0) {
            config.basePrice = adjustForDecimals(
                defaultConfig.basePrice,
                18,
                supportedTokens[tokenAddress].decimals
            );
        }
        if (config.bondingDuration == 0) config.bondingDuration = defaultConfig.bondingDuration;
        
        Debate newDebate = new Debate(
            topic,
            tokenAddress,
            duration,
            config.bondingTarget,
            config.bondingDuration,
            config.basePrice,
            5,
            judges
        );
        
        verifiedDebates[address(newDebate)] = true;
        allDebates.push(address(newDebate));
        
        unchecked {
            _debateCounter++;
        }
        
        emit DebateCreated(
            address(newDebate), 
            topic, 
            msg.sender, 
            tokenAddress,
            _debateCounter
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
        return _debateCounter;
    }

    function isVerifiedDebate(address debateAddress) external view returns (bool) {
        return verifiedDebates[debateAddress];
    }

    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        require(supportedTokens[token].isValid, "Token not supported");
        return supportedTokens[token];
    }

    function getAllDebates() external view returns (address[] memory) {
        return allDebates;
    }
} 
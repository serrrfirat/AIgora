// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Script } from "forge-std/Script.sol";
import { DebateMarketFactory } from "../src/DebateMarketFactory.sol";
import { DebateMarket } from "../src/DebateMarket.sol";
import { console2 } from "forge-std/console2.sol";
import { Utils } from "./Utils.sol";

contract DeployDebateMarket is Script, Utils {
    DebateMarketFactory public factory;
    address public testToken;
    address public testDebate;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying contracts with address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Factory
        factory = new DebateMarketFactory();
        console2.log("DebateMarketFactory deployed at:", address(factory));

        // Configure default settings
        DebateMarketFactory.MarketConfig memory config = DebateMarketFactory.MarketConfig({
            bondingTarget: 1000 * 10**18,  // 1000 tokens
            bondingDuration: 1 days,
            basePrice: 1 * 10**17         // 0.1 tokens
        });
        
        factory.updateDefaultConfig(config);
        console2.log("Default config updated");

        // Add a test token (replace with actual token)
        testToken = address(0xD248d2f09bFbe04e67fC7Fea08828D6AD6d95B6D); // Replace with actual token
        factory.addSupportedToken(testToken);
        console2.log("Test token added to supported tokens");

        // Create a sample market
        string[] memory outcomeNames = new string[](3);
        outcomeNames[0] = "Outcome A";
        outcomeNames[1] = "Outcome B";
        outcomeNames[2] = "Outcome C";

        // Create market for a debate (replace with actual debate address)
        testDebate = address(0x1234567890123456789012345678901234567890); // Replace with actual debate
        
        try factory.createMarket(
            testDebate,
            testToken,
            outcomeNames,
            config
        ) returns (address marketAddress) {
            console2.log("Sample market created at:", marketAddress);
        } catch Error(string memory reason) {
            console2.log("Failed to create market:", reason);
        }

        vm.stopBroadcast();

        writeBaseJson();
        logDeploymentSummary();
    }

    function writeBaseJson() internal {
            string memory jsonObj = "{"
            '"network":"","factory":"","testToken":"","testDebate":""' "}";        
            vm.writeJson(jsonObj, "./deployments.json");
    }

    function logDeploymentSummary() internal {
        writeTo(address(factory), ".factory");
        writeTo(testToken, ".testToken");
        writeTo(testDebate, ".testDebate");
    }
} 
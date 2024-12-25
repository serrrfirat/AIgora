// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Script } from "forge-std/Script.sol";
import { DebateFactory } from "../src/DebateFactory.sol";
import { console2 } from "forge-std/console2.sol";

contract DeployDebate is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying contracts with address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Factory
        DebateFactory factory = new DebateFactory();
        console2.log("DebateFactory deployed at:", address(factory));

        // Configure default settings
        DebateFactory.DebateConfig memory config = DebateFactory.DebateConfig({
            bondingTarget: 1_000_000_000,  // 1B tokens (adjust based on decimals)
            bondingDuration: 1 days,
            basePrice: 100_000,           // Initial price (adjust based on decimals)
            minimumDuration: 7 days
        });
        
        factory.updateDefaultConfig(config);
        console2.log("Default config updated");

        // Add a test token (replace with actual token address)
        address testToken = address(0xD248d2f09bFbe04e67fC7Fea08828D6AD6d95B6D); // Replace with actual token
        // Create a sample debate
        address[] memory judges = new address[](3);
        judges[0] = deployer;
        judges[1] = address(0x1111111111111111111111111111111111111111); // Replace with actual judge
        judges[2] = address(0x2222222222222222222222222222222222222222); // Replace with actual judge

        try factory.createDebate(
            "Sample Debate Topic",
            30 days,
            testToken,
            config,
            judges
        ) returns (address debateAddress) {
            console2.log("Sample debate created at:", debateAddress);
        } catch Error(string memory reason) {
            console2.log("Failed to create debate:", reason);
        }

        vm.stopBroadcast();
    }
} 
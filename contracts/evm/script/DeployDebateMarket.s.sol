// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Script } from "forge-std/Script.sol";
import { DebateFactory } from "../src/DebateFactory.sol";
import { MockToken } from "./MockToken.sol";
import { console2 } from "forge-std/console2.sol";
import { Utils } from "./Utils.sol";

contract DeployDebateMarket is Script, Utils {
    DebateFactory public factory;
    MockToken public mockToken;
    uint256 public sampleDebateId;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying contracts with address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock Token first
        mockToken = new MockToken();
        console2.log("MockToken deployed at:", address(mockToken));

        // Deploy Factory
        factory = new DebateFactory();
        console2.log("DebateFactory deployed at:", address(factory));

        // Create a sample debate
        address[] memory judges = new address[](1);
        judges[0] = deployer; // Using deployer as the judge for testing
        
        sampleDebateId = factory.createDebate(
            "Sample Debate Topic",
            7 days, // 7 days duration
            5, // Max participants
            judges
        );
        console2.log("Sample debate created with ID:", sampleDebateId);

        vm.stopBroadcast();

        writeBaseJson();
        logDeploymentSummary();
    }

    function writeBaseJson() internal {
        string memory jsonObj = "{"
            '"factory":"","mockToken":"","sampleDebateId":""' "}";        
        vm.writeJson(jsonObj, "./deployments.json");
    }

    function logDeploymentSummary() internal {
        writeTo(address(factory), ".factory");
        writeTo(address(mockToken), ".mockToken");
    }
} 
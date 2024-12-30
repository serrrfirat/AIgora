// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Script } from "forge-std/Script.sol";
import { DebateFactory } from "../src/DebateFactory.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { MockToken } from "../src/mocks/MockToken.sol";
import { console2 } from "forge-std/console2.sol";
import { Utils } from "./Utils.sol";
contract DeployDebateMarket is Script, Utils {
    MockToken public token;
    DebateFactory public debateFactory;
    MarketFactory public marketFactory;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying contracts with address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Token
        token = new MockToken();
        console2.log("DebateToken deployed at:", address(token));

        // Deploy Factories
        debateFactory = new DebateFactory();
        console2.log("DebateFactory deployed at:", address(debateFactory));

        marketFactory = new MarketFactory();
        console2.log("DebateMarketFactory deployed at:", address(marketFactory));

        // Create sample debate
        address[] memory judges = new address[](1);
        judges[0] = deployer;
        
        uint256 debateId = debateFactory.createDebate(
            "Sample Debate Topic",
            7 days,
            5,
            judges
        );
        console2.log("Sample debate created with ID:", debateId);

        // Create sample market
        string[] memory outcomes = new string[](2);
        outcomes[0] = "Yes";
        outcomes[1] = "No";

        uint256 marketId = marketFactory.createMarket(
            address(token),
            debateId,
            outcomes,
            1000 * 10**18,
            1 days,
            1 * 10**17
        );
        console2.log("Sample market created at:", marketId);
        
        vm.stopBroadcast();
        // Write deployment info to JSON
        writeBaseJson();
        writeTo(address(token), ".token ");
        writeTo(address(debateFactory), ".debateFactory");
        writeTo(address(marketFactory), ".marketFactory");
    }

     function writeBaseJson() internal {
        string memory jsonObj = "{"
            '"token":"","debateFactory":"","marketFactory":"","debateId":"","marketId":"",' "}";
        vm.writeJson(jsonObj, "./deployments.json");
    }
} 
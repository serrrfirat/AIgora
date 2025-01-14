// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Script } from "forge-std/Script.sol";
import { DebateFactory } from "../src/DebateFactory.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { MockToken } from "../src/mocks/MockToken.sol";
import { console2 } from "forge-std/console2.sol";
import { Utils } from "./Utils.sol";
import { GladiatorNFT } from "../src/GladiatorNFT.sol";

contract DeployDebateMarket is Script, Utils {
    MockToken public token;
    DebateFactory public debateFactory;
    MarketFactory public marketFactory;
    GladiatorNFT public gladiatorNFT;

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

        gladiatorNFT = new GladiatorNFT();
        console2.log("GladiatorNFT deployed at:", address(gladiatorNFT));

        marketFactory = new MarketFactory(address(gladiatorNFT));
        console2.log("MarketFactory deployed at:", address(marketFactory));

        // Set MarketFactory in GladiatorNFT
        gladiatorNFT.setMarketFactory(address(marketFactory));

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

        // Create market
        uint256 marketId = marketFactory.createMarket(
            address(token),
            debateId,
            deployer, // Judge AI address
            1000 * 10**18, // Bonding target
            1 days, // Bonding duration
            1 * 10**17 // Base price
        );
        console2.log("Sample market created with ID:", marketId);

        // Register gladiators
        uint256 gpt4TokenId = marketFactory.registerGladiator("GPT-4 Champion", "GPT-4", "pk1");
        uint256 claudeTokenId = marketFactory.registerGladiator("Claude Warrior", "Claude-2", "pk2");
        uint256 llamaTokenId = marketFactory.registerGladiator("Llama Sage", "Llama-2", "pk3");

        // Nominate gladiators for the market
        marketFactory.nominateGladiator(gpt4TokenId, marketId);
        marketFactory.nominateGladiator(claudeTokenId, marketId);
        marketFactory.nominateGladiator(llamaTokenId, marketId);
        
        vm.stopBroadcast();

        // Write deployment info to JSON
        writeBaseJson();
        writeTo(address(token), ".token");
        writeTo(address(debateFactory), ".debateFactory");
        writeTo(address(marketFactory), ".marketFactory");
        writeTo(address(gladiatorNFT), ".gladiatorNFT");
        writeTo(debateId, ".debateId");
        writeTo(marketId, ".marketId");
    }

    function writeTo(uint256 value, string memory key) internal {
        vm.writeJson(vm.toString(value), "./deployments.json", key);
    }

    function writeBaseJson() internal {
        string memory jsonObj = "{"
            '"token":"","debateFactory":"","marketFactory":"","gladiatorNFT":"",'
            '"debateId":"","marketId":"","gladiators":{'
            '"gpt4":{"address":"","name":"GPT-4 Champion","model":"GPT-4"},'
            '"claude":{"address":"","name":"Claude Warrior","model":"Claude-2"},'
            '"llama":{"address":"","name":"Llama Sage","model":"Llama-2"}'
            "}}";
        vm.writeJson(jsonObj, "./deployments.json");
    }
} 
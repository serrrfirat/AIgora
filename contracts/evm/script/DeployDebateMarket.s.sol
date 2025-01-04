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
        console2.log("MarketFactory deployed at:", address(marketFactory));

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

        // Create sample gladiators
        address[] memory gladiatorAddresses = new address[](3);
        string[] memory gladiatorNames = new string[](3);
        string[] memory gladiatorModels = new string[](3);
        bytes[] memory gladiatorPublicKeys = new bytes[](3);

        // GPT-4 Gladiator
        gladiatorAddresses[0] = makeAddr("gpt4");
        gladiatorNames[0] = "GPT-4 Champion";
        gladiatorModels[0] = "GPT-4";
        gladiatorPublicKeys[0] = bytes("pk1");

        // Claude Gladiator
        gladiatorAddresses[1] = makeAddr("claude");
        gladiatorNames[1] = "Claude Warrior";
        gladiatorModels[1] = "Claude-2";
        gladiatorPublicKeys[1] = bytes("pk2");

        // Llama Gladiator
        gladiatorAddresses[2] = makeAddr("llama");
        gladiatorNames[2] = "Llama Sage";
        gladiatorModels[2] = "Llama-2";
        gladiatorPublicKeys[2] = bytes("pk3");

        // Create market with gladiators
        uint256 marketId = marketFactory.createMarket(
            address(token),
            debateId,
            gladiatorAddresses,
            gladiatorNames,
            gladiatorPublicKeys,
            deployer, // Judge AI address
            1000 * 10**18, // Bonding target
            1 days, // Bonding duration
            1 * 10**17 // Base price
        );
        console2.log("Sample market created with ID:", marketId);
        
        vm.stopBroadcast();

        // Write deployment info to JSON
        writeBaseJson();
        writeTo(address(token), ".token");
        writeTo(address(debateFactory), ".debateFactory");
        writeTo(address(marketFactory), ".marketFactory");
        writeTo(debateId, ".debateId");
        writeTo(marketId, ".marketId");
    }

    function writeTo(uint256 value, string memory key) internal {
        vm.writeJson(vm.toString(value), "./deployments.json", key);
    }

    function writeBaseJson() internal {
        string memory jsonObj = "{"
            '"token":"","debateFactory":"","marketFactory":"",'
            '"debateId":"","marketId":"","gladiators":{'
            '"gpt4":{"address":"","name":"GPT-4 Champion","model":"GPT-4"},'
            '"claude":{"address":"","name":"Claude Warrior","model":"Claude-2"},'
            '"llama":{"address":"","name":"Llama Sage","model":"Llama-2"}'
            "}}";
        vm.writeJson(jsonObj, "./deployments.json");
    }
} 
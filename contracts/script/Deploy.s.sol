// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/DebateFactory.sol";

contract DeployDebateFactory is Script {
    function run() external returns (DebateFactory) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy DebateFactory
        DebateFactory factory = new DebateFactory();

        // Add test token (USDC on Sepolia)
        address testToken = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
        factory.addSupportedToken(testToken);

        // Configure default settings
        DebateFactory.DebateConfig memory config = DebateFactory.DebateConfig({
            bondingTarget: 1000 * 10**6,     // 1000 USDC (6 decimals)
            bondingDuration: 1 days,
            basePrice: 1 * 10**5,            // 0.1 USDC
            minimumDuration: 1 days
        });

        factory.updateDefaultConfig(config);

        // Transfer ownership if needed
        if (deployerAddress != msg.sender) {
            factory.transferOwnership(deployerAddress);
        }

        vm.stopBroadcast();

        return factory;
    }
}

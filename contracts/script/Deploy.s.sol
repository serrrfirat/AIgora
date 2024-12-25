// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <=0.9.0;

import { BaseScript } from "./Base.s.sol";
import { DebateFactory } from "../src/DebateFactory.sol";
import { Debate } from "../src/Debate.sol";

contract Deploy is BaseScript {
    function run() public returns (DebateFactory factory) {
        vm.startBroadcast(broadcaster);

        // Deploy the factory
        factory = new DebateFactory();

        // Set up default configuration
        DebateFactory.DebateConfig memory config = DebateFactory.DebateConfig({
            bondingTarget: 1000 * 10**18,    // 1000 tokens
            bondingDuration: 1 days,
            basePrice: 1 * 10**17,           // 0.1 tokens
            minimumDuration: 1 days
        });

        // Update factory config
        factory.updateDefaultConfig(config);

        vm.stopBroadcast();
    }
}

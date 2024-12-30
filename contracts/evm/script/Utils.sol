// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

contract Utils is Script {
    function writeTo(address addr, string memory obj) internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployments.json");

        vm.writeJson(vm.toString(addr), path, obj);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        // Mint 1 million tokens to deployer (with 18 decimals)
        _mint(msg.sender, 1_000_000 * 10**18);
    }
} 
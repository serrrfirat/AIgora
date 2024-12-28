// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Test } from "forge-std/Test.sol";
import { console2 } from "forge-std/console2.sol";
import { DebateMarket } from "../src/DebateMarket.sol";
import { Debate } from "../src/Debate.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract DebateMarketTest is Test {
    DebateMarket public market;
    Debate public debate;
    MockERC20 public token;
    
    address public deployer;
    address public trader1;
    address public trader2;
    address public trader3;
    address[] public judges;

    uint256 public constant INITIAL_BALANCE = 1000 * 10**18;
    uint256 public constant BONDING_TARGET = 100 * 10**18;
    uint256 public constant BASE_PRICE = 1 * 10**17; // 0.1 tokens
    uint256 public constant BONDING_DURATION = 1 days;
    uint256 public constant EARLY_BETTER_BONUS = 20; // 20%

    string[] public outcomeNames;

    function setUp() public {
        deployer = address(this);
        trader1 = makeAddr("trader1");
        trader2 = makeAddr("trader2");
        trader3 = makeAddr("trader3");

        // Setup judges for debate
        judges = new address[](3);
        judges[0] = makeAddr("judge1");
        judges[1] = makeAddr("judge2");
        judges[2] = makeAddr("judge3");

        // Deploy mock token
        token = new MockERC20("Test Token", "TEST", 18);

        // Mint tokens to traders
        token.mint(trader1, INITIAL_BALANCE);
        token.mint(trader2, INITIAL_BALANCE);
        token.mint(trader3, INITIAL_BALANCE);

        // Setup outcome names
        outcomeNames = new string[](5);
        outcomeNames[0] = "Outcome A";
        outcomeNames[1] = "Outcome B";
        outcomeNames[2] = "Outcome C";
        outcomeNames[3] = "Outcome D";
        outcomeNames[4] = "Outcome E";

        // Deploy debate contract
        debate = new Debate(
            "Test Debate Topic",
            7 days,
            5,
            judges
        );

        // Deploy market contract
        market = new DebateMarket(
            address(token),
            address(debate),
            outcomeNames,
            BONDING_TARGET,
            BONDING_DURATION,
            BASE_PRICE
        );

        // Link market to debate
        debate.setMarket(address(market));

        // Approve market contract to spend tokens
        vm.prank(trader1);
        token.approve(address(market), type(uint256).max);
        vm.prank(trader2);
        token.approve(address(market), type(uint256).max);
        vm.prank(trader3);
        token.approve(address(market), type(uint256).max);
    }

    function test_Initialization() public {
        assertEq(market.token(), address(token));
        assertEq(market.debate(), address(debate));
        assertFalse(market.resolved());
        
        // Check bonding curve setup
        (
            uint256 target,
            uint256 current,
            uint256 basePrice,
            uint256 currentPrice,
            bool isFulfilled,
            uint256 endTime
        ) = market.bondingCurve();
        
        assertEq(target, BONDING_TARGET);
        assertEq(current, 0);
        assertEq(basePrice, BASE_PRICE);
        assertEq(currentPrice, BASE_PRICE);
        assertFalse(isFulfilled);
        assertEq(endTime, block.timestamp + BONDING_DURATION);
    }

    function test_PlaceLimitOrder_DuringBonding() public {
        uint256 amount = 10 * 10**18;
        uint256 price = 5000; // 50%
        
        vm.prank(trader1);
        market.placeLimitOrder(0, price, amount);

        // Check order was placed
        DebateMarket.Order[] memory orders = market.getOrderBook(0);
        assertEq(orders.length, 1);
        assertEq(orders[0].price, price);
        assertEq(orders[0].amount, amount);
        assertEq(orders[0].owner, trader1);

        // Check position is equal to amount (no bonus)
        assertEq(market.getPosition(trader1, 0), amount);
    }

    function test_PlaceLimitOrder_AfterBonding() public {
        // Skip bonding period
        vm.warp(block.timestamp + BONDING_DURATION + 1);

        uint256 amount = 10 * 10**18;
        uint256 price = 5000; // 50%
        
        vm.prank(trader1);
        market.placeLimitOrder(0, price, amount);

        // Check order was placed without early better bonus
        DebateMarket.Order[] memory orders = market.getOrderBook(0);
        assertEq(orders.length, 1);
        assertEq(orders[0].price, price);
        assertEq(orders[0].amount, amount);
        assertEq(orders[0].owner, trader1);

        // Check position does not include bonus
        assertEq(market.getPosition(trader1, 0), amount);
    }

    function test_BondingCurve_LinearPriceIncrease() public {
        uint256 amount = BONDING_TARGET / 4;
        uint256 price = 5000; // 50%
        
        // Place first order (25% of target)
        vm.prank(trader1);
        market.placeLimitOrder(0, price, amount);

        // Check price increased by 25%
        (,,, uint256 currentPrice,,) = market.bondingCurve();
        assertEq(currentPrice, BASE_PRICE + (BASE_PRICE * amount) / BONDING_TARGET);

        // Place second order (another 25%)
        vm.prank(trader2);
        market.placeLimitOrder(1, price, amount);

        // Check price increased by 50%
        (,,, currentPrice,,) = market.bondingCurve();
        assertEq(currentPrice, BASE_PRICE + (BASE_PRICE * (amount * 2)) / BONDING_TARGET);
    }

    function test_OrderMatching_MultipleOutcomes() public {
        uint256 amount = 10 * 10**18;
        uint256 price = 5000; // 50%
        
        // Trader1 places orders for multiple outcomes
        vm.startPrank(trader1);
        market.placeLimitOrder(0, price, amount);
        market.placeLimitOrder(1, price, amount);
        market.placeLimitOrder(2, price, amount);
        vm.stopPrank();

        // Trader2 matches orders
        vm.startPrank(trader2);
        market.placeLimitOrder(0, price, amount / 2);
        market.placeLimitOrder(1, price, amount);
        market.placeLimitOrder(2, price, amount / 2);
        vm.stopPrank();

        // Check positions for trader1 (remaining amounts after matches)
        assertEq(market.getPosition(trader1, 0), amount / 2); // Half matched
        assertEq(market.getPosition(trader1, 1), 0);         // Fully matched
        assertEq(market.getPosition(trader1, 2), amount / 2); // Half matched
        
        // Check positions for trader2 (matched amounts)
        assertEq(market.getPosition(trader2, 0), amount / 2);
        assertEq(market.getPosition(trader2, 1), amount);
        assertEq(market.getPosition(trader2, 2), amount / 2);
    }

    function test_MarketResolution_MultipleOutcomes() public {
        uint256 amount = 10 * 10**18;
        uint256 price = 5000; // 50%
        
        // Place orders for different outcomes
        vm.startPrank(trader1);
        market.placeLimitOrder(0, price, amount);
        market.placeLimitOrder(1, price, amount);
        vm.stopPrank();

        vm.startPrank(trader2);
        market.placeLimitOrder(2, price, amount);
        market.placeLimitOrder(3, price, amount);
        vm.stopPrank();

        vm.prank(deployer);
        market.resolveMarket(2);

        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 2);

        uint256 expectedWinnings = (amount * price) / market.BASIS_POINTS();

        vm.prank(trader2);
        market.redeemWinningShares();

        assertEq(token.balanceOf(trader2), INITIAL_BALANCE - expectedWinnings + expectedWinnings);
        assertEq(token.balanceOf(trader1), INITIAL_BALANCE - (2 * expectedWinnings)); // Lost both bets
    }

    function test_RevertWhen_InvalidOrderParameters() public {
        uint256 amount = 10 * 10**18;
        
        // Test invalid price
        vm.prank(trader1);
        vm.expectRevert("Invalid price");
        market.placeLimitOrder(0, 0, amount);

        vm.prank(trader1);
        vm.expectRevert("Invalid price");
        market.placeLimitOrder(0, 10000, amount);

        // Test invalid outcome
        vm.prank(trader1);
        vm.expectRevert("Invalid outcome");
        market.placeLimitOrder(99, 5000, amount);

        // Test invalid amount
        vm.prank(trader1);
        vm.expectRevert("Order too small");
        market.placeLimitOrder(0, 5000, 1);
    }

    function test_LastTradedPrices() public {
        uint256 amount = 10 * 10**18;
        uint256 price1 = 5000;
        uint256 price2 = 6000;
        
        // Place and match orders at different prices
        vm.prank(trader1);
        market.placeLimitOrder(0, price1, amount);

        vm.prank(trader2);
        market.placeLimitOrder(0, price2, amount);

        assertEq(market.lastTradedPrices(0), price1);
    }
} 
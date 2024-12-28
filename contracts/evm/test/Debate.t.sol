// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Test } from "forge-std/Test.sol";
import { console2 } from "forge-std/console2.sol";
import { Debate } from "../src/Debate.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract DebateTest is Test {
    Debate public debate;
    MockERC20 public token;
    
    address public deployer;
    address public judge1;
    address public judge2;
    address public judge3;
    address public better1;
    address public better2;
    address public better3;

    uint256 public constant INITIAL_BALANCE = 1000 * 10**18;
    uint256 public constant BONDING_TARGET = 100 * 10**18;
    uint256 public constant BASE_PRICE = 1 * 10**18;
    uint256 public constant DURATION = 7 days;
    uint256 public constant BONDING_DURATION = 1 days;
    uint256 public constant TOTAL_ROUNDS = 5;

    function setUp() public {
        deployer = address(this);
        judge1 = makeAddr("judge1");
        judge2 = makeAddr("judge2");
        judge3 = makeAddr("judge3");
        better1 = makeAddr("better1");
        better2 = makeAddr("better2");
        better3 = makeAddr("better3");

        // Deploy mock token
        token = new MockERC20("Test Token", "TEST", 18);

        // Mint tokens to betters
        token.mint(better1, INITIAL_BALANCE);
        token.mint(better2, INITIAL_BALANCE);
        token.mint(better3, INITIAL_BALANCE);

        // Setup judges
        address[] memory judges = new address[](3);
        judges[0] = judge1;
        judges[1] = judge2;
        judges[2] = judge3;

        // Deploy debate contract
        debate = new Debate(
            "Test Debate Topic",
            address(token),
            DURATION,
            BONDING_TARGET,
            BONDING_DURATION,
            BASE_PRICE,
            TOTAL_ROUNDS,
            judges
        );

        // Approve debate contract to spend tokens
        vm.prank(better1);
        token.approve(address(debate), type(uint256).max);
        vm.prank(better2);
        token.approve(address(debate), type(uint256).max);
        vm.prank(better3);
        token.approve(address(debate), type(uint256).max);
    }

    function test_Initialization() public {
        assertEq(debate.topic(), "Test Debate Topic");
        assertEq(debate.creator(), address(this));
        assertEq(debate.token(), address(token));
        assertEq(debate.totalRounds(), TOTAL_ROUNDS);
        assertEq(debate.currentRound(), 1);
        assertTrue(debate.isActive());
    }

    function test_PlaceBet() public {
        uint256 betAmount = 10 * 10**18;
        
        vm.prank(better1);
        debate.placeBet(betAmount, true, "Evidence 1", "@better1");

        (uint256 amount, bool prediction, bool isEarly, 
        string memory evidence, string memory twitter) = debate.getBetInfo(better1);
        
        assertEq(amount, betAmount);
        assertTrue(prediction);
        assertTrue(isEarly);
        assertEq(evidence, "Evidence 1");
        assertEq(twitter, "@better1");
        assertEq(token.balanceOf(address(debate)), betAmount);
    }

    function test_PlaceBetAfterBonding() public {
        // Skip bonding period
        vm.warp(block.timestamp + BONDING_DURATION + 1);
        
        uint256 betAmount = 10 * 10**18;
        vm.prank(better1);
        debate.placeBet(betAmount, true, "Evidence 1", "@better1");

        (uint256 amount, bool prediction, bool isEarly,,) = debate.getBetInfo(better1);
        
        assertEq(amount, betAmount);
        assertTrue(prediction);
        assertFalse(isEarly);
    }

    function test_ScoreRound() public {
        // Place some bets first
        vm.prank(better1);
        debate.placeBet(10 * 10**18, true, "Evidence 1", "@better1");

        // Score from all judges
        vm.prank(judge1);
        debate.scoreRound(1, 7);
        vm.prank(judge2);
        debate.scoreRound(1, 8);
        vm.prank(judge3);
        debate.scoreRound(1, 9);

        (bool isComplete, uint256 judgeCount, uint256 totalScore,,) = debate.getRoundInfo(1);
        
        assertTrue(isComplete);
        assertEq(judgeCount, 3);
        assertEq(totalScore, 24);
        assertEq(debate.currentRound(), 2); // Should have moved to next round
    }

    function test_CompleteDebateAndDistributeRewards() public {
        // Place bets
        uint256 betAmount = 10 * 10**18;
        vm.prank(better1);
        debate.placeBet(betAmount, true, "Evidence 1", "@better1");
        vm.prank(better2);
        debate.placeBet(betAmount, false, "Evidence 2", "@better2");
        vm.prank(better3);
        debate.placeBet(betAmount, true, "Evidence 3", "@better3");

        // Score all rounds with high scores (favoring TRUE outcome)
        for (uint256 round = 1; round <= 4; round++) {
            vm.prank(judge1);
            debate.scoreRound(round, 8);
            vm.prank(judge2);
            debate.scoreRound(round, 9);
            vm.prank(judge3);
            debate.scoreRound(round, 10);
        }

        // Check debate is completed
        assertFalse(debate.isActive());

        // Verify final balances
        uint256 better1Balance = token.balanceOf(better1);
        uint256 better2Balance = token.balanceOf(better2);
        uint256 better3Balance = token.balanceOf(better3);

        // Winners (better1 and better3) should get their initial bet back plus winnings
        assertTrue(better1Balance > INITIAL_BALANCE - betAmount, "Better1 should win");
        assertTrue(better2Balance < INITIAL_BALANCE, "Better2 should lose");
        assertTrue(better3Balance > INITIAL_BALANCE - betAmount, "Better3 should win");

        // Try to score after debate is finalized
        vm.expectRevert("Debate not active");
        vm.prank(judge1);
        debate.scoreRound(5, 8);
    }

    function test_RevertWhen_BetTwice() public {
        uint256 betAmount = 10 * 10**18;
        
        vm.prank(better1);
        debate.placeBet(betAmount, true, "Evidence 1", "@better1");

        vm.expectRevert("Already bet");
        vm.prank(better1);
        debate.placeBet(betAmount, true, "Evidence 1", "@better1");
    }

    function test_RevertWhen_UnauthorizedJudge() public {
        vm.prank(better1);
        vm.expectRevert();
        debate.scoreRound(1, 8);
    }

    function test_RevertWhen_InvalidScore() public {
        vm.prank(judge1);
        vm.expectRevert("Invalid score");
        debate.scoreRound(1, 11);
    }

    function test_RevertWhen_ScoreTwice() public {
        vm.prank(judge1);
        debate.scoreRound(1, 8);

        vm.prank(judge1);
        vm.expectRevert("Already scored");
        debate.scoreRound(1, 9);
    }

    function test_BondingCurveMechanics() public {
        uint256 initialPrice = debate.getCurrentPrice();
        
        // Place bet during bonding period
        uint256 betAmount = BONDING_TARGET / 2;
        vm.prank(better1);
        debate.placeBet(betAmount, true, "Evidence 1", "@better1");

        uint256 newPrice = debate.getCurrentPrice();
        assertTrue(newPrice > initialPrice);

        // Place bet that fulfills bonding target
        vm.prank(better2);
        debate.placeBet(BONDING_TARGET - betAmount, true, "Evidence 2", "@better2");

        // Check bonding curve is fulfilled
        (,,,,bool isFulfilled,) = debate.bondingCurve();
        assertTrue(isFulfilled);
    }

    function test_EarlyBetterBonus() public {
        uint256 betAmount = 10 * 10**18;
        
        // Place bet during bonding period
        vm.prank(better1);
        debate.placeBet(betAmount, true, "Evidence 1", "@better1");

        (,, bool isEarly,,) = debate.getBetInfo(better1);
        assertTrue(isEarly);

        // Skip bonding period
        vm.warp(block.timestamp + BONDING_DURATION + 1);
        
        // Place bet after bonding period
        vm.prank(better2);
        debate.placeBet(betAmount, true, "Evidence 2", "@better2");

        (,, isEarly,,) = debate.getBetInfo(better2);
        assertFalse(isEarly);
    }
} 
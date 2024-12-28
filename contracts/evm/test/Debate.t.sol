// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Test } from "forge-std/Test.sol";
import { console2 } from "forge-std/console2.sol";
import { Debate } from "../src/Debate.sol";

contract DebateTest is Test {
    Debate public debate;
    address[] public judges;
    uint256 public constant TOTAL_ROUNDS = 3;
    uint256 public constant OUTCOME_COUNT = 5;
    uint256 public constant MAX_SCORE = 10;

    function setUp() public {
        // Setup judges
        judges = new address[](3);
        judges[0] = makeAddr("judge1");
        judges[1] = makeAddr("judge2");
        judges[2] = makeAddr("judge3");

        // Deploy debate contract
        debate = new Debate(
            "Test Topic",
            7 days,
            TOTAL_ROUNDS,
            judges
        );
    }

    function test_Initialization() public {
        assertEq(debate.topic(), "Test Topic");
        assertEq(debate.currentRound(), 1);
        assertEq(debate.totalRounds(), TOTAL_ROUNDS);
        assertTrue(debate.isActive());
        assertFalse(debate.hasOutcome());
    }

    function test_RoundScoring() public {
        // First judge scores
        uint256[] memory scores1 = new uint256[](OUTCOME_COUNT);
        scores1[0] = 7;
        scores1[1] = 1;
        scores1[2] = 1;
        scores1[3] = 1;
        scores1[4] = 0;

        vm.prank(judges[0]);
        debate.scoreRound(1, scores1);

        // Second judge scores
        uint256[] memory scores2 = new uint256[](OUTCOME_COUNT);
        scores2[0] = 8;
        scores2[1] = 1;
        scores2[2] = 1;
        scores2[3] = 0;
        scores2[4] = 0;

        vm.prank(judges[1]);
        debate.scoreRound(1, scores2);

        // Third judge scores
        uint256[] memory scores3 = new uint256[](OUTCOME_COUNT);
        scores3[0] = 9;
        scores3[1] = 1;
        scores3[2] = 0;
        scores3[3] = 0;
        scores3[4] = 0;

        vm.prank(judges[2]);
        debate.scoreRound(1, scores3);

        // Check round info
        (bool isComplete, uint256 judgeCount, uint256[] memory totalScores,,) = debate.getRoundInfo(1);
        assertTrue(isComplete);
        assertEq(judgeCount, 3);
        assertEq(totalScores[0], 24); // 7 + 8 + 9
        assertEq(totalScores[1], 3);  // 1 + 1 + 1
        assertEq(totalScores[2], 2);  // 1 + 1 + 0
        assertEq(totalScores[3], 1);  // 1 + 0 + 0
        assertEq(totalScores[4], 0);  // 0 + 0 + 0
    }

    function test_CompleteDebate() public {
        // Score all rounds with consistent scores
        for (uint256 round = 1; round <= TOTAL_ROUNDS - 1; round++) {
            // First judge
            uint256[] memory scores1 = new uint256[](OUTCOME_COUNT);
            scores1[0] = 8;
            scores1[1] = 2;
            scores1[2] = 0;
            scores1[3] = 0;
            scores1[4] = 0;
            vm.prank(judges[0]);
            debate.scoreRound(round, scores1);

            // Second judge
            uint256[] memory scores2 = new uint256[](OUTCOME_COUNT);
            scores2[0] = 9;
            scores2[1] = 1;
            scores2[2] = 0;
            scores2[3] = 0;
            scores2[4] = 0;
            vm.prank(judges[1]);
            debate.scoreRound(round, scores2);

            // Third judge
            uint256[] memory scores3 = new uint256[](OUTCOME_COUNT);
            scores3[0] = 10;
            scores3[1] = 0;
            scores3[2] = 0;
            scores3[3] = 0;
            scores3[4] = 0;
            vm.prank(judges[2]);
            debate.scoreRound(round, scores3);
        }

        // Check final outcome
        assertTrue(debate.hasOutcome());
        assertEq(debate.finalOutcome(), 0); // Outcome 0 should win with highest scores
        assertFalse(debate.isActive()); // Debate should be inactive after completion
    }

    function test_RevertWhen_InvalidScores() public {
        // Test scores not summing to MAX_SCORE
        uint256[] memory invalidScores = new uint256[](OUTCOME_COUNT);
        invalidScores[0] = 8;
        invalidScores[1] = 1;
        invalidScores[2] = 0;
        invalidScores[3] = 0;
        invalidScores[4] = 0;

        vm.prank(judges[0]);
        vm.expectRevert("Scores must sum to MAX_SCORE");
        debate.scoreRound(1, invalidScores);

        // Test score too high
        uint256[] memory highScores = new uint256[](OUTCOME_COUNT);
        highScores[0] = 11;
        highScores[1] = 0;
        highScores[2] = 0;
        highScores[3] = 0;
        highScores[4] = 0;

        vm.prank(judges[0]);
        vm.expectRevert("Score too high");
        debate.scoreRound(1, highScores);
    }

    function test_RevertWhen_InvalidJudge() public {
        address nonJudge = vm.addr(0x123);
        vm.label(nonJudge, "nonJudge");
        vm.prank(nonJudge);
        vm.expectRevert();
        uint256[] memory scores = new uint256[](OUTCOME_COUNT);
        scores[0] = 8;
        scores[1] = 2;
        debate.scoreRound(1, scores);
    }

    function test_RevertWhen_DuplicateScore() public {
        uint256[] memory scores = new uint256[](OUTCOME_COUNT);
        scores[0] = 9;
        scores[1] = 1;
        scores[2] = 0;
        scores[3] = 0;
        scores[4] = 0;

        vm.startPrank(judges[0]);
        debate.scoreRound(1, scores);
        vm.expectRevert("Already scored");
        debate.scoreRound(1, scores);
        vm.stopPrank();
    }

    function test_ConsensusScoring() public {
        // All judges give same scores
        uint256[] memory scores = new uint256[](OUTCOME_COUNT);
        scores[0] = 5;
        scores[1] = 3;
        scores[2] = 2;
        scores[3] = 0;
        scores[4] = 0;

        vm.prank(judges[0]);
        debate.scoreRound(1, scores);

        vm.prank(judges[1]);
        debate.scoreRound(1, scores);

        vm.prank(judges[2]);
        debate.scoreRound(1, scores);

        // Check round is complete with expected total scores
        (bool isComplete, uint256 judgeCount, uint256[] memory totalScores,,) = debate.getRoundInfo(1);
        assertTrue(isComplete);
        assertEq(judgeCount, 3);
        assertEq(totalScores[0], 15); // 5 * 3
        assertEq(totalScores[1], 9);  // 3 * 3
        assertEq(totalScores[2], 6);  // 2 * 3
        assertEq(totalScores[3], 0);
        assertEq(totalScores[4], 0);
    }
} 
import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeHumanMove,
  applyMove,
  chooseEasyMove,
  chooseHardMove,
  chooseMediumMove,
  createBoard,
  evaluateMoves,
  getGameResult,
  getOptimalMoves,
  getWinner,
  legalMoves,
  otherMark,
  solvePosition,
} from "../public/js/engine.js";

test("board rules detect rows, columns, diagonals, draws, and open games", () => {
  assert.equal(getWinner(["X", "X", "X", "", "O", "", "O", "", ""]), "X");
  assert.equal(getWinner(["O", "X", "", "O", "X", "", "O", "", "X"]), "O");
  assert.equal(getWinner(["X", "O", "", "", "X", "O", "", "", "X"]), "X");
  assert.deepEqual(
    getGameResult(["X", "O", "X", "X", "O", "O", "O", "X", "X"]),
    { status: "draw", winner: null, line: [] },
  );
  assert.equal(getGameResult(createBoard()).status, "playing");
});

test("moves are immutable and illegal moves are rejected", () => {
  const board = createBoard();
  const next = applyMove(board, 4, "X");
  assert.deepEqual(board, createBoard());
  assert.equal(next[4], "X");
  assert.deepEqual(legalMoves(next), [0, 1, 2, 3, 5, 6, 7, 8]);
  assert.throws(() => applyMove(next, 4, "O"), /occupied/);
  assert.throws(() => applyMove(next, 9, "O"), /0 through 8/);
  assert.throws(() => otherMark("Q"), /Unknown mark/);
});

test("an empty board is a theoretical draw for either perspective", () => {
  const board = createBoard();
  assert.equal(solvePosition(board, "X", "X"), 0);
  assert.equal(solvePosition(board, "X", "O"), 0);
  assert.equal(getOptimalMoves(board, "X").length, 9);
});

test("easy mode samples all legal cells", () => {
  const board = ["X", "", "", "", "O", "", "", "", "X"];
  assert.equal(chooseEasyMove(board, "O", () => 0), 1);
  assert.equal(chooseEasyMove(board, "O", () => 0.999999), 7);
});

test("medium mode wins, blocks, then favors the center", () => {
  assert.equal(
    chooseMediumMove(["X", "X", "", "O", "", "", "", "O", ""], "X", () => 0),
    2,
  );
  assert.equal(
    chooseMediumMove(["X", "X", "", "", "O", "", "", "", ""], "O", () => 0),
    2,
  );
  assert.equal(chooseMediumMove(createBoard(), "O", () => 0), 4);
});

test("hard mode selects only moves with the best minimax outcome", () => {
  const board = ["X", "X", "", "O", "O", "", "", "", ""];
  const evaluations = evaluateMoves(board, "X", "X");
  const best = Math.max(...evaluations.map(({ outcome }) => outcome));
  for (const sample of [0, 0.2, 0.5, 0.8, 0.999999]) {
    const move = chooseHardMove(board, "X", () => sample);
    assert.equal(evaluations.find((entry) => entry.move === move).outcome, best);
  }
  assert.equal(chooseHardMove(board, "X", () => 0), 2, "hard mode takes an immediate win");
});

test("No Mercy analysis finds a draw-to-loss move and preserves alternatives", () => {
  const position = findReachableDrawToLossPosition();
  assert.ok(position, "a reachable draw-to-loss choice should exist");
  const losing = evaluateMoves(position, "X", "X").find(({ outcome }) => outcome < 0);
  const analysis = analyzeHumanMove(position, losing.move, "X");
  assert.equal(analysis.beforeOutcome, 0);
  assert.equal(analysis.chosenOutcome, -1);
  assert.equal(analysis.isFirstLossCandidate, true);
  assert.ok(analysis.options.some(({ outcome }) => outcome === 0));
  assert.deepEqual(analysis.boardBefore, position);
  assert.notEqual(analysis.boardBefore, position, "analysis keeps a defensive board copy");
});

for (const aiMark of ["X", "O"]) {
  test(`exhaustive proof: hard mode never loses when the machine is ${aiMark}`, () => {
    const audit = auditPerfectOpponent(aiMark);
    assert.ok(audit.positions > 0);
    assert.ok(audit.terminalPositions > 0);
    assert.equal(audit.humanWins, 0);
    assert.ok(audit.draws > 0, "perfect defense still permits a human to earn a draw");
  });
}

function auditPerfectOpponent(aiMark) {
  const humanMark = otherMark(aiMark);
  const visited = new Set();
  const counts = { positions: 0, terminalPositions: 0, humanWins: 0, aiWins: 0, draws: 0 };

  function visit(board, turn) {
    const key = `${board.map((cell) => cell || "-").join("")}|${turn}`;
    if (visited.has(key)) return;
    visited.add(key);
    counts.positions += 1;

    const result = getGameResult(board);
    if (result.status !== "playing") {
      counts.terminalPositions += 1;
      if (result.status === "draw") counts.draws += 1;
      else if (result.winner === humanMark) counts.humanWins += 1;
      else counts.aiWins += 1;
      assert.notEqual(result.winner, humanMark, `human win reached against perfect ${aiMark}`);
      return;
    }

    const moves = turn === aiMark ? getOptimalMoves(board, aiMark) : legalMoves(board);
    assert.ok(moves.length > 0);
    for (const move of moves) {
      visit(applyMove(board, move, turn), otherMark(turn));
    }
  }

  visit(createBoard(), "X");
  return counts;
}

function findReachableDrawToLossPosition() {
  const queue = [{ board: createBoard(), turn: "X" }];
  const visited = new Set();

  while (queue.length > 0) {
    const { board, turn } = queue.shift();
    const key = `${board.map((cell) => cell || "-").join("")}|${turn}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (getGameResult(board).status !== "playing") continue;

    if (turn === "X" && solvePosition(board, "X", "X") === 0) {
      const outcomes = evaluateMoves(board, "X", "X").map(({ outcome }) => outcome);
      if (outcomes.includes(0) && outcomes.includes(-1)) return board;
    }

    for (const move of legalMoves(board)) {
      queue.push({ board: applyMove(board, move, turn), turn: otherMark(turn) });
    }
  }
  return null;
}

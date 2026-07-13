export const EMPTY = "";
export const MARK_X = "X";
export const MARK_O = "O";

export const WIN_LINES = Object.freeze([
  Object.freeze([0, 1, 2]),
  Object.freeze([3, 4, 5]),
  Object.freeze([6, 7, 8]),
  Object.freeze([0, 3, 6]),
  Object.freeze([1, 4, 7]),
  Object.freeze([2, 5, 8]),
  Object.freeze([0, 4, 8]),
  Object.freeze([2, 4, 6]),
]);

const solveCache = new Map();

export function createBoard() {
  return Array(9).fill(EMPTY);
}

export function otherMark(mark) {
  if (mark === MARK_X) return MARK_O;
  if (mark === MARK_O) return MARK_X;
  throw new TypeError(`Unknown mark: ${mark}`);
}

export function legalMoves(board) {
  assertBoard(board);
  const moves = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === EMPTY) moves.push(index);
  }
  return moves;
}

export function getWinningLine(board) {
  assertBoard(board);
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== EMPTY && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

export function getWinner(board) {
  const line = getWinningLine(board);
  return line ? board[line[0]] : null;
}

export function getGameResult(board) {
  const line = getWinningLine(board);
  if (line) {
    return { status: "win", winner: board[line[0]], line: [...line] };
  }
  if (board.every((cell) => cell !== EMPTY)) {
    return { status: "draw", winner: null, line: [] };
  }
  return { status: "playing", winner: null, line: [] };
}

export function applyMove(board, index, mark) {
  assertBoard(board);
  if (!Number.isInteger(index) || index < 0 || index >= board.length) {
    throw new RangeError(`Move index must be an integer from 0 through 8: ${index}`);
  }
  if (mark !== MARK_X && mark !== MARK_O) {
    throw new TypeError(`Unknown mark: ${mark}`);
  }
  if (board[index] !== EMPTY) {
    throw new Error(`Cell ${index} is already occupied`);
  }
  const nextBoard = [...board];
  nextBoard[index] = mark;
  return nextBoard;
}

/**
 * Return the game-theoretic outcome for `perspectiveMark` under perfect play.
 *  1 = forced win, 0 = forced draw, -1 = forced loss.
 */
export function solvePosition(board, turn, perspectiveMark) {
  assertBoard(board);
  assertMark(turn);
  assertMark(perspectiveMark);

  const key = `${board.map((cell) => cell || "-").join("")}|${turn}|${perspectiveMark}`;
  if (solveCache.has(key)) return solveCache.get(key);

  const result = getGameResult(board);
  if (result.status === "win") {
    const outcome = result.winner === perspectiveMark ? 1 : -1;
    solveCache.set(key, outcome);
    return outcome;
  }
  if (result.status === "draw") {
    solveCache.set(key, 0);
    return 0;
  }

  const outcomes = legalMoves(board).map((move) =>
    solvePosition(applyMove(board, move, turn), otherMark(turn), perspectiveMark),
  );
  const outcome = turn === perspectiveMark ? Math.max(...outcomes) : Math.min(...outcomes);
  solveCache.set(key, outcome);
  return outcome;
}

export function evaluateMoves(board, turn, perspectiveMark) {
  assertBoard(board);
  assertMark(turn);
  assertMark(perspectiveMark);
  if (getGameResult(board).status !== "playing") return [];

  return legalMoves(board).map((move) => ({
    move,
    outcome: solvePosition(applyMove(board, move, turn), otherMark(turn), perspectiveMark),
  }));
}

export function getOptimalMoves(board, mark) {
  const choices = evaluateMoves(board, mark, mark);
  if (choices.length === 0) return [];
  const bestOutcome = Math.max(...choices.map(({ outcome }) => outcome));
  return choices.filter(({ outcome }) => outcome === bestOutcome).map(({ move }) => move);
}

export function chooseEasyMove(board, _mark, random = Math.random) {
  return pickWithRandom(legalMoves(board), random);
}

export function chooseMediumMove(board, mark, random = Math.random) {
  assertMark(mark);
  const available = legalMoves(board);
  if (available.length === 0) return null;

  const winning = available.filter(
    (move) => getWinner(applyMove(board, move, mark)) === mark,
  );
  if (winning.length > 0) return pickWithRandom(winning, random);

  const opponent = otherMark(mark);
  const blocking = available.filter(
    (move) => getWinner(applyMove(board, move, opponent)) === opponent,
  );
  if (blocking.length > 0) return pickWithRandom(blocking, random);

  if (available.includes(4)) return 4;
  const corners = available.filter((move) => [0, 2, 6, 8].includes(move));
  if (corners.length > 0) return pickWithRandom(corners, random);
  return pickWithRandom(available, random);
}

export function chooseHardMove(board, mark, random = Math.random) {
  assertMark(mark);
  return pickWithRandom(getOptimalMoves(board, mark), random);
}

export function chooseMove(board, mark, difficulty, random = Math.random) {
  if (difficulty === "easy") return chooseEasyMove(board, mark, random);
  if (difficulty === "medium") return chooseMediumMove(board, mark, random);
  if (difficulty === "hard") return chooseHardMove(board, mark, random);
  throw new TypeError(`Unknown difficulty: ${difficulty}`);
}

/**
 * Analyze a human turn from the human's point of view. This powers the
 * No Mercy Report without giving the live game hints.
 */
export function analyzeHumanMove(board, move, humanMark) {
  assertBoard(board);
  assertMark(humanMark);
  if (!legalMoves(board).includes(move)) {
    throw new Error(`Cannot analyze illegal move ${move}`);
  }

  const beforeOutcome = solvePosition(board, humanMark, humanMark);
  const options = evaluateMoves(board, humanMark, humanMark);
  const chosen = options.find((option) => option.move === move);

  return {
    boardBefore: [...board],
    move,
    beforeOutcome,
    chosenOutcome: chosen.outcome,
    options,
    isFirstLossCandidate: beforeOutcome >= 0 && chosen.outcome < 0,
  };
}

export function outcomeLabel(outcome) {
  if (outcome > 0) return "Win";
  if (outcome < 0) return "Loss";
  return "Draw";
}

function pickWithRandom(items, random) {
  if (items.length === 0) return null;
  const sample = Number(random());
  const safeSample = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 0.999999999) : 0;
  return items[Math.floor(safeSample * items.length)];
}

function assertMark(mark) {
  if (mark !== MARK_X && mark !== MARK_O) {
    throw new TypeError(`Unknown mark: ${mark}`);
  }
}

function assertBoard(board) {
  if (!Array.isArray(board) || board.length !== 9) {
    throw new TypeError("A board must be an array of nine cells");
  }
  if (board.some((cell) => cell !== EMPTY && cell !== MARK_X && cell !== MARK_O)) {
    throw new TypeError("Board cells must be empty, X, or O");
  }
}

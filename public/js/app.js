import {
  analyzeHumanMove,
  applyMove,
  chooseMove,
  createBoard,
  getGameResult,
  otherMark,
  outcomeLabel,
  solvePosition,
} from "./engine.js?v=20260713-1";

const STORAGE_KEY = "hard-mode-tic-tac-toe-stats-v1";
const DIFFICULTY_NAMES = Object.freeze({ easy: "Easy", medium: "Medium", hard: "Hard" });
const OUTCOME_KEYS = Object.freeze({ win: "wins", draw: "draws", loss: "losses" });
const CELL_NAMES = Object.freeze([
  "top left",
  "top middle",
  "top right",
  "middle left",
  "center",
  "middle right",
  "bottom left",
  "bottom middle",
  "bottom right",
]);

const elements = {
  board: document.querySelector("#board"),
  cells: [...document.querySelectorAll(".cell")],
  status: document.querySelector("#status"),
  difficultyBadge: document.querySelector("#difficulty-badge"),
  difficultyControls: document.querySelector("#difficulty-controls"),
  starterControls: document.querySelector("#starter-controls"),
  rematch: document.querySelector("#rematch"),
  acceptDefeat: document.querySelector("#accept-defeat"),
  resetRecord: document.querySelector("#reset-record"),
  recordTitle: document.querySelector("#record-title"),
  statWins: document.querySelector("#stat-wins"),
  statDraws: document.querySelector("#stat-draws"),
  statLosses: document.querySelector("#stat-losses"),
  report: document.querySelector("#report"),
  reportSummary: document.querySelector("#report-summary"),
  reportDetail: document.querySelector("#report-detail"),
  rewind: document.querySelector("#rewind"),
};

const state = {
  board: createBoard(),
  turn: "X",
  humanMark: "X",
  aiMark: "O",
  difficulty: "hard",
  starter: "human",
  roundActive: false,
  roundToken: 0,
  aiTimer: 0,
  history: [],
  humanAnalyses: [],
  winningLine: [],
  lastMove: null,
  lastFinish: null,
  resultRecord: null,
  rovingIndex: 0,
  stats: loadStats(),
};

for (const cell of elements.cells) {
  cell.addEventListener("click", () => playHumanMove(Number(cell.dataset.index)));
  cell.addEventListener("keydown", handleCellKeydown);
  cell.addEventListener("focus", () => setRovingIndex(Number(cell.dataset.index), false));
}

elements.rematch.addEventListener("click", () => startRound());
elements.acceptDefeat.addEventListener("click", acceptDefeat);
elements.resetRecord.addEventListener("click", resetCurrentRecord);
elements.difficultyControls.addEventListener("change", handleSettingsChange);
elements.starterControls.addEventListener("change", handleSettingsChange);

startRound();

function startRound() {
  cancelPendingAi();
  state.roundToken += 1;
  state.difficulty = selectedValue("difficulty");
  state.starter = selectedValue("starter");
  state.humanMark = state.starter === "human" ? "X" : "O";
  state.aiMark = otherMark(state.humanMark);
  state.board = createBoard();
  state.turn = "X";
  state.roundActive = true;
  state.history = [];
  state.humanAnalyses = [];
  state.winningLine = [];
  state.lastMove = null;
  state.lastFinish = null;
  state.resultRecord = null;
  state.rovingIndex = 0;

  elements.report.hidden = true;
  elements.reportDetail.replaceChildren();
  elements.acceptDefeat.disabled = false;
  elements.rematch.textContent = "New round";

  renderSettings();
  renderStats();
  renderBoard();

  if (state.turn === state.aiMark) {
    scheduleAiMove();
  } else {
    announce(`Your turn — you are ${state.humanMark}. X always opens.`);
  }
}

function handleSettingsChange(event) {
  if (!(event.target instanceof HTMLInputElement) || !event.target.checked) return;
  startRound();
}

function playHumanMove(index) {
  if (!state.roundActive || state.turn !== state.humanMark || state.board[index] !== "") return;

  const analysis = {
    ...analyzeHumanMove(state.board, index, state.humanMark),
    historyLengthBefore: state.history.length,
    humanMoveNumber: state.humanAnalyses.length + 1,
    ply: state.history.length + 1,
  };
  state.humanAnalyses.push(analysis);
  commitMove(index, state.humanMark, "human");
}

function scheduleAiMove() {
  if (!state.roundActive || state.turn !== state.aiMark) return;
  renderBoard();
  announce(`${DIFFICULTY_NAMES[state.difficulty]} mode is considering the grid…`, "gold");

  const token = state.roundToken;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  state.aiTimer = window.setTimeout(() => {
    if (token !== state.roundToken || !state.roundActive || state.turn !== state.aiMark) return;
    const move = chooseMove(state.board, state.aiMark, state.difficulty);
    if (move !== null) commitMove(move, state.aiMark, "computer");
  }, reduceMotion ? 0 : 220);
}

function commitMove(index, mark, actor) {
  state.board = applyMove(state.board, index, mark);
  state.history.push({ index, mark, actor });
  state.lastMove = index;

  const result = getGameResult(state.board);
  if (result.status !== "playing") {
    const outcome = result.status === "draw" ? "draw" : result.winner === state.humanMark ? "win" : "loss";
    state.winningLine = result.line;
    finishRound(outcome, { lastMove: index, surrender: false });
    return;
  }

  state.turn = otherMark(state.turn);
  renderBoard(index);

  if (state.turn === state.aiMark) {
    scheduleAiMove();
  } else {
    announce(`Your turn — place ${state.humanMark}.`);
  }
}

function finishRound(outcome, { lastMove = null, surrender = false } = {}) {
  cancelPendingAi();
  state.roundActive = false;
  state.lastFinish = { outcome, surrender };
  recordOutcome(state.difficulty, outcome, 1);
  state.resultRecord = { difficulty: state.difficulty, outcome };
  elements.acceptDefeat.disabled = true;
  elements.rematch.textContent = "Rematch";

  if (surrender) {
    announce("Defeat accepted. The machine will try not to look smug.", "danger");
  } else if (outcome === "draw") {
    announce(
      state.difficulty === "hard"
        ? "Nice. You survived perfection — a draw is the win."
        : "A draw. The grid keeps its secrets for one more round.",
      "gold",
    );
  } else if (outcome === "win") {
    announce(
      state.difficulty === "hard"
        ? "You beat hard mode. That should be impossible — please report this timeline."
        : "You win. The machine has filed an appeal against its difficulty setting.",
      "gold",
    );
  } else {
    announce(
      state.difficulty === "hard"
        ? "Hard mode wins. Somewhere, a fork is smiling."
        : `${DIFFICULTY_NAMES[state.difficulty]} mode takes this one.`,
      "danger",
    );
  }

  renderBoard(lastMove);
  renderStats();
  renderReport();
}

function acceptDefeat() {
  if (!state.roundActive) return;
  finishRound("loss", { lastMove: state.lastMove, surrender: true });
}

function renderBoard(newMove = null) {
  elements.board.setAttribute("aria-busy", String(state.roundActive && state.turn === state.aiMark));
  elements.board.setAttribute(
    "aria-label",
    `Tic-Tac-Toe board. You are ${state.humanMark}. ${state.roundActive ? `${state.turn} to move.` : "Round complete."}`,
  );

  elements.cells.forEach((cell, index) => {
    const mark = state.board[index];
    const playable = state.roundActive && state.turn === state.humanMark && mark === "";
    const markElement = cell.querySelector("span");
    markElement.textContent = mark;
    cell.classList.toggle("is-new", index === newMove && mark !== "");
    cell.classList.toggle("is-winning", state.winningLine.includes(index));
    cell.setAttribute("aria-disabled", String(!playable));
    cell.setAttribute(
      "aria-label",
      mark === "" ? `${capitalize(CELL_NAMES[index])}, empty` : `${capitalize(CELL_NAMES[index])}, occupied by ${mark}`,
    );
    if (mark) cell.dataset.mark = mark;
    else delete cell.dataset.mark;
  });

  setRovingIndex(state.rovingIndex, false);
}

function renderSettings() {
  const name = DIFFICULTY_NAMES[state.difficulty];
  elements.difficultyBadge.textContent = `${name} mode`;
  elements.difficultyBadge.dataset.difficulty = state.difficulty;
  elements.recordTitle.textContent = `${name} mode`;
}

function renderStats() {
  const current = state.stats[state.difficulty];
  elements.statWins.textContent = String(current.wins);
  elements.statDraws.textContent = String(current.draws);
  elements.statLosses.textContent = String(current.losses);
}

function renderReport() {
  const firstLoss = state.humanAnalyses.find((analysis) => analysis.isFirstLossCandidate);
  elements.reportDetail.replaceChildren();
  elements.rewind.hidden = true;
  elements.rewind.onclick = null;

  if (!firstLoss) {
    if (state.lastFinish.surrender) {
      const currentValue = solvePosition(state.board, state.turn, state.humanMark);
      const position = currentValue > 0 ? "winning" : currentValue < 0 ? "already lost under perfect play" : "still drawable";
      elements.reportSummary.textContent = `No decisive losing move was found before the resignation. The position was ${position}; surrender supplied the verdict.`;
    } else if (state.lastFinish.outcome === "draw") {
      elements.reportSummary.textContent = "No losing move found. Every choice preserved the draw. You held the line against perfect play.";
    } else if (state.lastFinish.outcome === "win") {
      elements.reportSummary.textContent = "No forced-loss move found. The softer opponent left a door open, and you used it.";
    } else {
      elements.reportSummary.textContent = "The game ended without a single draw-to-loss turning point to isolate.";
    }

    const note = document.createElement("p");
    note.className = "fine-print";
    note.textContent = "Move values assume perfect play from that position onward, regardless of the selected difficulty.";
    elements.reportDetail.append(note);
  } else {
    const beforeLabel = firstLoss.beforeOutcome > 0 ? "a forced win" : "a drawable game";
    elements.reportSummary.textContent = `Human move ${firstLoss.humanMoveNumber} (ply ${firstLoss.ply}) — ${CELL_NAMES[firstLoss.move]} — changed ${beforeLabel} into a forced loss. That was the first crack.`;

    const list = document.createElement("ul");
    list.className = "verdict";
    const options = [...firstLoss.options].sort((a, b) => b.outcome - a.outcome || a.move - b.move);

    for (const option of options) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const label = outcomeLabel(option.outcome);
      button.type = "button";
      button.className = "report-option";
      button.classList.toggle("is-played", option.move === firstLoss.move);
      button.setAttribute(
        "aria-label",
        `${capitalize(CELL_NAMES[option.move])}: ${label} with perfect play. ${option.move === firstLoss.move ? "This was your move. " : ""}Try this branch.`,
      );

      const description = document.createElement("span");
      const moveName = document.createElement("span");
      moveName.className = "report-option__move";
      moveName.textContent = capitalize(CELL_NAMES[option.move]);
      const note = document.createElement("span");
      note.className = "report-option__note";
      note.textContent = option.move === firstLoss.move ? "Played · replay this branch" : "Try this branch";
      description.append(moveName, note);

      const outcome = document.createElement("span");
      outcome.className = "report-option__outcome";
      outcome.dataset.outcome = label;
      outcome.textContent = label;

      button.append(description, outcome);
      button.addEventListener("click", () => branchFrom(firstLoss, option.move));
      item.append(button);
      list.append(item);
    }

    elements.reportDetail.append(list);
    elements.rewind.hidden = false;
    elements.rewind.textContent = `Rewind before human move ${firstLoss.humanMoveNumber}`;
    elements.rewind.onclick = () => branchFrom(firstLoss, null);
  }

  elements.report.hidden = false;
}

function branchFrom(analysis, replacementMove) {
  cancelPendingAi();
  state.roundToken += 1;

  if (state.resultRecord) {
    recordOutcome(state.resultRecord.difficulty, state.resultRecord.outcome, -1);
  }

  const analysisIndex = state.humanAnalyses.indexOf(analysis);
  state.board = [...analysis.boardBefore];
  state.turn = state.humanMark;
  state.roundActive = true;
  state.history = state.history.slice(0, analysis.historyLengthBefore);
  state.humanAnalyses = state.humanAnalyses.slice(0, Math.max(analysisIndex, 0));
  state.winningLine = [];
  state.lastMove = state.history.at(-1)?.index ?? null;
  state.lastFinish = null;
  state.resultRecord = null;
  state.rovingIndex = replacementMove ?? analysis.move;

  elements.report.hidden = true;
  elements.acceptDefeat.disabled = false;
  elements.rematch.textContent = "New round";
  renderStats();
  renderBoard();
  announce(`Timeline reopened before human move ${analysis.humanMoveNumber}. Choose a different future.`);
  setRovingIndex(state.rovingIndex, true);

  if (replacementMove !== null) playHumanMove(replacementMove);
}

function handleCellKeydown(event) {
  const current = Number(event.currentTarget.dataset.index);
  let next = null;

  if (event.key === "ArrowLeft") next = current % 3 === 0 ? current + 2 : current - 1;
  if (event.key === "ArrowRight") next = current % 3 === 2 ? current - 2 : current + 1;
  if (event.key === "ArrowUp") next = (current + 6) % 9;
  if (event.key === "ArrowDown") next = (current + 3) % 9;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = 8;

  if (next !== null) {
    event.preventDefault();
    setRovingIndex(next, true);
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    const index = Number(event.key) - 1;
    setRovingIndex(index, true);
    playHumanMove(index);
  }
}

function setRovingIndex(index, focus) {
  state.rovingIndex = index;
  elements.cells.forEach((cell, cellIndex) => {
    cell.tabIndex = cellIndex === index ? 0 : -1;
  });
  if (focus) elements.cells[index].focus();
}

function announce(message, tone = "neutral") {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function cancelPendingAi() {
  window.clearTimeout(state.aiTimer);
  state.aiTimer = 0;
}

function recordOutcome(difficulty, outcome, delta) {
  const key = OUTCOME_KEYS[outcome];
  state.stats[difficulty][key] = Math.max(0, state.stats[difficulty][key] + delta);
  saveStats();
}

function resetCurrentRecord() {
  state.stats[state.difficulty] = emptyRecord();
  saveStats();
  renderStats();
  announce(`${DIFFICULTY_NAMES[state.difficulty]}-mode record cleared. The current round continues.`);
}

function loadStats() {
  const fallback = emptyStats();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    for (const difficulty of Object.keys(fallback)) {
      for (const key of Object.keys(fallback[difficulty])) {
        const value = parsed?.[difficulty]?.[key];
        if (Number.isSafeInteger(value) && value >= 0) fallback[difficulty][key] = value;
      }
    }
  } catch {
    // Storage can be unavailable in strict privacy modes; the session still works.
  }
  return fallback;
}

function saveStats() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
  } catch {
    // Keep in-memory stats when storage is unavailable.
  }
}

function emptyStats() {
  return { easy: emptyRecord(), medium: emptyRecord(), hard: emptyRecord() };
}

function emptyRecord() {
  return { wins: 0, draws: 0, losses: 0 };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

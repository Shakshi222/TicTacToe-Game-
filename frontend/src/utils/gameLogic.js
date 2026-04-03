// Client-side game logic fallback
// This runs when the server-side Go plugin isn't available

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns  
  [0, 4, 8], [2, 4, 6]             // diagonals
];

export function checkWinner(board) {
  for (let combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return 'X' or 'O'
    }
  }
  return null;
}

export function isBoardFull(board) {
  return board.every(cell => cell !== "");
}

export function getGameStatus(board) {
  const winner = checkWinner(board);
  if (winner) {
    return { status: 'over', winner };
  }
  if (isBoardFull(board)) {
    return { status: 'over', winner: 'draw' };
  }
  return { status: 'playing', winner: null };
}

export function createInitialGameState(players) {
  return {
    board: Array(9).fill(""),
    players: players || {},
    turn: null,
    winner: "",
    status: Object.keys(players || {}).length === 2 ? "playing" : "waiting",
    timeLeft: 30
  };
}
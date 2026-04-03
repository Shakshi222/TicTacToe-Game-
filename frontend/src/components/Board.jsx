// src/components/Board.jsx
export default function Board({ board, onClick, isMyTurn, disabled }) {
  return (
    <div className={`board ${isMyTurn && !disabled ? "active" : ""}`}>
      {board.map((cell, i) => (
        <button
          key={i}
          className={`cell ${cell === "X" ? "x" : cell === "O" ? "o" : ""} ${
            !cell && isMyTurn && !disabled ? "hoverable" : ""
          }`}
          onClick={() => onClick(i)}
          disabled={disabled || !!cell || !isMyTurn}
        >
          {cell}
        </button>
      ))}
    </div>
  );
}

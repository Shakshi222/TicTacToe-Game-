// src/components/StatusBar.jsx
export default function StatusBar({ status, mySymbol, isMyTurn, winner, myId }) {
  let message = "";
  let cls = "status";

  if (status === "waiting") {
    message = "⏳ Waiting for opponent to join…";
    cls += " waiting";
  } else if (status === "playing") {
    message = isMyTurn
      ? `🟢 Your turn — you are ${mySymbol}`
      : `⏳ Opponent's turn`;
    cls += isMyTurn ? " my-turn" : " their-turn";
  } else if (status === "over") {
    if (winner === "draw") {
      message = "🤝 It's a draw!";
      cls += " draw";
    } else if (winner === "disconnect") {
      message = "😞 Opponent disconnected";
      cls += " disconnect";
    } else if (winner === myId) {
      message = "🎉 You won!";
      cls += " win";
    } else {
      // Check if the loss was due to timeout (we timed out) or normal
      message = "😔 You lost.";
      cls += " lose";
    }
  }

  return <div className={cls}>{message}</div>;
}

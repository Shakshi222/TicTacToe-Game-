// src/components/Timer.jsx
export default function Timer({ timeLeft, isMyTurn, status }) {
  if (status !== "playing" || timeLeft == null) return null;

  const total   = 30;
  const pct     = timeLeft / total;
  const radius  = 22;
  const circ    = 2 * Math.PI * radius;
  const dash    = pct * circ;

  // colour: green → yellow → red
  const color =
    timeLeft > 15 ? "#4ade80" :
    timeLeft > 8  ? "#fbbf24" : "#f87171";

  const urgent = timeLeft <= 8;

  return (
    <div className={`timer-wrap ${isMyTurn ? "my-turn-timer" : ""} ${urgent && isMyTurn ? "urgent" : ""}`}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        {/* background ring */}
        <circle cx="30" cy="30" r={radius} fill="none" stroke="#2a2a3e" strokeWidth="4"/>
        {/* countdown arc */}
        <circle
          cx="30" cy="30" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s" }}
        />
        {/* number */}
        <text
          x="30" y="35"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill={color}
        >
          {timeLeft}
        </text>
      </svg>
      <span className="timer-label" style={{ color }}>
        {isMyTurn ? (urgent ? "⚠️ Move now!" : "Your move") : "Their move"}
      </span>
    </div>
  );
}

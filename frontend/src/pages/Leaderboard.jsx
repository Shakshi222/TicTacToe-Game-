// src/pages/Leaderboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import nakamaService from "../services/nakama";
import "../styles.css";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        console.log("📊 Loading leaderboard...");
        const data = await nakamaService.fetchLeaderboard();
        console.log("✅ Leaderboard data:", data);
        setEntries(data.entries || []);
      } catch (e) {
        console.error("❌ Leaderboard error:", e);
        setError("Leaderboard not available (server features disabled)");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="leaderboard-page">
      <button className="btn-back" onClick={() => navigate("/")}>← Back</button>
      <h1>🏆 Leaderboard</h1>
      <p className="subtitle">Top players ranked by wins</p>

      {loading && <div className="lb-loading">Loading rankings…</div>}
      {error   && <p className="error">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <div className="lb-empty">
          <p>No games played yet.</p>
          <p>Play some matches to appear here!</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>W</th>
                <th>L</th>
                <th>D</th>
                <th>Win%</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.rank} className={e.rank <= 3 ? "top-row" : ""}>
                  <td className="rank-cell">
                    {e.rank <= 3 ? MEDALS[e.rank - 1] : e.rank}
                  </td>
                  <td className="name-cell">{e.username || `Player #${e.rank}`}</td>
                  <td className="wins">{e.wins}</td>
                  <td className="losses">{e.losses}</td>
                  <td className="draws">{e.draws}</td>
                  <td>
                    <div className="winrate-bar-wrap">
                      <div
                        className="winrate-bar"
                        style={{ width: e.winRate }}
                      />
                      <span className="winrate-label">{e.winRate}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

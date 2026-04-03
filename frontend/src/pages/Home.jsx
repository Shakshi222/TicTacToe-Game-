// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import nakamaService from "../services/nakama";
import "../styles.css";

export default function Home() {
  const navigate  = useNavigate();
  const [joinId,  setJoinId]  = useState("");
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState("");

  async function handleCreate() {
    setLoading("create"); setError("");
    try {
      console.log("🎮 Creating new match...");
      
      // Ensure we have a stable connection first
      await nakamaService.connect();
      console.log("🔗 Connection established");
      
      const match = await nakamaService.createMatch();
      console.log("✅ Match created:", match.match_id.slice(0, 16));
      
      // IMPORTANT: Don't disconnect - keep the connection alive for the game page
      console.log("🚀 Navigating to game (keeping connection alive)...");
      navigate(`/game/${match.match_id}?role=host`);
    } catch (e) { 
      console.error("❌ Create match failed:", e);
      setError(e.message); 
    }
    finally { setLoading(null); }
  }

  async function handleJoin() {
    if (!joinId.trim()) return setError("Enter a match ID");
    setLoading("join"); setError("");
    try {
      console.log("🔗 Joining match:", joinId.trim().slice(0, 16));
      
      // Ensure we have a connection first
      await nakamaService.connect();
      console.log("✅ Connected, now joining match...");
      
      await nakamaService.joinMatch(joinId.trim());
      console.log("✅ Successfully joined match");
      
      navigate(`/game/${joinId.trim()}?role=guest`);
    } catch (e) { 
      console.error("❌ Join failed:", e);
      setError(e.message); 
    }
    finally { setLoading(null); }
  }

  async function handleFind() {
    setLoading("find"); setError("");
    try {
      await nakamaService.connect();
      const ticket = await nakamaService.findMatch();
      // listen for match found
      nakamaService.onMatchmakerMatched(async (matched) => {
        const match = await nakamaService.socket.joinMatch(
          null, matched.token
        );
        navigate(`/game/${match.match_id}?role=matched`);
      });
      setError("⏳ Searching for an opponent...");
    } catch (e) { setError(e.message); }
    finally { setLoading(null); }
  }

  return (
    <div className="home">
      <h1>⭕❌ TicTacToe</h1>
      <p className="tagline">Real-time multiplayer · Server-authoritative</p>
      
      {/* Debug info */}
      <div style={{fontSize: '12px', color: '#666', marginBottom: '20px'}}>
        Nakama: {process.env.REACT_APP_NAKAMA_HOST}:{process.env.REACT_APP_NAKAMA_PORT}<br/>
        Player: {sessionStorage.getItem("deviceId")?.slice(0, 16) || "new-session"}
        <button 
          onClick={() => {sessionStorage.clear(); window.location.reload();}} 
          style={{marginLeft: '10px', fontSize: '10px', padding: '2px 6px'}}
        >
          🗑️ Clear & Reload
        </button>
      </div>

      <div className="card">
        <button className="btn primary" onClick={handleCreate} disabled={!!loading}>
          {loading === "create" ? "Creating…" : "🎮 Create Game"}
        </button>
        <p className="hint">Share the match ID with a friend</p>
      </div>

      <div className="card">
        <input
          className="input"
          placeholder="Paste match ID…"
          value={joinId}
          onChange={e => setJoinId(e.target.value)}
        />
        <button className="btn secondary" onClick={handleJoin} disabled={!!loading}>
          {loading === "join" ? "Joining…" : "🔗 Join Game"}
        </button>
      </div>

      <div className="card">
        <button className="btn ghost" onClick={handleFind} disabled={!!loading}>
          {loading === "find" ? "Searching…" : "🔀 Find Random Match"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn ghost" onClick={() => navigate("/leaderboard")}>
        🏆 View Leaderboard
      </button>

      <button className="btn ghost" onClick={() => navigate("/rooms")}>
        ⚡ Browse Open Rooms
      </button>
    </div>
  );
}

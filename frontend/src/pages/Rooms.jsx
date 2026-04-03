// src/pages/Rooms.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import nakamaService from "../services/nakama";
import "../styles.css";

export default function Rooms() {
  const navigate  = useNavigate();
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [error,   setError]   = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      console.log("🏠 Loading rooms...");
      const data = await nakamaService.listRooms();
      console.log("✅ Rooms data:", data);
      setRooms(data.rooms || []);
    } catch (e) {
      console.error("❌ Rooms error:", e);
      setError("Room browser not available (server features disabled)");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount, then auto-refresh every 5 seconds
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  async function handleJoin(matchId) {
    setJoining(matchId);
    try {
      await nakamaService.joinMatch(matchId);
      navigate(`/game/${matchId}?role=guest`);
    } catch (e) {
      setError(e.message);
      setJoining(null);
    }
  }

  async function handleCreate() {
    try {
      const match = await nakamaService.createMatch();
      navigate(`/game/${match.match_id}?role=host`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="rooms-page">
      <button className="btn-back" onClick={() => navigate("/")}>← Back</button>
      <div className="rooms-header">
        <div>
          <h1>⚡ Open Rooms</h1>
          <p className="subtitle">Join a waiting game or create your own</p>
        </div>
        <button className="btn primary btn-sm" onClick={handleCreate}>+ New Room</button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && <div className="rooms-empty">Loading rooms…</div>}

      {!loading && rooms.length === 0 && (
        <div className="rooms-empty">
          <p>🎮 No open rooms right now.</p>
          <p>Create one and wait for an opponent!</p>
          <button className="btn primary" style={{marginTop: 16}} onClick={handleCreate}>
            Create Room
          </button>
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <div className="rooms-list">
          {rooms.map((room) => (
            <div className="room-card" key={room.matchId}>
              <div className="room-info">
                <span className="room-id">#{room.matchId.slice(0, 8)}…</span>
                <span className={`room-status ${room.players === 1 ? "open" : "full"}`}>
                  {room.players === 1 ? "🟢 Waiting for player" : "🔴 Full"}
                </span>
              </div>
              <div className="room-players">
                {"👤".repeat(room.players)}{"⬜".repeat(2 - room.players)}
                <span className="room-count">{room.players}/2</span>
              </div>
              <button
                className="btn secondary btn-sm"
                onClick={() => handleJoin(room.matchId)}
                disabled={room.players >= 2 || joining === room.matchId}
              >
                {joining === room.matchId ? "Joining…" : "Join"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="rooms-refresh">🔄 Auto-refreshes every 5 seconds</p>
    </div>
  );
}

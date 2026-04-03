import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import nakamaService from "../services/nakama";
import Board from "../components/Board";
import StatusBar from "../components/StatusBar";
import Timer from "../components/Timer";
import { checkWinner, isBoardFull } from "../utils/gameLogic";
import "../styles.css";

const EMPTY_BOARD = Array(9).fill("");

export default function Game() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(EMPTY_BOARD);
  const [mySymbol, setMySymbol] = useState(null);
  const [turn, setTurn] = useState(null);
  const [winner, setWinner] = useState("");
  const [status, setStatus] = useState("connecting");
  const [timeLeft, setTimeLeft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState({});
  const [connected, setConnected] = useState(false);

  // Use refs so the message handler always sees fresh state
  const playersRef = useRef(players);
  const mySymbolRef = useRef(mySymbol);
  const statusRef = useRef(status);
  playersRef.current = players;
  mySymbolRef.current = mySymbol;
  statusRef.current = status;

  // ── Connect and join match ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const initKey = `game_init_${matchId}`;
    if (window[initKey]) return () => {};
    window[initKey] = true;

    (async () => {
      try {
        setStatus("connecting");
        setError("");

        await nakamaService.connect();
        if (!active) return;

        // Set up message handler BEFORE joining
        nakamaService.onMatchState((opCode, payload) => {
          if (!active) return;
          console.log("📥 Match data:", payload);

          if (payload.type === "player_joined") {
            const joinedId = payload.playerId;
            const joinedSymbol = payload.symbol;
            console.log("👤 Player joined:", joinedId.slice(0, 8), joinedSymbol);

            setPlayers(prev => {
              if (prev[joinedId]) return prev; // already known

              const updated = { ...prev, [joinedId]: joinedSymbol };

              // If the other player also claimed X, resolve conflict:
              // the player whose session ID is alphabetically smaller keeps X
              const myId = nakamaService.getSessionId();
              if (joinedSymbol === "X" && mySymbolRef.current === "X" && joinedId !== myId) {
                // Two Xs — the one with the smaller ID keeps X
                if (myId > joinedId) {
                  // I lose: switch to O
                  console.log("🔄 Conflict: switching myself to O");
                  setMySymbol("O");
                  mySymbolRef.current = "O";
                  updated[myId] = "O";
                  nakamaService.sendMatchMessage({
                    type: "player_joined",
                    playerId: myId,
                    symbol: "O",
                    timestamp: Date.now(),
                  });
                }
              }

              // 2 players → start game
              if (Object.keys(updated).length === 2) {
                console.log("🎮 Starting game!");
                const xPlayer = Object.keys(updated).find(id => updated[id] === "X");
                setStatus("playing");
                setTurn(xPlayer);
                console.log("🎯 X starts:", xPlayer?.slice(0, 8));
              }

              return updated;
            });

          } else if (payload.type === "move") {
            console.log("🎯 Remote move:", payload.cellIndex, payload.symbol);

            setBoard(prev => {
              if (prev[payload.cellIndex] !== "") return prev;
              const newBoard = [...prev];
              newBoard[payload.cellIndex] = payload.symbol;

              const w = checkWinner(newBoard);
              const myId = nakamaService.getSessionId();
              
              if (w) {
                setWinner(payload.playerId);
                setStatus("over");
                
                // Update stats: opponent won, I lost
                nakamaService.updatePlayerStats(payload.playerId, 'win');
                nakamaService.updatePlayerStats(myId, 'loss');
              } else if (isBoardFull(newBoard)) {
                setWinner("draw");
                setStatus("over");
                
                // Update stats: both players draw
                nakamaService.updatePlayerStats(payload.playerId, 'draw');
                nakamaService.updatePlayerStats(myId, 'draw');
              } else {
                setPlayers(cur => {
                  const next = Object.keys(cur).find(id => id !== payload.playerId);
                  setTurn(next);
                  return cur;
                });
              }
              return newBoard;
            });
          }
        });

        // Join the match
        const match = await nakamaService.joinMatch(matchId);
        if (!active) return;

        setConnected(true);
        setStatus("waiting");

        // ─── SYMBOL ASSIGNMENT ──────────────────────────────────
        // Use match.presences to see who is already in the match.
        // This is instant and doesn't rely on messages.
        const myId = nakamaService.getSessionId();
        const otherPresences = (match.presences || []).filter(
          p => p.session_id !== myId
        );

        console.log("👤 My session ID:", myId?.slice(0, 8));
        console.log("👥 Other presences in match:", otherPresences.length);

        let symbol;
        const initialPlayers = {};
        
        if (otherPresences.length === 0) {
          // I'm the first player
          symbol = "X";
          initialPlayers[myId] = "X";
        } else {
          // Someone is already here, I'm second player
          symbol = "O";
          // Add the other player as X
          const otherPlayer = otherPresences[0];
          initialPlayers[otherPlayer.session_id] = "X";
          initialPlayers[myId] = "O";
          
          // Start game immediately since we have 2 players
          setStatus("playing");
          setTurn(otherPlayer.session_id); // X goes first
          console.log("🎮 2 players detected, starting game! X's turn:", otherPlayer.session_id.slice(0, 8));
        }

        console.log("🎭 Assigned symbol:", symbol);
        setMySymbol(symbol);
        mySymbolRef.current = symbol;
        setPlayers(initialPlayers);

        // Tell the other player about myself
        nakamaService.sendMatchMessage({
          type: "player_joined",
          playerId: myId,
          symbol,
          timestamp: Date.now(),
        });

      } catch (e) {
        if (active) {
          console.error("❌ Setup failed:", e);
          setError(`Connection failed: ${e.message}`);
          setStatus("error");
        }
      }
    })();

    return () => {
      active = false;
      delete window[initKey];
    };
  }, [matchId]);

  // ── Handle local player move ────────────────────────────────────────────────
  function handleCellClick(index) {
    if (status !== "playing") return;

    const myId = nakamaService.getSessionId();
    if (turn !== myId) {
      console.log("⚠️ Not my turn");
      return;
    }
    if (board[index] !== "") return;

    console.log("✅ Making move:", index, mySymbol);

    const newBoard = [...board];
    newBoard[index] = mySymbol;
    setBoard(newBoard);

    nakamaService.sendMatchMessage({
      type: "move",
      cellIndex: index,
      playerId: myId,
      symbol: mySymbol,
      timestamp: Date.now(),
    });

    const w = checkWinner(newBoard);
    if (w) {
      setWinner(myId);
      setStatus("over");
      
      // Update stats for both players
      nakamaService.updatePlayerStats(myId, 'win');
      const opponentId = Object.keys(players).find(id => id !== myId);
      if (opponentId) {
        nakamaService.updatePlayerStats(opponentId, 'loss');
      }
    } else if (isBoardFull(newBoard)) {
      setWinner("draw");
      setStatus("over");
      
      // Update stats for both players
      nakamaService.updatePlayerStats(myId, 'draw');
      const opponentId = Object.keys(players).find(id => id !== myId);
      if (opponentId) {
        nakamaService.updatePlayerStats(opponentId, 'draw');
      }
    } else {
      const next = Object.keys(players).find(id => id !== myId);
      setTurn(next);
    }
  }

  function copyMatchId() {
    navigator.clipboard.writeText(matchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const myId = nakamaService.getSessionId();
  const isMyTurn = status === "playing" && turn === myId;
  const playerCount = Object.keys(players).length;

  let statusMessage = "";
  if (status === "connecting") statusMessage = "🔄 Connecting...";
  else if (status === "waiting") statusMessage = `⏳ Waiting for opponent... (${playerCount}/2)`;
  else if (status === "playing") statusMessage = "🎮 Game in progress";
  else if (status === "over") statusMessage = "🏁 Game finished";
  else if (status === "error") statusMessage = "❌ Connection error";

  return (
    <div className="game">
      <h1>⭕❌ TicTacToe</h1>

      <div className="match-id-bar">
        <span className="match-id-label">Match ID:</span>
        <code className="match-id">{matchId?.slice(0, 16)}…</code>
        <button className="btn-copy" onClick={copyMatchId}>
          {copied ? "✅ Copied!" : "📋 Copy"}
        </button>
      </div>

      <div className="connection-status">
        <span className={`status ${status}`}>{statusMessage}</span>
      </div>

      <StatusBar
        status={status}
        mySymbol={mySymbol}
        isMyTurn={isMyTurn}
        winner={winner}
        myId={myId}
      />

      <Timer timeLeft={timeLeft} isMyTurn={isMyTurn} status={status} />

      <Board
        board={board}
        onClick={handleCellClick}
        isMyTurn={isMyTurn}
        disabled={status !== "playing"}
      />

      {status === "over" && (
        <div className="game-over">
          <button className="btn primary" onClick={() => navigate("/")}>
            🏠 Back to Home
          </button>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
          <button className="btn secondary" onClick={() => window.location.reload()}>
            🔄 Retry
          </button>
          <button className="btn ghost" onClick={() => navigate("/")} style={{marginLeft: '10px'}}>
            🏠 Back to Home
          </button>
        </div>
      )}

      <div className="debug-info">
        <div>Connected: {connected ? '✅' : '❌'}</div>
        <div>Players: {playerCount}/2</div>
        <div>My Symbol: {mySymbol || 'None'}</div>
        <div>Turn: {isMyTurn ? 'Mine' : 'Theirs'}</div>
        <div>Status: {status}</div>
        <div>Match: {matchId?.slice(0, 8)}</div>
      </div>
    </div>
  );
}
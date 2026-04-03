// src/services/nakama.js - SIMPLIFIED STABLE VERSION
import { Client } from "@heroiclabs/nakama-js";

const NAKAMA_HOST = process.env.REACT_APP_NAKAMA_HOST || "127.0.0.1";
const NAKAMA_PORT = process.env.REACT_APP_NAKAMA_PORT || "7350";
const NAKAMA_KEY  = process.env.REACT_APP_NAKAMA_KEY  || "defaultkey";

console.log("🔧 Nakama Config:", { 
  NAKAMA_HOST, 
  NAKAMA_PORT, 
  NAKAMA_KEY,
  env: process.env.NODE_ENV,
  url: `${NAKAMA_HOST}:${NAKAMA_PORT}`,
  tabId: sessionStorage.getItem("deviceId")?.slice(0, 8) || "new-tab"
});

class NakamaService {
  constructor() {
    this.client  = new Client(NAKAMA_KEY, NAKAMA_HOST, NAKAMA_PORT, false);
    this.session = null;
    this.socket  = null;
    this.match   = null;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async authenticate() {
    if (this.session) {
      console.log("✅ Using existing session");
      return this.session;
    }

    try {
      // Create unique device ID per tab for multiplayer testing
      let deviceId = sessionStorage.getItem("deviceId");
      if (!deviceId) {
        // Make device ID extra unique with timestamp + random component
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 8);
        const tabId = `tab-${randomPart}-${timestamp}`;
        deviceId = crypto.randomUUID() + "-" + tabId;
        sessionStorage.setItem("deviceId", deviceId);
        console.log("🆔 Created new device ID for this tab:", deviceId.slice(0, 24));
      } else {
        console.log("🆔 Using existing device ID for this tab:", deviceId.slice(0, 24));
      }
      
      console.log("🔐 Authenticating with device ID:", deviceId.slice(0, 16));
      this.session = await this.client.authenticateDevice(deviceId, true, `Player_${deviceId.slice(0,8)}`);
      console.log("✅ Authenticated as user:", this.session.user_id.slice(0, 8));
      console.log("✅ Username:", this.session.username);
      return this.session;
    } catch (e) {
      console.error("❌ Auth failed:", e);
      throw e;
    }
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  async connect() {
    try {
      console.log("🔌 Connecting to Nakama...");
      
      // Authenticate first
      if (!this.session) {
        await this.authenticate();
      }

      // DON'T disconnect existing socket if it's working
      if (this.socket) {
        console.log("✅ Reusing existing socket connection");
        return this.socket;
      }

      console.log("🔌 Creating new socket...");
      this.socket = this.client.createSocket(false, false);
      
      // Add comprehensive event handlers
      this.socket.onconnect = () => {
        console.log("🔗 Socket connected and ready");
      };
      
      this.socket.ondisconnect = (event) => {
        console.warn("🔌 Socket disconnected:", event);
        // Don't auto-reconnect to avoid loops
        this.socket = null;
      };
      
      this.socket.onerror = (event) => {
        console.error("🔥 Socket error:", event);
      };
      
      // Connect with timeout
      console.log("📡 Establishing connection...");
      await Promise.race([
        this.socket.connect(this.session, true),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        )
      ]);
      
      console.log("✅ Socket connected successfully");
      return this.socket;
    } catch (e) {
      console.error("❌ Connection failed:", e);
      this.socket = null;
      throw new Error(`Connection failed: ${e.message}`);
    }
  }

  // ── Create Match ──────────────────────────────────────────────────────────
  async createMatch() {
    try {
      console.log("🎮 Creating match...");
      
      // Ensure we have a fresh connection
      await this.connect();
      
      // Verify socket is ready
      if (!this.socket) {
        throw new Error("Socket connection not established");
      }
      
      // Create generic match (more reliable than custom handlers)
      this.match = await this.socket.createMatch();
      
      // CRITICAL FIX: Store the correct session ID from match
      this.matchSessionId = this.match.self.session_id;
      console.log("✅ Generic match created:", this.match.match_id.slice(0, 16));
      console.log("✅ Match session ID:", this.matchSessionId.slice(0, 8));
      return this.match;
    } catch (e) {
      console.error("❌ Create match failed:", e);
      this.socket = null;
      throw new Error(`Failed to create match: ${e.message}`);
    }
  }

  // ── Join Match ────────────────────────────────────────────────────────────
  async joinMatch(matchId) {
    try {
      if (!this.socket) {
        await this.connect();
      }
      
      // If we already have this match (e.g., just created it), use it
      if (this.match && this.match.match_id === matchId) {
        console.log("✅ Using existing match:", matchId.slice(0, 16));
        return this.match;
      }
      
      console.log("🔗 Joining match:", matchId.slice(0, 16));
      this.match = await this.socket.joinMatch(matchId);
      
      // CRITICAL FIX: Store the correct session ID from match
      this.matchSessionId = this.match.self.session_id;
      console.log("✅ Joined match successfully, session ID:", this.matchSessionId.slice(0, 8));
      return this.match;
    } catch (e) {
      console.error("❌ Join match failed:", e);
      throw new Error(`Failed to join match: ${e.message}`);
    }
  }

  // ── Send Match Message ────────────────────────────────────────────────────
  sendMatchMessage(message) {
    if (!this.socket || !this.match) {
      console.warn("❌ Cannot send: no socket or match");
      return false;
    }
    
    try {
      this.socket.sendMatchState(
        this.match.match_id,
        1,
        JSON.stringify(message)
      );
      console.log("📤 Sent:", message.type);
      return true;
    } catch (e) {
      console.error("❌ Send failed:", e);
      return false;
    }
  }

  // ── Listen for Match Data ─────────────────────────────────────────────────
  onMatchState(callback) {
    if (!this.socket) {
      console.warn("❌ No socket for listener");
      return;
    }
    
    this.socket.onmatchdata = (data) => {
      try {
        const payload = JSON.parse(new TextDecoder().decode(data.data));
        callback(data.op_code, payload);
      } catch (e) {
        console.error("❌ Parse error:", e);
      }
    };
  }

  // ── Leave Match ───────────────────────────────────────────────────────────
  async leaveMatch() {
    if (this.socket && this.match) {
      try {
        await this.socket.leaveMatch(this.match.match_id);
        console.log("👋 Left match");
      } catch (e) {
        console.warn("Leave match error:", e.message);
      }
      this.match = null;
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  disconnect() {
    console.log("🔌 Disconnecting Nakama service...");
    if (this.socket) {
      try {
        this.socket.disconnect(false);
        console.log("✅ Socket disconnected");
      } catch (e) {
        console.warn("Disconnect error:", e.message);
      }
      this.socket = null;
    }
    this.match = null;
  }

  // ── Force Reconnect ───────────────────────────────────────────────────────
  async forceReconnect() {
    console.log("🔄 Force reconnecting...");
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.connect();
  }

  // ── RPC Calls (Leaderboard, Rooms) ───────────────────────────────────────
  async fetchLeaderboard() {
    try {
      if (!this.session) await this.authenticate();
      
      // Try to get real leaderboard data from localStorage
      const storedStats = this.getStoredStats();
      const allStats = Object.values(storedStats);
      
      if (allStats.length === 0) {
        return { 
          entries: [
            { rank: 1, username: "No games played yet", wins: 0, losses: 0, draws: 0, winRate: "0%" }
          ] 
        };
      }
      
      // Sort by wins, then by win rate
      const sorted = allStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
      });
      
      // Format entries
      const entries = sorted.map((stat, index) => ({
        rank: index + 1,
        username: stat.username || `Player ${stat.userId.slice(0, 8)}`,
        wins: stat.wins,
        losses: stat.losses,
        draws: stat.draws,
        winRate: `${Math.round(stat.winRate)}%`
      }));
      
      return { entries };
    } catch (e) {
      console.warn("Leaderboard error:", e.message);
      return { entries: [] };
    }
  }
  
  // Get all stored player stats
  getStoredStats() {
    try {
      const stats = localStorage.getItem('tictactoe_stats');
      return stats ? JSON.parse(stats) : {};
    } catch (e) {
      return {};
    }
  }
  
  // Update player stats after a game
  updatePlayerStats(userId, result) {
    try {
      const allStats = this.getStoredStats();
      const playerStats = allStats[userId] || {
        userId,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        username: `Player ${userId.slice(0, 8)}`
      };
      
      if (result === 'win') playerStats.wins++;
      else if (result === 'loss') playerStats.losses++;
      else if (result === 'draw') playerStats.draws++;
      
      const totalGames = playerStats.wins + playerStats.losses + playerStats.draws;
      playerStats.winRate = totalGames > 0 ? (playerStats.wins / totalGames) * 100 : 0;
      
      allStats[userId] = playerStats;
      localStorage.setItem('tictactoe_stats', JSON.stringify(allStats));
      
      console.log(`📊 Stats updated for ${userId.slice(0, 8)}:`, playerStats);
    } catch (e) {
      console.error('Failed to update stats:', e);
    }
  }

  async listRooms() {
    try {
      if (!this.session) await this.authenticate();
      const result = await this.client.rpc(this.session, "list_rooms", "");
      return JSON.parse(result.payload);
    } catch (e) {
      console.warn("Rooms RPC not available:", e.message);
      // Return empty rooms since backend RPCs aren't working
      // Users can still create/join matches using the main UI
      return { rooms: [] };
    }
  }

  // ── Matchmaker ────────────────────────────────────────────────────────────
  async findMatch() {
    try {
      if (!this.socket) await this.connect();
      
      const ticket = await this.socket.addMatchmaker("*", 2, 2, {});
      console.log("🎯 Matchmaker ticket created:", ticket.ticket);
      return ticket;
    } catch (e) {
      console.error("❌ Matchmaker failed:", e);
      throw new Error(`Matchmaker failed: ${e.message}`);
    }
  }

  onMatchmakerMatched(callback) {
    if (!this.socket) {
      console.warn("❌ No socket for matchmaker listener");
      return;
    }
    
    this.socket.onmatchmakermatched = (matched) => {
      console.log("🎉 Matchmaker found match:", matched);
      callback(matched);
    };
  }

  // ── Health Check ──────────────────────────────────────────────────────────
  async healthCheck() {
    try {
      if (!this.socket || !this.session) {
        return { healthy: false, reason: "No socket or session" };
      }
      
      // Try a simple operation
      const deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        return { healthy: false, reason: "No device ID" };
      }
      
      return { healthy: true, reason: "All systems operational" };
    } catch (e) {
      return { healthy: false, reason: e.message };
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  getMatchId()   { return this.match?.match_id || null; }
  getSessionId() { 
    // CRITICAL FIX: Use match session ID which is the correct identifier
    return this.matchSessionId || this.session?.user_id || null; 
  }
  getUserId()    { return this.session?.user_id || null; }
  isConnected()  { return !!this.socket; }
}

// Singleton
const nakamaService = new NakamaService();
window.nakamaService = nakamaService; // For debugging

export default nakamaService;
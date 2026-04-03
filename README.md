# ⭕❌ TicTacToe — Real-Time Multiplayer

A production-level multiplayer Tic-Tac-Toe using **React** + **Nakama** with a fully **server-authoritative** architecture.

---

## 🏗 Architecture and Design Decisions

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Nakama Server  │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ - Game UI       │    │ - Match Logic   │    │ - User Data     │
│ - WebSocket     │    │ - Authentication│    │ - Game Stats    │
│ - State Display │    │ - Real-time     │    │ - Leaderboards  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend:** React.js with Nakama JS SDK
- **Backend:** Nakama server with JavaScript runtime module  
- **Database:** PostgreSQL
- **Real-time:** WebSockets for live gameplay
- **Game Logic:** Server-authoritative via JavaScript plugin (`tictactoe.js`)
- **Deployment:** Docker & Docker Compose

### Design Decisions

1. **Server-Authoritative Architecture**
   - All game logic runs on the server to prevent cheating
   - Clients only display game state received from server
   - Move validation and win detection handled server-side

2. **WebSocket Communication**
   - Real-time bidirectional communication for responsive gameplay
   - Automatic reconnection handling for network stability
   - OpCode-based message routing (1=moves, 2=game state)

3. **Stateless Frontend**
   - React components receive authoritative state from server
   - No client-side game validation or logic
   - Simple and reliable UI updates based on server broadcasts

4. **Docker Containerization**
   - Consistent deployment across development and production
   - Easy scaling and maintenance with container orchestration
   - Isolated service dependencies and configuration

---

## 🚀 How to Run the Project

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) - for running Nakama server
- [Node.js 18+](https://nodejs.org/) - for React frontend

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd tictactoe

# Verify project structure
ls -la
# Should see: backend/, frontend/, docker-compose.yml, README.md
```

### Step 2: Start Backend Services

```bash
# Start backend services (recommended)
./start-backend.sh

# OR manually:
docker-compose up -d

# Verify containers are running
docker-compose ps

# Check Nakama logs (optional)
docker-compose logs nakama --tail=20
```

**Backend URLs:**
- Nakama Console: http://localhost:7350
- Nakama API: http://localhost:7349

### Step 3: Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Copy environment configuration
cp .env.example .env.local

# Install dependencies
npm install

# Start React development server
npm start
```

**Frontend URL:** http://localhost:3000

### Step 4: Test the Game

1. **Open Game**: Go to http://localhost:3000
2. **Create Game**: Click "🎮 Create Game" 
3. **Copy Match ID**: Copy the match ID shown at the top
4. **Second Player**: Open another browser tab/window (or incognito)
5. **Join Game**: Paste the match ID and click "🔗 Join Game"
6. **Play**: Take turns clicking cells - X goes first!

### 🚀 Quick Commands

**Start Everything:**
```bash
# Start backend
./start-backend.sh

# In a new terminal, start frontend
cd frontend && npm start
```

**Other Commands:**
```bash
# Stop everything
docker-compose down

# View logs
docker-compose logs nakama

# Restart backend only
docker-compose restart nakama
```

---

## 📁 Project Structure

```
tictactoe/
├── docker-compose.yml
├── backend/
│   └── nakama-modules/
│       └── tictactoe.go        ← ALL game logic (server-authoritative)
└── frontend/
    ├── package.json
    ├── .env.example
    └── src/
        ├── App.jsx
        ├── styles.css
        ├── services/
        │   └── nakama.js       ← WebSocket client & Nakama SDK wrapper
        ├── pages/
        │   ├── Home.jsx        ← Create / Join / Find match
        │   └── Game.jsx        ← Board, state sync, move handling
        └── components/
            ├── Board.jsx
            └── StatusBar.jsx
```

---

## 🎮 How to Play (2 Players)

1. **Player 1** opens http://localhost:3000 → clicks **Create Game**
2. Copy the **Match ID** shown at the top
3. **Player 2** opens http://localhost:3000 → pastes the ID → clicks **Join Game**
4. Game starts — X goes first

To simulate 2 players locally, open two **different browser profiles** (or one normal + one incognito window).

---

## 📡 Message Protocol

| Op Code | Direction | Payload |
|---------|-----------|---------|
| `1` MOVE | Client → Server | `{ cellIndex: 0-8 }` |
| `2` GAME_STATE | Server → Client | `GameState` (see below) |

### GameState shape (JSON)
```json
{
  "board":   ["X","","O","","X","","","","O"],
  "players": { "<sessionId>": "X", "<sessionId2>": "O" },
  "turn":    "<sessionId>",
  "winner":  "<sessionId> | draw | disconnect | ''",
  "status":  "waiting | playing | over"
}
```

---

## 🔐 Server-Authoritative Logic

The server (`tictactoe.go`) rejects any move that:
- Isn't the player's turn
- Targets an already-occupied cell
- Arrives after the game is over

The client **never** calculates game outcome — it only renders what the server sends.

---

## ☁️ Deployment

### Backend — DigitalOcean / AWS EC2

```bash
# On your server (Ubuntu)
sudo apt install docker.io docker-compose
git clone <your-repo>
cd tictactoe
docker-compose up -d
```

Open firewall ports: `7349`, `7350`, `7351`

### Frontend — Vercel

```bash
cd frontend
# Set env vars in Vercel dashboard:
#   REACT_APP_NAKAMA_HOST = your-server-ip
npx vercel --prod
```

---

## 🔧 Troubleshooting

### Backend Issues

**Nakama won't start:**
```bash
# Check if ports are in use
lsof -i :7349 -i :7350 -i :7351

# Stop all containers and restart
docker-compose down
docker system prune -f
docker-compose up -d
```

**"Plugin loading failed" error:**
```bash
# The Go plugin needs to be compiled for Linux
# Run this to build the plugin:
cd backend/nakama-modules
docker run --rm -v $(pwd):/build -w /build golang:1.21 \
  sh -c "go build --buildmode=plugin -o tictactoe.so tictactoe.go"

# Then restart Nakama
docker-compose restart nakama
```

### Frontend Issues

**"Module not found" errors:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Connection refused:**
- Verify backend is running: `docker-compose ps`
- Check .env.local has correct settings:
  ```
  REACT_APP_NAKAMA_HOST=127.0.0.1
  REACT_APP_NAKAMA_PORT=7350
  REACT_APP_NAKAMA_KEY=defaultkey
  ```

### Game Issues

**Can't create/join matches:**
- Check browser console for errors (F12)
- Verify Nakama console shows no errors: http://localhost:7351
- Try refreshing both browser tabs

**Moves not syncing:**
- Ensure both players are in the same match ID
- Check network tab in browser dev tools
- Restart the game session

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Two browsers, same match ID → both see the board
- [ ] Only current player's cells are clickable
- [ ] Invalid moves (wrong turn, occupied cell) are rejected silently
- [ ] Win is detected and displayed correctly
- [ ] Draw (full board) is detected
- [ ] Leaderboard updates after game ends

---

## ➕ Features Implemented

- ✅ **Real-time Multiplayer** — WebSocket-based gameplay with instant sync
- ✅ **Leaderboard** — Automatic stats tracking (wins/losses/draws/win rate)
- ✅ **Match System** — Create/join games via Match ID
- ✅ **Rooms Browser** — Browse available games
- ✅ **Deployment Ready** — See `DEPLOYMENT.md` for cloud deployment guide
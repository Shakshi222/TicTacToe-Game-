// TicTacToe JavaScript module for Nakama
// This module handles server-authoritative game logic

function InitModule(ctx, logger, nk, initializer) {
    logger.info("Initializing TicTacToe module");

    // Match handler functions
    var matchInit = function(ctx, logger, nk, params) {
        logger.info("TicTacToe match initialized");
        
        var state = {
            board: ["", "", "", "", "", "", "", "", ""],
            players: {},
            turn: "",
            winner: "",
            status: "waiting",
            turnDeadline: 0,
            timeLeft: 30
        };
        
        var tickRate = 5; // 5 ticks per second
        var label = JSON.stringify({ open: true, mode: "tictactoe" });
        
        return { state: state, tickRate: tickRate, label: label };
    };

    var matchJoinAttempt = function(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
        logger.info("Player attempting to join: " + presence.userId);
        
        if (Object.keys(state.players).length >= 2) {
            return { state: state, accept: false, rejectMessage: "Match is full" };
        }
        
        return { state: state, accept: true };
    };

    var matchJoin = function(ctx, logger, nk, dispatcher, tick, state, presences) {
        for (var i = 0; i < presences.length; i++) {
            var presence = presences[i];
            var playerId = presence.sessionId;
            
            logger.info("Processing join for player: " + playerId);
            
            // Skip if player already exists
            if (state.players[playerId]) {
                logger.info("Player already in match: " + playerId);
                continue;
            }
            
            if (Object.keys(state.players).length === 0) {
                state.players[playerId] = "X";
                logger.info("Player 1 (X) joined: " + playerId);
            } else if (Object.keys(state.players).length === 1) {
                state.players[playerId] = "O";
                state.status = "playing";
                state.turn = getFirstPlayer(state.players); // X goes first
                state.turnDeadline = Date.now() + 30000; // 30 seconds
                logger.info("Player 2 (O) joined: " + playerId + " - game starting");
                
                // Update label to mark match as no longer open
                dispatcher.matchLabelUpdate(JSON.stringify({ open: false, mode: "tictactoe" }));
            }
        }
        
        // Broadcast updated state
        broadcastState(dispatcher, state);
        return { state: state };
    };

    var matchLeave = function(ctx, logger, nk, dispatcher, tick, state, presences) {
        for (var i = 0; i < presences.length; i++) {
            var presence = presences[i];
            var playerId = presence.sessionId;
            delete state.players[playerId];
            logger.info("Player left: " + playerId);
        }
        
        if (Object.keys(state.players).length < 2 && state.status === "playing") {
            state.status = "over";
            state.winner = "disconnect";
            broadcastState(dispatcher, state);
        }
        
        return { state: state };
    };

    var matchLoop = function(ctx, logger, nk, dispatcher, tick, state, messages) {
        // Handle timeout
        if (state.status === "playing" && state.turnDeadline > 0) {
            var now = Date.now();
            var remaining = Math.max(0, Math.floor((state.turnDeadline - now) / 1000));
            state.timeLeft = remaining;
            
            if (now >= state.turnDeadline) {
                // Current player times out
                state.winner = getOtherPlayer(state.players, state.turn);
                state.status = "over";
                logger.info("Player " + state.turn + " timed out - " + state.winner + " wins");
                broadcastState(dispatcher, state);
                return { state: state };
            }
            
            // Broadcast tick update every second
            if (tick % 5 === 0) {
                broadcastState(dispatcher, state);
            }
        }
        
        // Process moves
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            if (message.opCode !== 1) continue; // OpCode 1 = move
            
            var senderId = message.sessionId;
            var symbol = state.players[senderId];
            
            logger.info("Processing move from player: " + senderId + " symbol: " + symbol);
            
            if (!symbol) {
                logger.warn("Move from unknown player: " + senderId);
                continue;
            }
            
            if (state.status !== "playing") {
                logger.warn("Move rejected - game not playing");
                continue;
            }
            
            if (state.turn !== senderId) {
                logger.warn("Move rejected - not player's turn. Current turn: " + state.turn);
                continue;
            }
            
            var moveData;
            try {
                moveData = JSON.parse(nk.binaryToString(message.data));
            } catch (e) {
                logger.error("Invalid move data: " + e.message);
                continue;
            }
            
            var cellIndex = moveData.cellIndex;
            if (cellIndex < 0 || cellIndex > 8) {
                logger.warn("Invalid cell index: " + cellIndex);
                continue;
            }
            
            if (state.board[cellIndex] !== "") {
                logger.warn("Cell already occupied: " + cellIndex);
                continue;
            }
            
            // Apply move
            state.board[cellIndex] = symbol;
            logger.info("Player " + senderId + " (" + symbol + ") played cell " + cellIndex);
            
            // Check win/draw
            var winner = checkWinner(state.board);
            if (winner) {
                state.winner = getPlayerBySymbol(state.players, winner);
                state.status = "over";
                state.turnDeadline = 0;
                logger.info("Game over - winner: " + state.winner);
            } else if (isBoardFull(state.board)) {
                state.winner = "draw";
                state.status = "over";
                state.turnDeadline = 0;
                logger.info("Game over - draw");
            } else {
                // Next turn
                state.turn = getOtherPlayer(state.players, senderId);
                state.turnDeadline = Date.now() + 30000;
                state.timeLeft = 30;
                logger.info("Next turn: " + state.turn);
            }
            
            broadcastState(dispatcher, state);
        }
        
        return { state: state };
    };

    var matchTerminate = function(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
        logger.info("Match terminated");
        return { state: state };
    };

    var matchSignal = function(ctx, logger, nk, dispatcher, tick, state, data) {
        return { state: state, data: "" };
    };

    // Helper functions
    function broadcastState(dispatcher, state) {
        var data = JSON.stringify(state);
        dispatcher.broadcastMessage(2, data); // OpCode 2 = game state
        logger.info("Broadcasting game state: " + JSON.stringify({
            status: state.status,
            playerCount: Object.keys(state.players).length,
            turn: state.turn
        }));
    }

    function checkWinner(board) {
        var lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var a = board[line[0]], b = board[line[1]], c = board[line[2]];
            if (a !== "" && a === b && b === c) {
                return a;
            }
        }
        return "";
    }

    function isBoardFull(board) {
        for (var i = 0; i < board.length; i++) {
            if (board[i] === "") {
                return false;
            }
        }
        return true;
    }

    function getFirstPlayer(players) {
        for (var id in players) {
            if (players[id] === "X") {
                return id;
            }
        }
        return "";
    }

    function getOtherPlayer(players, currentId) {
        for (var id in players) {
            if (id !== currentId) {
                return id;
            }
        }
        return "";
    }

    function getPlayerBySymbol(players, symbol) {
        for (var id in players) {
            if (players[id] === symbol) {
                return id;
            }
        }
        return "";
    }

    // RPC functions
    var listRooms = function(ctx, logger, nk, payload) {
        try {
            // List matches with the tictactoe label that are still open
            var matches = nk.matchList(10, true, "tictactoe", 0, 2, "");
            
            var rooms = [];
            for (var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var label = {};
                try {
                    label = JSON.parse(match.label);
                } catch (e) {
                    label = {};
                }
                
                if (label.open === true) {
                    rooms.push({
                        matchId: match.matchId,
                        size: match.size,
                        label: label
                    });
                }
            }
            
            logger.info("Listed " + rooms.length + " open rooms");
            return JSON.stringify({ rooms: rooms });
        } catch (e) {
            logger.error("Error listing rooms: " + e.message);
            return JSON.stringify({ rooms: [] });
        }
    };

    var getLeaderboard = function(ctx, logger, nk, payload) {
        try {
            // Placeholder leaderboard
            var entries = [
                { rank: 1, username: "Player1", score: 100 },
                { rank: 2, username: "Player2", score: 90 },
                { rank: 3, username: "Player3", score: 80 }
            ];
            
            return JSON.stringify({ entries: entries });
        } catch (e) {
            logger.error("Error getting leaderboard: " + e.message);
            return JSON.stringify({ entries: [] });
        }
    };

    // Register match handler
    initializer.registerMatch("tictactoe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
    
    // Register RPCs
    initializer.registerRpc("list_rooms", listRooms);
    initializer.registerRpc("get_leaderboard", getLeaderboard);
    
    logger.info("TicTacToe JavaScript match handler and RPCs registered successfully");
}
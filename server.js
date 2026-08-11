const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static frontend files from current directory
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const players = {};

io.on("connection", (socket) => {
    players[socket.id] = {
        x: 300,
        y: -100,
        animState: false
    };

    // Send current connected players to joining player
    socket.emit("currentPlayers", players);

    // Notify existing players
    socket.broadcast.emit("playerJoined", {
        id: socket.id,
        playerData: players[socket.id]
    });

    // Broadcast movement changes
    socket.on("playerMovement", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].animState = data.animState;

            socket.broadcast.emit("playerMoved", {
                id: socket.id,
                x: data.x,
                y: data.y,
                animState: data.animState
            });
        }
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("playerDisconnected", socket.id);
    });
});

// Use PORT environment variable supplied by host (Render/Railway), fallback to 3000 locally
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    players[socket.id] = {
        x: 0,
        y: 1,
        z: 0,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            
            socket.broadcast.emit('playerMoved', { id: socket.id, x: movementData.x, y: movementData.y, z: movementData.z });
        }
    });

    // Handle incoming chat messages
    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            io.emit('chatMessage', {
                id: socket.id,
                message: msg,
                color: players[socket.id].color
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

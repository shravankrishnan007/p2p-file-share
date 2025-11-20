const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from anywhere (for dev)
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
        
        // Notify others in the room so the Creator knows to send the Offer
        socket.to(roomId).emit('user-connected', socket.id);
    });

    // Relay all WebRTC signals (Offer, Answer, ICE Candidates)
    socket.on('signal', (data) => {
        const { roomId, signal } = data;
        socket.to(roomId).emit('signal', {
            sender: socket.id,
            signal: signal
        });
    });

    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Signaling Server running on port ${PORT}`);
});
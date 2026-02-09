import { Server } from 'socket.io';
import { setupVideoSocket } from './domain/video/videoSocket.js';
import { setupChatSocket } from './domain/chat/chatSocket.js';
import { setupMultiplayerSocket } from './domain/multiplayer/multiplayerSocket.js';

let io;

export function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: true,
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    setupVideoSocket(io);
    setupChatSocket(io);
    setupMultiplayerSocket(io); // Add this

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}

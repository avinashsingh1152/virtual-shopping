import { chatService } from './chatService.js';

export function setupChatSocket(io) {
    io.on('connection', (socket) => {
        // console.log(`Chat/Bot Socket connected: ${socket.id}`);

        socket.on('speak-to-bot', async (data) => {
            try {
                const { message, roomId, userId, userName } = data;

                if (!message || !roomId) {
                    socket.emit('bot-error', { message: 'Missing required fields' });
                    return;
                }

                // console.log(`Bot message from ${userName} in ${roomId}: ${message}`);

                const botResponse = await chatService.getBotResponse(message, roomId);

                // Respond to sender
                socket.emit('bot-response', {
                    roomId,
                    message: botResponse,
                    timestamp: new Date().toISOString()
                });

                // Broadcast to room (so everyone sees bot reply)
                socket.to(roomId).emit('bot-message', {
                    roomId,
                    userId,
                    userName,
                    userMessage: message,
                    botResponse,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Error in speak-to-bot:', error);
                socket.emit('bot-error', { message: 'Failed to get bot response', error: error.message });
            }
        });

        socket.on('clear-bot-history', ({ roomId }) => {
            if (!roomId) return;
            chatService.clearHistory(roomId);
            socket.emit('bot-history-cleared', { roomId, timestamp: new Date().toISOString() });
        });

        socket.on('join-bot-room', ({ roomId }) => {
            if (roomId) {
                socket.join(roomId);
                socket.emit('joined-bot-room', { roomId });
            }
        });

        socket.on('leave-bot-room', ({ roomId }) => {
            if (roomId) socket.leave(roomId);
        });

    });
}

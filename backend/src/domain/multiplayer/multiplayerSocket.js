export function setupMultiplayerSocket(io) {
    const playerNamespace = io.of('/player');
    const players = {};

    playerNamespace.on('connection', (socket) => {
        // console.log(`Multiplayer Socket connected: ${socket.id}`);

        // Send existing players to new player
        socket.emit('current-players', players);

        // Initialize player state
        players[socket.id] = {
            id: socket.id,
            position: [0, 0, 0],
            rotation: [0, 0, 0]
        };

        // Broadcast new player to others
        socket.broadcast.emit('new-player', players[socket.id]);

        socket.on('move', (data) => {
            if (players[socket.id]) {
                players[socket.id].position = data.position;
                players[socket.id].rotation = data.rotation;

                socket.broadcast.emit('player-moved', {
                    id: socket.id,
                    position: data.position,
                    rotation: data.rotation
                });
            }
        });

        socket.on('disconnect', () => {
            // console.log(`Multiplayer Socket disconnected: ${socket.id}`);
            delete players[socket.id];
            socket.broadcast.emit('player-left', socket.id);
        });
    });
}

import { randomUUID } from 'crypto';

// Redis setup removed for in-memory only mode
// const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/3';
// const redisClient = createClient({ ... });

// In-Memory State Only
console.log('Video Socket: Running in In-Memory Mode (No Redis)');

// State (In-Memory)
// State (In-Memory)
const rooms = new Map(); // roomId -> { users: Set, metadata: {} }
const users = new Map(); // socketId -> { userId, roomId, name, role, joinedAt }

// Seed Request: Create a default room so frontend has something to join
const defaultRoomId = 'fashion-1';
rooms.set(defaultRoomId, {
    users: new Set(),
    metadata: {
        createdAt: new Date().toISOString(),
        productCategory: 'General',
        owner: { userId: 'system', userName: 'System', socketId: 'system' }
    }
});
console.log(`Video Socket: Seeded default room '${defaultRoomId}'`);

export function getRooms() {
    return Array.from(rooms.values()).map(r => ({
        roomId: Array.from(rooms.keys()).find(key => rooms.get(key) === r),
        ...r.metadata,
        userCount: r.users.size
    }));
}

function generateUniqueUserId() {
    return `user-${randomUUID()}`;
}

async function leaveRoom(io, socket, roomId) {
    const room = rooms.get(roomId);
    if (room) {
        room.users.delete(socket.id);
        const user = users.get(socket.id);
        if (user) {
            socket.to(roomId).emit('user-left', {
                userId: user.userId,
                socketId: socket.id
            });
        }
        if (room.users.size === 0) {
            rooms.delete(roomId);
        }
    }
    socket.leave(roomId);
}

export function setupVideoSocket(io) {
    const meetingNamespace = io.of('/meeting');
    meetingNamespace.on('connection', (socket) => {
        // console.log(`Video/Socket connected: ${socket.id}`);

        socket.on('join-room', async ({ roomId, userId, userName, productCategory }) => {
            try {
                if (!roomId || !userName) {
                    socket.emit('error', { message: 'Missing required fields' });
                    return;
                }

                // const uniqueUserId = userId || generateUniqueUserId(); // Allow client to send ID? Original generated it.
                // Keeping original behavior of generating it on backend for reliability? 
                // Original: const uniqueUserId = generateUniqueUserId();
                // However, if we want persistence across reloads, client should probably send it. 
                // But let's stick to original logic to minimize frontend breakage risk for now.
                const uniqueUserId = generateUniqueUserId();

                const previousUser = users.get(socket.id);
                if (previousUser && previousUser.roomId) {
                    await leaveRoom(io, socket, previousUser.roomId);
                }

                let roomExists = rooms.has(roomId);
                // Check Redis if not in memory
                if (!roomExists) {
                    // Create new room
                    if (!productCategory) {
                        socket.emit('error', { message: 'Product category required for new room' });
                        return;
                    }
                    rooms.set(roomId, {
                        users: new Set(),
                        metadata: {
                            createdAt: new Date().toISOString(),
                            productCategory,
                            owner: { userId: uniqueUserId, userName, socketId: socket.id }
                        }
                    });
                }

                const room = rooms.get(roomId);
                room.users.add(socket.id);
                const isOwner = room.metadata.owner && room.metadata.owner.userId === uniqueUserId;

                users.set(socket.id, {
                    userId: uniqueUserId,
                    roomId,
                    name: userName,
                    socketId: socket.id,
                    role: isOwner ? 'owner' : 'participant',
                    joinedAt: new Date().toISOString()
                });

                socket.join(roomId);

                // Send initial state to joining user
                socket.emit('joined-room', {
                    roomId,
                    userId: uniqueUserId,
                    userName,
                    role: isOwner ? 'owner' : 'participant',
                    owner: room.metadata.owner
                });

                // Helper to get user info
                const getUserInfo = (sid) => {
                    const u = users.get(sid);
                    return u ? { userId: u.userId, userName: u.name, socketId: u.socketId, role: u.role || 'participant' } : null;
                };

                const existingUsers = Array.from(room.users)
                    .filter(sid => sid !== socket.id)
                    .map(getUserInfo)
                    .filter(Boolean);

                socket.emit('room-users', { users: existingUsers, owner: room.metadata.owner });

                socket.to(roomId).emit('user-joined', {
                    userId: uniqueUserId,
                    userName,
                    socketId: socket.id,
                    role: isOwner ? 'owner' : 'participant'
                });

            } catch (e) {
                console.error('Error join-room:', e);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('leave-room', async () => {
            const user = users.get(socket.id);
            if (user && user.roomId) await leaveRoom(io, socket, user.roomId);
        });

        socket.on('disconnect', async () => {
            const user = users.get(socket.id);
            if (user && user.roomId) await leaveRoom(io, socket, user.roomId);
            users.delete(socket.id);
        });

        // Signaling events
        const relaySignal = (event, dataKey) => {
            socket.on(event, (data) => {
                const { [dataKey]: payload, targetSocketId, roomId } = data;
                const user = users.get(socket.id);
                if (!user || user.roomId !== roomId) return;
                socket.to(targetSocketId).emit(event, {
                    [dataKey]: payload,
                    senderSocketId: socket.id,
                    senderUserId: user.userId,
                    senderUserName: user.name
                });
            });
        };

        relaySignal('offer', 'offer');
        relaySignal('answer', 'answer');

        socket.on('ice-candidate', ({ candidate, targetSocketId, roomId }) => {
            const user = users.get(socket.id);
            if (!user || user.roomId !== roomId) return;
            socket.to(targetSocketId).emit('ice-candidate', { candidate, senderSocketId: socket.id });
        });

        // Media State Toggles
        socket.on('toggle-audio', ({ isMuted, roomId }) => {
            const user = users.get(socket.id);
            if (!user || user.roomId !== roomId) return;
            socket.to(roomId).emit('user-audio-changed', { userId: user.userId, socketId: socket.id, isMuted });
        });

        socket.on('toggle-video', ({ isVideoOff, roomId }) => {
            const user = users.get(socket.id);
            if (!user || user.roomId !== roomId) return;
            socket.to(roomId).emit('user-video-changed', { userId: user.userId, socketId: socket.id, isVideoOff });
        });

        // Chat
        socket.on('chat-message', ({ roomId, message, userName }) => {
            const user = users.get(socket.id);
            if (!user || user.roomId !== roomId) return;
            socket.to(roomId).emit('chat-message', {
                userId: user.userId,
                userName: userName || user.name,
                message,
                timestamp: new Date().toISOString()
            });
        });

    });
}

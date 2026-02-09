import express from 'express';
import { getRooms } from './videoSocket.js';

const router = express.Router();

// Get all rooms (standard endpoint)
router.get('/rooms', (req, res) => {
    try {
        const rooms = getRooms();
        res.json({
            success: true,
            rooms: rooms,
            count: rooms.length
        });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Backward compatibility (Frontend calls /api/redis/rooms)
router.get('/redis/rooms', (req, res) => {
    try {
        const rooms = getRooms();
        res.json({
            success: true,
            rooms: rooms,
            count: rooms.length
        });
    } catch (error) {
        console.error('Error fetching rooms (legacy):', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

export default router;

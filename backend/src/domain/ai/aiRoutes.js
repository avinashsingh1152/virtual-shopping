import express from 'express';
import { chatService } from '../chat/chatService.js';

const router = express.Router();

// POST /api/ai/chat (Adapter to chatService)
router.post('/chat', async (req, res) => {
    try {
        const { message, conversationId, userId } = req.body;

        // key difference: 'conversationId' vs 'roomId'. Map conversationId to roomId.
        const roomId = conversationId || `conv-${userId || 'anon'}-${Date.now()}`;

        const response = await chatService.getBotResponse(message, roomId);

        res.json({
            success: true,
            conversationId: roomId,
            response: response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('AI API Error:', error);
        res.status(500).json({ error: 'Failed to process AI request' });
    }
});

// GET /api/ai/conversation/:conversationId
router.get('/conversation/:conversationId', (req, res) => {
    const history = chatService.getHistory(req.params.conversationId);
    // Transform formatting if needed? 
    // chatService history: [{ role, parts: [{text}] }]
    // aiAgent history: [{ role, content, timestamp }]
    // Adapter:
    const adapted = history.map(h => ({
        role: h.role === 'model' ? 'assistant' : h.role,
        content: h.parts[0].text,
        timestamp: new Date().toISOString() // We don't store timestamp in chatService history currently
    }));

    res.json({
        success: true,
        conversationId: req.params.conversationId,
        messages: adapted,
        count: adapted.length
    });
});

export default router;

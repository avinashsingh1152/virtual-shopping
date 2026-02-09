import express from 'express';
import { chatService } from './chatService.js';
import { textToSpeechBase64, textToSpeech } from '../../shared/ttsService.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
    try {
        const { message, roomId, includeAudio } = req.body;
        const response = await chatService.getBotResponse(message, roomId);

        const result = {
            success: true,
            message: response,
            roomId
        };

        if (includeAudio) {
            try {
                result.audio = await textToSpeechBase64(response);
                result.audioFormat = 'mp3';
            } catch (err) {
                console.error('TTS Error:', err);
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Bot Chat Error:', error);
        res.status(500).json({ error: 'Failed to get bot response' });
    }
});

router.post('/audio', async (req, res) => {
    try {
        const { text, lang } = req.body;
        const buffer = await textToSpeech(text, lang);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'TTS Failed' });
    }
});

router.delete('/chat/:roomId', (req, res) => {
    chatService.clearHistory(req.params.roomId);
    res.json({ success: true });
});

router.get('/chat/:roomId/history', (req, res) => {
    const history = chatService.getHistory(req.params.roomId);
    res.json({ success: true, history });
});

export default router;

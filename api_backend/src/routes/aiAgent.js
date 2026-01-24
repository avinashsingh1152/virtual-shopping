import express from 'express';
import axios from 'axios';

const router = express.Router();

// In-memory storage for prototype (replace with actual AI service)
const conversationHistory = new Map();

/**
 * POST /api/ai/chat
 * Send a message to the AI agent
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId, userId } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message is required'
      });
    }

    // Generate conversation ID if not provided
    const convId = conversationId || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get or create conversation history
    if (!conversationHistory.has(convId)) {
      conversationHistory.set(convId, []);
    }

    const history = conversationHistory.get(convId);
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Simulate AI response (replace with actual AI service integration)
    const aiResponse = await generateAIResponse(message, history);

    history.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      conversationId: convId,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Agent error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process AI request'
    });
  }
});

/**
 * GET /api/ai/conversation/:conversationId
 * Get conversation history
 */
router.get('/conversation/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const history = conversationHistory.get(conversationId);

    if (!history) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversationId,
      messages: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch conversation'
    });
  }
});

/**
 * DELETE /api/ai/conversation/:conversationId
 * Delete conversation history
 */
router.delete('/conversation/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const deleted = conversationHistory.delete(conversationId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete conversation'
    });
  }
});

/**
 * GET /api/ai/conversations
 * List all conversations
 */
router.get('/conversations', (req, res) => {
  try {
    const conversations = Array.from(conversationHistory.entries()).map(([id, messages]) => ({
      conversationId: id,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.timestamp
    }));

    res.json({
      success: true,
      conversations,
      total: conversations.length
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list conversations'
    });
  }
});

/**
 * Simulate AI response (replace with actual AI service)
 * For prototype: Simple echo with some basic responses
 */
async function generateAIResponse(message, history) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const lowerMessage = message.toLowerCase();

  // Simple rule-based responses for prototype
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return 'Hello! How can I assist you today?';
  }

  if (lowerMessage.includes('help')) {
    return 'I\'m here to help! You can ask me questions, and I\'ll do my best to assist you.';
  }

  if (lowerMessage.includes('time')) {
    return `The current time is ${new Date().toLocaleString()}`;
  }

  if (lowerMessage.includes('weather')) {
    return 'I don\'t have access to weather data in this prototype. Please integrate with a weather API for real data.';
  }

  // Default response
  return `I received your message: "${message}". This is a prototype AI agent. Integrate with OpenAI, Anthropic, or another AI service for actual responses.`;
}

export { router as aiAgentRouter };

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Genvoy API Configuration
const GENVOY_BASE_URL = process.env.GENVOY_BASE_URL || 'https://genvoy.flipkart.net';
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
const SUBSCRIPTION_KEY = process.env.GENVOY_SUBSCRIPTION_KEY || 'dasf78sdf8dsf8dsf6d7b9ecd';

console.log('Bot Service Configuration:', {
  baseUrl: GENVOY_BASE_URL,
  modelName: MODEL_NAME,
  hasKey: !!SUBSCRIPTION_KEY
});

// Store conversation history per room
const conversationHistory = new Map(); // roomId -> array of messages

/**
 * Get bot response from Gemini API via Genvoy
 * @param {string} roomId - Room ID for conversation context
 * @param {string} message - User's message
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @returns {Promise<string>} - Bot's response
 */
export async function getBotResponse(roomId, message, userId, userName) {
  try {
    // Get or initialize conversation history for this room
    if (!conversationHistory.has(roomId)) {
      conversationHistory.set(roomId, []);
      
      // Add system instruction
      conversationHistory.get(roomId).push({
        role: 'user',
        parts: [{ text: `You are a friendly Flipkart salesperson. Help customers with Flipkart products only.` }]
      });
    }

    // Add user message to history
    conversationHistory.get(roomId).push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Prepare request
    const requestData = {
      model: MODEL_NAME,
      messages: conversationHistory.get(roomId),
      temperature: 0.7,
      max_tokens: 500
    };

    // Call Genvoy API
    const response = await axios.post(
      `${GENVOY_BASE_URL}/v1/chat/completions`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-subscription-key': SUBSCRIPTION_KEY
        },
        timeout: 30000
      }
    );

    const botResponse = response.data.choices[0]?.message?.content || 'Sorry, I could not process that.';

    // Add bot response to history
    conversationHistory.get(roomId).push({
      role: 'assistant',
      parts: [{ text: botResponse }]
    });

    // Keep history limited (last 20 messages)
    if (conversationHistory.get(roomId).length > 20) {
      conversationHistory.set(roomId, conversationHistory.get(roomId).slice(-20));
    }

    return botResponse;
  } catch (error) {
    console.error('Error calling Genvoy API:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return 'Sorry, I encountered an error. Please try again.';
  }
}

/**
 * Clear conversation history for a room
 * @param {string} roomId - Room ID
 */
export function clearConversationHistory(roomId) {
  if (conversationHistory.has(roomId)) {
    conversationHistory.delete(roomId);
    console.log(`Conversation history cleared for room ${roomId}`);
  }
}

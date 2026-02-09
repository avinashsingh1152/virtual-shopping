import { genvoyService } from '../ai/genvoyService.js';
import { productService } from '../product/productService.js';
import dotenv from 'dotenv';

dotenv.config();

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
const SUBSCRIPTION_KEY = process.env.GENVOY_SUBSCRIPTION_KEY;

// Store conversation history per room
const conversationHistory = new Map(); // roomId -> array of messages

export const chatService = {
    async getBotResponse(message, roomId) {
        if (!roomId) throw new Error('Room ID is required');

        // Get products for context
        const productsResponse = await productService.getAllProducts({ limit: 1000 }); // Get all for context
        const products = productsResponse.products;
        const productContext = this._buildProductContext(products);

        // Initialize history if needed
        if (!conversationHistory.has(roomId)) {
            conversationHistory.set(roomId, []);
            this._initializeConversation(roomId, productContext, products);
        }

        const history = conversationHistory.get(roomId);

        // Refresh context periodically
        if (history.length % 10 === 0) {
            this._refreshContext(roomId, productContext);
        }

        // Add user message
        history.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // Prepare Payload
        // Include system instruction in payload (Gemini API style)
        const systemInstructionText = `You are a Flipkart salesperson in Flipkart Mall. You MUST ONLY discuss Flipkart products, their features, specifications, prices, and availability. You MUST NOT answer questions about topics unrelated to Flipkart products. If asked about non-product topics, politely redirect to Flipkart products. Always be helpful, enthusiastic, and professional. Focus on helping customers discover and learn about Flipkart products.\n\n${productContext}`;

        const requestPayload = {
            contents: history,
            systemInstruction: {
                parts: [{ text: systemInstructionText.substring(0, 30000) }] // Limit size just in case
            },
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.6
            }
        };

        try {
            if (!SUBSCRIPTION_KEY) {
                // Fallback if no key
                return this._getFallbackResponse(message, products);
            }

            const data = await genvoyService.generateContent(MODEL_NAME, requestPayload, SUBSCRIPTION_KEY);

            if (data && data.candidates && data.candidates.length > 0) {
                const responseText = data.candidates[0].content.parts[0].text;

                history.push({
                    role: 'model',
                    parts: [{ text: responseText }]
                });

                // Limit history
                if (history.length > 20) {
                    // Keep system msg? Actually system instruction is separate in payload for Gemini
                    // Just keep last 20 messages
                    const recent = history.slice(-20);
                    conversationHistory.set(roomId, recent);
                }

                return responseText;
            }
            throw new Error('Invalid response from Genvoy');
        } catch (error) {
            console.error('Chat Service Error:', error.message);
            return this._getFallbackResponse(message, products);
        }
    },

    clearHistory(roomId) {
        conversationHistory.delete(roomId);
    },

    getHistory(roomId) {
        return conversationHistory.get(roomId) || [];
    },

    _initializeConversation(roomId, productContext, products) {
        const history = conversationHistory.get(roomId);
        // Note: With systemInstruction in payload, we don't strictly need it in history as 'user' message,
        // but the original code did it. I will rely on systemInstruction field in payload 
        // and just add a welcome message from 'model' to history if empty?
        // Actually, let's just leave it empty and let the first response be generated or added.

        // Original code added a welcome message.
        // "Welcome to Flipkart Mall..."
        // We can just return that as first response if history is empty? 
        // But getBotResponse is called with a user message.

        // Let's add the welcome message as if it was already said.
        history.push({
            role: 'model',
            parts: [{ text: `Welcome to Flipkart Mall! I'm your personal shopping assistant. I have access to our complete product catalog with ${products.length} amazing products. What can I help you find today?` }]
        });
    },

    _refreshContext(roomId, productContext) {
        // With systemInstruction in payload, we just need to ensure we use the latest context in the payload construction.
        // So nothing to do here specifically for history array, unless we were embedding context in history.
    },

    _buildProductContext(products) {
        if (!products || products.length === 0) return 'No products available.';

        // Concscise formatting
        const byCategory = {};
        products.forEach(p => {
            if (!byCategory[p.category]) byCategory[p.category] = [];
            byCategory[p.category].push(p);
        });

        let context = `PRODUCT CATALOG (${products.length} products):\n`;
        for (const [cat, items] of Object.entries(byCategory)) {
            context += `${cat}:\n`;
            items.forEach(p => {
                context += `- ${p.name} ($${p.price}) - ${p.description.substring(0, 100)}...\n`;
            });
        }
        return context;
    },

    _getFallbackResponse(message, products) {
        const lower = message.toLowerCase();
        if (lower.includes('phone')) return "I have great phones! Check out the iPhone or Samsung Galaxy.";
        return "I'm having trouble connecting to my brain, but I can still show you our products!";
    }
};

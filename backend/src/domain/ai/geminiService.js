import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Google Generative AI client
// Requires GEMINI_API_KEY to be set in environment variables
const API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    console.warn('⚠️ GEMINI_API_KEY is not set. Gemini AI features will not work.');
}

const DEFAULT_MODEL = 'gemini-2.0-flash';

export const geminiService = {
    /**
     * Generate content using Google Gemini API
     * @param {string} modelName - Model to use (e.g., 'gemini-2.0-flash')
     * @param {object} payload - Request payload (contents, systemInstruction, generationConfig)
     * @returns {Promise<object>} - Response object matching expected format for chatService
     */
    async generateContent(modelName, payload) {
        if (!genAI) {
            throw new Error('GEMINI_API_KEY is missing. Cannot call Gemini API.');
        }

        try {
            const modelId = modelName || DEFAULT_MODEL;

            // Configure the model
            const modelConfig = {
                model: modelId,
            };

            if (payload.systemInstruction) {
                modelConfig.systemInstruction = payload.systemInstruction;
            }

            if (payload.generationConfig) {
                modelConfig.generationConfig = payload.generationConfig;
            }

            const model = genAI.getGenerativeModel(modelConfig);

            // Extract chat history from payload.contents
            // The SDK expects history + new message logic for chat, 
            // OR we can use generateContent with a list of messages.
            // payload.contents is already an array of { role, parts: [{ text }] }

            const result = await model.generateContent({
                contents: payload.contents,
                generationConfig: payload.generationConfig
            });

            const response = await result.response;
            const text = response.text();

            // Return in a format similar to what chatService expects
            // chatService expects: data.candidates[0].content.parts[0].text
            return {
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: text }
                            ]
                        }
                    }
                ]
            };

        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error(`Gemini API Error: ${error.message}`);
        }
    }
};

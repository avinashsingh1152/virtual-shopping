import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GENVOY_BASE_URL = process.env.GENVOY_BASE_URL || 'https://genvoy.flipkart.net';

export const genvoyService = {
    async generateContent(modelName, payload, subscriptionKey) {
        if (!subscriptionKey) {
            throw new Error('Missing Subscription Key for Genvoy API');
        }

        const endpoint = `${GENVOY_BASE_URL}/${modelName}/:generateContent`;

        try {
            const response = await axios.post(endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': subscriptionKey
                },
                timeout: 60000 // 60s timeout
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                const errorMsg = error.response.data?.error?.message ||
                    error.response.data?.message ||
                    `HTTP ${error.response.status}: ${error.response.statusText}`;
                throw new Error(`Genvoy API Error: ${errorMsg}`);
            }
            throw error;
        }
    },

    async generateChatCompletion(payload, subscriptionKey) {
        const endpoint = `${GENVOY_BASE_URL}/v1/chat/completions`;
        try {
            const response = await axios.post(endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-subscription-key': subscriptionKey
                },
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            console.error('Genvoy Chat Completion Error:', error.message);
            throw error;
        }
    }
};

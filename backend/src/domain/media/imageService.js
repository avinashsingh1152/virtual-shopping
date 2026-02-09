import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { genvoyService } from '../ai/genvoyService.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get public directory
const getPublicDir = () => path.join(__dirname, '..', '..', '..', 'public');
const IMAGES_DIR = path.join(getPublicDir(), 'product-images');

const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL_NAME || 'gemini-2.5-flash-image';
const IMAGE_SUBSCRIPTION_KEY = process.env.GEMINI_IMAGE_SUBSCRIPTION_KEY;

// Store product metadata in memory (could be moved to Redis)
const productMetadata = new Map();

export const imageService = {
    async ensureImageDir() {
        try {
            await fs.mkdir(IMAGES_DIR, { recursive: true });
        } catch (error) {
            console.error('Error creating images directory:', error);
        }
    },

    async generateProductImage(category, productDescription) {
        await this.ensureImageDir();

        const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const timestamp = Date.now();
        const filename = `${safeCategory}_${timestamp}.png`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Payload for Image Generation
        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `Generate a high-quality, professional product image for Flipkart e-commerce: ${productDescription || category}. The image should be clean, well-lit, with a white or neutral background.` }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.4
            }
        };

        try {
            const data = await genvoyService.generateContent(
                IMAGE_MODEL_NAME,
                payload,
                IMAGE_SUBSCRIPTION_KEY
            );

            if (data && data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                // Check inline data
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inline_data && part.inline_data.data) {
                            const imageBuffer = Buffer.from(part.inline_data.data, 'base64');
                            await fs.writeFile(filepath, imageBuffer);
                            return `/product-images/${filename}`;
                        }
                    }
                }
                // Check image URL
                if (data.imageUrl) {
                    const imageResponse = await axios.get(data.imageUrl, { responseType: 'arraybuffer' });
                    await fs.writeFile(filepath, Buffer.from(imageResponse.data));
                    return `/product-images/${filename}`;
                }
            }
            throw new Error('No image data in response');
        } catch (error) {
            console.error('Image generation failed:', error.message);
            throw error;
        }
    },

    async getStoredImages(category) {
        // Basic listing from directory
        await this.ensureImageDir();
        const files = await fs.readdir(IMAGES_DIR);
        // Filter by category prefix
        const categoryFiles = files.filter(f => f.startsWith(category.toLowerCase().replace(/[^a-z0-9]/g, '_')));
        return categoryFiles.map(f => `/product-images/${f}`);
    }
};

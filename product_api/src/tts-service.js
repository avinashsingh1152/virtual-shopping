import gtts from 'gtts';

/**
 * Convert text to speech and return audio buffer
 * @param {string} text - Text to convert to speech
 * @param {string} lang - Language code (default: 'en')
 * @returns {Promise<Buffer>} - Audio buffer
 */
export async function textToSpeech(text, lang = 'en') {
  return new Promise((resolve, reject) => {
    try {
      // Clean text for better TTS (remove emojis and special characters)
      const cleanText = text.replace(/[🎤👋🛍️🤖⭐]/g, '').trim();
      
      if (!cleanText || cleanText.length === 0) {
        reject(new Error('Empty text after cleaning'));
        return;
      }

      // Create GTS instance
      const gttsInstance = new gtts(cleanText, lang);
      
      // Collect audio chunks
      const chunks = [];
      
      const stream = gttsInstance.stream();
      
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      stream.on('end', () => {
        try {
          const audioBuffer = Buffer.concat(chunks);
          resolve(audioBuffer);
        } catch (error) {
          reject(error);
        }
      });
      
      stream.on('error', (error) => {
        console.error('TTS Stream Error:', error);
        reject(error);
      });
    } catch (error) {
      console.error('Error creating TTS:', error);
      reject(error);
    }
  });
}

/**
 * Convert text to speech and return as base64 string
 * @param {string} text - Text to convert to speech
 * @param {string} lang - Language code (default: 'en')
 * @returns {Promise<string>} - Base64 encoded audio
 */
export async function textToSpeechBase64(text, lang = 'en') {
  try {
    const audioBuffer = await textToSpeech(text, lang);
    return audioBuffer.toString('base64');
  } catch (error) {
    console.error('Error converting to base64:', error);
    throw error;
  }
}

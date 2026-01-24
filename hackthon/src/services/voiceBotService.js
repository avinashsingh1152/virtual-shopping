// Voice Bot Service - Uses REST API for voice-to-voice communication
// Backend: http://localhost:3006/api/bot/chat

const BOT_API_BASE_URL = import.meta.env.VITE_BOT_API_BASE_URL || 'http://localhost:3006'

class VoiceBotService {
  constructor() {
    this.isConnected = false
    this.roomId = null
    this.onResponse = null
    this.onError = null
  }

  /**
   * Initialize connection (no actual connection needed for REST API)
   * @param {string} roomId - Room ID
   */
  async connect(roomId) {
    this.roomId = roomId || 'room-abc123'
    this.isConnected = true
    return Promise.resolve()
  }

  /**
   * Disconnect (no-op for REST API)
   */
  disconnect() {
    this.isConnected = false
    this.roomId = null
  }

  /**
   * Send message to bot and get voice response
   * @param {string} text - Message text
   * @returns {Promise<{message: string, audio: string, audioFormat: string}>}
   */
  async sendMessage(text) {
    if (!this.roomId) {
      throw new Error('Room ID not set. Call connect() first.')
    }

    try {
      const response = await fetch(`${BOT_API_BASE_URL}/api/bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          roomId: this.roomId,
          includeAudio: true // Request audio response
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.message) {
        // Call response callback
        if (this.onResponse) {
          this.onResponse({
            text: data.message,
            audio: data.audio,
            audioFormat: data.audioFormat || 'mp3'
          })
        }

        return data
      } else {
        throw new Error(data.error || 'Failed to get response from bot')
      }
    } catch (error) {
      console.error('Error sending message to bot:', error)
      if (this.onError) {
        this.onError(error)
      }
      throw error
    }
  }

  /**
   * Play audio from base64 string
   * @param {string} base64Audio - Base64 encoded audio
   * @param {string} format - Audio format (mp3, wav, etc.)
   * @returns {Promise<HTMLAudioElement>} - Returns the audio element for event handling
   */
  playAudio(base64Audio, format = 'mp3') {
    if (!base64Audio) {
      console.warn('No audio data to play')
      return Promise.resolve(null)
    }

    return new Promise((resolve, reject) => {
      try {
        // Create audio element
        const audio = new Audio(`data:audio/${format};base64,${base64Audio}`)
        
        audio.onloadeddata = () => {
          console.log('Audio loaded, playing...')
          audio.play().then(() => {
            resolve(audio)
          }).catch(error => {
            console.error('Error playing audio:', error)
            reject(error)
          })
        }

        audio.onerror = (error) => {
          console.error('Audio playback error:', error)
          reject(error)
        }

        audio.onended = () => {
          console.log('Audio playback finished')
          // Trigger callback if set
          if (this.onAudioEnded) {
            this.onAudioEnded()
          }
        }

        // Store current audio for potential cleanup
        this.currentAudio = audio

        // Load and play
        audio.load()
      } catch (error) {
        console.error('Error creating audio element:', error)
        reject(error)
      }
    })
  }

  /**
   * Stop current audio playback
   */
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
  }

  /**
   * Set callback for when audio ends
   * @param {Function} callback - Callback function
   */
  setOnAudioEnded(callback) {
    this.onAudioEnded = callback
  }

  /**
   * Set callback for bot responses
   * @param {Function} callback - Callback function(data)
   */
  setOnResponse(callback) {
    this.onResponse = callback
  }

  /**
   * Set callback for errors
   * @param {Function} callback - Callback function(error)
   */
  setOnError(callback) {
    this.onError = callback
  }

  /**
   * Check if connected
   */
  getIsConnected() {
    return this.isConnected
  }
}

// Export singleton instance
export const voiceBotService = new VoiceBotService()

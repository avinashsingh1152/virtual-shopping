// AI Agent Socket.IO service for NPC interaction
import io from 'socket.io-client'

class AIAgentService {
  constructor() {
    this.aiSocket = null
    this.isConnected = false
    this.roomId = null
    this.onResponse = null
    this.audioContext = null
    this.speechSynthesis = null
  }

  /**
   * Connect to AI Agent Socket.IO server
   */
  connect(roomId) {
    if (this.aiSocket?.connected && this.roomId === roomId) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      // Disconnect existing connection if room changed
      if (this.aiSocket) {
        this.disconnect()
      }

      // Connect to AI Agent namespace on port 3001
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : window.location.origin

      const socketUrl = `${serverUrl}/ai-agent`
      this.aiSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      this.aiSocket.on('connect', () => {
        this.isConnected = true
        this.roomId = roomId
        console.log('Connected to AI Agent service')
        resolve()
      })

      this.aiSocket.on('disconnect', () => {
        this.isConnected = false
        console.log('Disconnected from AI Agent service')
      })

      this.aiSocket.on('connect_error', (error) => {
        console.error('AI Agent connection error:', error)
        reject(error)
      })

      // Listen for AI responses
      this.aiSocket.on('ai-response', (data) => {
        console.log('AI Response:', data.text)
        if (this.onResponse) {
          this.onResponse(data)
        }
        // Automatically speak the response
        this.speakResponse(data.text)
      })

      // Initialize speech synthesis
      if ('speechSynthesis' in window) {
        this.speechSynthesis = window.speechSynthesis
      }
    })
  }

  /**
   * Disconnect from AI Agent Socket.IO server
   */
  disconnect() {
    if (this.aiSocket) {
      this.aiSocket.off('ai-response')
      this.aiSocket.disconnect()
      this.aiSocket = null
      this.isConnected = false
      this.roomId = null
    }
  }

  /**
   * Send message to AI agent
   * @param {string} text - Message text
   */
  askAI(text) {
    if (!this.aiSocket || !this.isConnected || !this.roomId) {
      console.warn('AI Agent not connected')
      return
    }

    this.aiSocket.emit('ask-ai', {
      roomId: this.roomId,
      text: text
    })
  }

  /**
   * Set callback for AI responses
   * @param {Function} callback - Callback function(data)
   */
  setOnResponse(callback) {
    this.onResponse = callback
  }

  /**
   * Speak AI response using Web Speech API
   * @param {string} text - Text to speak
   */
  speakResponse(text) {
    if (!text || !text.trim()) {
      console.warn('No text to speak')
      return
    }

    // Wait for voices to be loaded
    const speak = () => {
      if (!('speechSynthesis' in window)) {
        console.error('Speech synthesis not supported')
        return
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      // Create speech utterance
      const utterance = new SpeechSynthesisUtterance(text.trim())
      utterance.rate = 0.9 // Slightly slower for clarity
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Get voices and select the best one
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        // Try to find a natural-sounding voice
        const preferredVoice = voices.find(voice =>
          voice.lang.includes('en') && (
            voice.name.includes('Google') ||
            voice.name.includes('Natural') ||
            voice.name.includes('Samantha') ||
            voice.name.includes('Alex')
          )
        ) || voices.find(voice => voice.lang.includes('en-US')) || voices.find(voice => voice.lang.includes('en'))

        if (preferredVoice) {
          utterance.voice = preferredVoice
          console.log('Using voice:', preferredVoice.name)
        }
      }

      // Event handlers
      utterance.onstart = () => {
        console.log('Started speaking:', text)
      }

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error)
      }

      utterance.onend = () => {
        console.log('Finished speaking')
      }

      // Speak the text
      window.speechSynthesis.speak(utterance)
    }

    // If voices are already loaded, speak immediately
    if (window.speechSynthesis.getVoices().length > 0) {
      speak()
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        speak()
        window.speechSynthesis.onvoiceschanged = null // Remove listener after first use
      }

      // Fallback: speak after a short delay
      setTimeout(() => {
        if (window.speechSynthesis.getVoices().length > 0) {
          speak()
        }
      }, 100)
    }
  }

  /**
   * Check if connected
   */
  getIsConnected() {
    return this.isConnected && this.aiSocket?.connected
  }
}

// Export singleton instance
export const aiAgentService = new AIAgentService()

/**
 * Voice Chat Implementation for Frontend
 * Copy this code to your new frontend project
 * 
 * Backend API: http://localhost:3006 (or your backend URL)
 * 
 * Requirements:
 * - Browser with SpeechRecognition support (Chrome, Edge, Safari)
 * - No additional dependencies needed
 */

class VoiceChat {
  constructor(apiBaseUrl = 'http://localhost:3006') {
    this.apiBaseUrl = apiBaseUrl;
    this.recognition = null;
    this.isListening = false;
    this.isVoiceOutputEnabled = true;
    this.roomId = 'room-123';
    this.init();
  }

  init() {
    this.initVoiceRecognition();
  }

  // Initialize browser's Speech Recognition API
  initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onListeningStart) this.onListeningStart();
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (this.onTranscript) this.onTranscript(transcript);
        this.isListening = false;
        // Auto-send message after voice input
        setTimeout(() => this.sendMessage(transcript), 500);
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        if (this.onError) this.onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onListeningEnd) this.onListeningEnd();
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  // Toggle voice input (start/stop listening)
  toggleVoiceInput() {
    if (!this.recognition) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        if (this.onError) this.onError(error);
      }
    }
  }

  // Send message to backend and get response with optional audio
  async sendMessage(message, roomId = this.roomId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          roomId: roomId,
          includeAudio: this.isVoiceOutputEnabled
        })
      });

      const data = await response.json();

      if (data.success) {
        // Callback for bot message
        if (this.onMessage) this.onMessage(data.message);
        
        // Play audio if available and voice output is enabled
        if (data.audio && this.isVoiceOutputEnabled) {
          this.playAudio(data.audio);
        }
      } else {
        if (this.onError) this.onError(data.error || 'Failed to get response');
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  // Play audio from base64 string (from backend)
  playAudio(base64Audio) {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      
      // Create audio URL and play
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        if (this.onAudioPlay) this.onAudioPlay();
      };
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up
        if (this.onAudioEnd) this.onAudioEnd();
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        if (this.onError) this.onError(error);
      };
      
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      if (this.onError) this.onError(error);
    }
  }

  // Get audio for any text (separate endpoint)
  async getAudioForText(text, lang = 'en') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/bot/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          lang: lang
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
        return audioUrl;
      } else {
        throw new Error('Failed to get audio');
      }
    } catch (error) {
      console.error('Error getting audio:', error);
      if (this.onError) this.onError(error);
      return null;
    }
  }

  // Toggle voice output on/off
  toggleVoiceOutput() {
    this.isVoiceOutputEnabled = !this.isVoiceOutputEnabled;
    return this.isVoiceOutputEnabled;
  }

  // Set room ID
  setRoomId(roomId) {
    this.roomId = roomId;
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Basic Usage
const voiceChat = new VoiceChat('http://localhost:3006');

// Set up callbacks
voiceChat.onTranscript = (text) => {
  console.log('Heard:', text);
  // Update your UI with the transcribed text
};

voiceChat.onMessage = (message) => {
  console.log('Bot:', message);
  // Display bot message in your UI
};

voiceChat.onListeningStart = () => {
  console.log('🎤 Listening...');
  // Update UI to show listening state
};

voiceChat.onListeningEnd = () => {
  console.log('Stopped listening');
  // Update UI to show stopped state
};

voiceChat.onAudioPlay = () => {
  console.log('🔊 Playing audio...');
};

voiceChat.onError = (error) => {
  console.error('Error:', error);
  // Show error in UI
};

// Example 2: React Hook
/*
import { useState, useEffect, useRef } from 'react';

function useVoiceChat(apiBaseUrl = 'http://localhost:3006') {
  const [isListening, setIsListening] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const voiceChatRef = useRef(null);

  useEffect(() => {
    voiceChatRef.current = new VoiceChat(apiBaseUrl);
    
    voiceChatRef.current.onListeningStart = () => setIsListening(true);
    voiceChatRef.current.onListeningEnd = () => setIsListening(false);
    
    return () => {
      // Cleanup if needed
    };
  }, [apiBaseUrl]);

  const toggleVoiceInput = () => {
    voiceChatRef.current?.toggleVoiceInput();
  };

  const sendMessage = (message) => {
    return voiceChatRef.current?.sendMessage(message);
  };

  const toggleVoiceOutput = () => {
    const enabled = voiceChatRef.current?.toggleVoiceOutput();
    setIsVoiceOutputEnabled(enabled);
  };

  return {
    isListening,
    isVoiceOutputEnabled,
    toggleVoiceInput,
    sendMessage,
    toggleVoiceOutput
  };
}

// Use in component
function MyComponent() {
  const { isListening, toggleVoiceInput, sendMessage } = useVoiceChat();
  
  return (
    <button onClick={toggleVoiceInput}>
      {isListening ? '🛑 Stop' : '🎤 Start Voice'}
    </button>
  );
}
*/

// Example 3: Vue.js Composition API
/*
import { ref, onMounted } from 'vue';

export function useVoiceChat(apiBaseUrl = 'http://localhost:3006') {
  const isListening = ref(false);
  const isVoiceOutputEnabled = ref(true);
  let voiceChat = null;

  onMounted(() => {
    voiceChat = new VoiceChat(apiBaseUrl);
    voiceChat.onListeningStart = () => isListening.value = true;
    voiceChat.onListeningEnd = () => isListening.value = false;
  });

  const toggleVoiceInput = () => {
    voiceChat?.toggleVoiceInput();
  };

  const sendMessage = (message) => {
    return voiceChat?.sendMessage(message);
  };

  const toggleVoiceOutput = () => {
    isVoiceOutputEnabled.value = voiceChat?.toggleVoiceOutput();
  };

  return {
    isListening,
    isVoiceOutputEnabled,
    toggleVoiceInput,
    sendMessage,
    toggleVoiceOutput
  };
}
*/

// Example 4: Simple HTML Integration
/*
<!DOCTYPE html>
<html>
<head>
  <title>Voice Chat</title>
</head>
<body>
  <input type="text" id="messageInput" placeholder="Type or use voice...">
  <button id="micButton">🎤 Start Voice</button>
  <button id="sendButton">Send</button>
  <button id="voiceToggle">🔊 Voice ON</button>
  <div id="messages"></div>

  <script src="voice-frontend-code.js"></script>
  <script>
    const voiceChat = new VoiceChat('http://localhost:3006');
    const messageInput = document.getElementById('messageInput');
    const micButton = document.getElementById('micButton');
    const sendButton = document.getElementById('sendButton');
    const voiceToggle = document.getElementById('voiceToggle');
    const messagesDiv = document.getElementById('messages');

    voiceChat.onTranscript = (text) => {
      messageInput.value = text;
    };

    voiceChat.onMessage = (message) => {
      const div = document.createElement('div');
      div.textContent = 'Bot: ' + message;
      messagesDiv.appendChild(div);
    };

    voiceChat.onListeningStart = () => {
      micButton.textContent = '🛑 Stop';
    };

    voiceChat.onListeningEnd = () => {
      micButton.textContent = '🎤 Start Voice';
    };

    micButton.addEventListener('click', () => {
      voiceChat.toggleVoiceInput();
    });

    sendButton.addEventListener('click', () => {
      const message = messageInput.value;
      if (message) {
        voiceChat.sendMessage(message);
        messageInput.value = '';
      }
    });

    voiceToggle.addEventListener('click', () => {
      const enabled = voiceChat.toggleVoiceOutput();
      voiceToggle.textContent = enabled ? '🔊 Voice ON' : '🔇 Voice OFF';
    });
  </script>
</body>
</html>
*/

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceChat;
}

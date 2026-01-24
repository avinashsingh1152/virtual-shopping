# Voice Implementation Guide

This guide explains how voice functionality works and how to implement it in a new frontend using the same backend.

---

## Overview

### Voice Input (Speech-to-Text)
- **Location**: **Frontend Only** (Browser API)
- **Technology**: Browser's `SpeechRecognition` API (Web Speech API)
- **Backend**: Not required for voice input

### Voice Output (Text-to-Speech)
- **Location**: **Both Frontend and Backend**
- **Backend TTS**: Preferred (better quality, consistent)
- **Frontend Fallback**: Browser's `speechSynthesis` API
- **Backend Endpoints**: 
  - `/api/bot/chat` with `includeAudio: true` (returns base64 audio)
  - `/api/bot/audio` (generates audio from text)

---

## Backend API Contracts

### 1. Chat with Audio Response

**Endpoint:** `POST /api/bot/chat`

**Request:**
```json
{
  "message": "I'm looking for a smartphone",
  "roomId": "room-123",
  "includeAudio": true  // Set to true to get audio response
}
```

**Response:**
```json
{
  "success": true,
  "message": "I found several smartphones for you...",
  "roomId": "room-123",
  "audio": "base64-encoded-audio-string",  // Present if includeAudio=true
  "audioFormat": "mp3"
}
```

### 2. Generate Audio from Text

**Endpoint:** `POST /api/bot/audio`

**Request:**
```json
{
  "text": "Hello, how can I help you?",
  "lang": "en"  // Optional, default: "en"
}
```

**Response:**
- **Content-Type:** `audio/mpeg`
- **Body:** Binary MP3 audio file

---

## Frontend Implementation

### Option 1: Full Voice Implementation (Recommended)

This uses browser APIs for input and backend TTS for output.

#### Voice Input (Speech-to-Text)

```javascript
// Initialize Speech Recognition
let recognition = null;

function initVoiceRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Listening...');
      // Update UI to show listening state
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Heard:', transcript);
      // Use transcript as user message
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      console.log('Stopped listening');
    };
  } else {
    console.warn('Speech recognition not supported');
  }
}

// Start listening
function startListening() {
  if (recognition) {
    recognition.start();
  }
}

// Stop listening
function stopListening() {
  if (recognition) {
    recognition.stop();
  }
}
```

#### Voice Output (Text-to-Speech) - Using Backend

```javascript
// Send message and get audio response
async function sendMessageWithAudio(message, roomId) {
  try {
    const response = await fetch('http://localhost:3006/api/bot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        roomId: roomId,
        includeAudio: true  // Request audio response
      })
    });

    const data = await response.json();

    if (data.success && data.audio) {
      // Play the audio
      playAudioFromBase64(data.audio);
    }

    return data.message;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Play base64 audio
function playAudioFromBase64(base64Audio) {
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
    console.log('Playing audio...');
  };
  
  audio.onended = () => {
    URL.revokeObjectURL(audioUrl); // Clean up
  };
  
  audio.play();
}
```

#### Alternative: Get Audio Separately

```javascript
// Get audio for any text
async function getAudioForText(text) {
  try {
    const response = await fetch('http://localhost:3006/api/bot/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        lang: 'en'
      })
    });

    if (response.ok) {
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.play();
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  } catch (error) {
    console.error('Error getting audio:', error);
  }
}
```

### Option 2: Frontend-Only TTS (Fallback)

If backend TTS fails, use browser's built-in TTS:

```javascript
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech not supported');
    return;
  }

  // Stop any ongoing speech
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  // Clean text (remove emojis)
  const cleanText = text.replace(/[🎤👋🛍️🤖⭐]/g, '').trim();
  
  if (cleanText) {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('Speaking...');
    };

    utterance.onend = () => {
      console.log('Finished speaking');
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };

    window.speechSynthesis.speak(utterance);
  }
}
```

---

## Complete Frontend Example

Here's a complete example for a React/Next.js component:

```javascript
import { useState, useEffect, useRef } from 'react';

const VoiceChat = ({ apiBaseUrl = 'http://localhost:3006' }) => {
  const [isListening, setIsListening] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const [roomId, setRoomId] = useState('room-123');
  const recognitionRef = useRef(null);

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
        // Auto-send after voice input
        setTimeout(() => sendMessage(transcript), 500);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  // Play audio from base64
  const playAudioFromBase64 = (base64Audio) => {
    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
    
    audio.play();
  };

  // Send message with audio
  const sendMessage = async (text) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text || message,
          roomId: roomId,
          includeAudio: isVoiceOutputEnabled
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('Bot response:', data.message);
        
        // Play audio if available
        if (data.audio && isVoiceOutputEnabled) {
          playAudioFromBase64(data.audio);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type or use voice..."
      />
      
      <button onClick={toggleVoiceInput}>
        {isListening ? '🛑 Stop' : '🎤 Start Voice'}
      </button>
      
      <button onClick={() => sendMessage()}>
        Send
      </button>
      
      <button onClick={() => setIsVoiceOutputEnabled(!isVoiceOutputEnabled)}>
        {isVoiceOutputEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
      </button>
    </div>
  );
};

export default VoiceChat;
```

---

## Vue.js Example

```vue
<template>
  <div>
    <input v-model="message" placeholder="Type or use voice..." />
    <button @click="toggleVoiceInput">
      {{ isListening ? '🛑 Stop' : '🎤 Start Voice' }}
    </button>
    <button @click="sendMessage">Send</button>
    <button @click="toggleVoiceOutput">
      {{ isVoiceOutputEnabled ? '🔊 Voice ON' : '🔇 Voice OFF' }}
    </button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: '',
      roomId: 'room-123',
      isListening: false,
      isVoiceOutputEnabled: true,
      recognition: null,
      apiBaseUrl: 'http://localhost:3006'
    };
  },
  mounted() {
    this.initVoiceRecognition();
  },
  methods: {
    initVoiceRecognition() {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
        };

        this.recognition.onresult = (event) => {
          this.message = event.results[0][0].transcript;
          this.isListening = false;
          setTimeout(() => this.sendMessage(), 500);
        };

        this.recognition.onerror = () => {
          this.isListening = false;
        };

        this.recognition.onend = () => {
          this.isListening = false;
        };
      }
    },
    toggleVoiceInput() {
      if (!this.recognition) {
        alert('Voice input not supported');
        return;
      }
      if (this.isListening) {
        this.recognition.stop();
      } else {
        this.recognition.start();
      }
    },
    async sendMessage() {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/bot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: this.message,
            roomId: this.roomId,
            includeAudio: this.isVoiceOutputEnabled
          })
        });

        const data = await response.json();
        if (data.success && data.audio && this.isVoiceOutputEnabled) {
          this.playAudio(data.audio);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    },
    playAudio(base64Audio) {
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.play();
    },
    toggleVoiceOutput() {
      this.isVoiceOutputEnabled = !this.isVoiceOutputEnabled;
    }
  }
};
</script>
```

---

## Vanilla JavaScript Example

```javascript
// Complete standalone implementation
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

  initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onListeningStart?.();
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.onTranscript?.(transcript);
        this.isListening = false;
        setTimeout(() => this.sendMessage(transcript), 500);
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        this.onError?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onListeningEnd?.();
      };
    }
  }

  toggleVoiceInput() {
    if (!this.recognition) {
      console.warn('Voice input not supported');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

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
        this.onMessage?.(data.message);
        
        if (data.audio && this.isVoiceOutputEnabled) {
          this.playAudio(data.audio);
        }
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      this.onError?.(error);
    }
  }

  playAudio(base64Audio) {
    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    audio.onplay = () => this.onAudioPlay?.();
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      this.onAudioEnd?.();
    };
    audio.onerror = (error) => {
      console.error('Audio playback error:', error);
      this.onError?.(error);
    };
    
    audio.play();
  }

  toggleVoiceOutput() {
    this.isVoiceOutputEnabled = !this.isVoiceOutputEnabled;
  }
}

// Usage
const voiceChat = new VoiceChat('http://localhost:3006');

voiceChat.onTranscript = (text) => {
  console.log('Heard:', text);
};

voiceChat.onMessage = (message) => {
  console.log('Bot:', message);
};

// Start voice input
document.getElementById('micButton').addEventListener('click', () => {
  voiceChat.toggleVoiceInput();
});
```

---

## Key Points

### Backend Changes Required
- **None!** The backend already supports voice via:
  - `POST /api/bot/chat` with `includeAudio: true`
  - `POST /api/bot/audio`

### Frontend Changes Required
1. **Voice Input**: Implement browser's `SpeechRecognition` API
2. **Voice Output**: Use backend audio or browser's `speechSynthesis` API
3. **API Integration**: Call backend endpoints with `includeAudio: true`

### Browser Support
- **Voice Input**: Chrome, Edge, Safari (WebKit)
- **Voice Output (Browser)**: All modern browsers
- **Voice Output (Backend)**: All browsers (uses standard audio playback)

### Environment Variables
No additional environment variables needed. The backend TTS service is already configured.

---

## Testing

### Test Voice Input
```javascript
// Test if browser supports voice input
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  console.log('✅ Voice input supported');
} else {
  console.log('❌ Voice input not supported');
}
```

### Test Voice Output (Backend)
```bash
# Test audio generation
curl -X POST http://localhost:3006/api/bot/audio \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test", "lang": "en"}' \
  --output test.mp3
```

### Test Chat with Audio
```bash
curl -X POST http://localhost:3006/api/bot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "roomId": "test-room",
    "includeAudio": true
  }'
```

---

## Summary

- **Voice Input**: Frontend only (browser API)
- **Voice Output**: Backend preferred, frontend fallback available
- **Backend**: Already supports voice, no changes needed
- **New Frontend**: Just implement the code examples above
- **API Endpoints**: Use existing `/api/bot/chat` and `/api/bot/audio`

The backend is **completely ready** for voice functionality. You just need to implement the frontend voice features in your new project using the examples above.

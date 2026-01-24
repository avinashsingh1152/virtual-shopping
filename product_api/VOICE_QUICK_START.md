# Voice Feature - Quick Start Guide

## ✅ Backend Status: **READY - NO CHANGES NEEDED**

The backend already supports voice functionality. No code changes required!

### Backend Endpoints Available:
1. `POST /api/bot/chat` - Chat with optional audio response
   - Request: `{ message, roomId, includeAudio: true }`
   - Response: `{ success, message, audio (base64), audioFormat }`

2. `POST /api/bot/audio` - Generate audio from text
   - Request: `{ text, lang }`
   - Response: Binary MP3 audio file

---

## 🎯 Frontend: Copy-Paste Ready Code

### Option 1: Use the Complete Class (Recommended)

**File:** `voice-frontend-code.js` (already created)

Just copy this file to your frontend project and use it:

```javascript
// Import or include voice-frontend-code.js
const voiceChat = new VoiceChat('http://localhost:3006');

// Set callbacks
voiceChat.onMessage = (message) => {
  console.log('Bot:', message);
};

// Start voice input
voiceChat.toggleVoiceInput();

// Send text message
voiceChat.sendMessage('Hello');
```

### Option 2: Minimal Implementation

```javascript
// 1. Voice Input (Speech-to-Text)
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.onresult = (event) => {
  const text = event.results[0][0].transcript;
  sendMessage(text); // Send to backend
};
recognition.start(); // Start listening

// 2. Send Message with Audio
async function sendMessage(text) {
  const response = await fetch('http://localhost:3006/api/bot/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      roomId: 'room-123',
      includeAudio: true  // Get audio response
    })
  });
  
  const data = await response.json();
  
  // 3. Play Audio Response
  if (data.audio) {
    const audio = new Audio('data:audio/mpeg;base64,' + data.audio);
    audio.play();
  }
}
```

---

## 📋 Checklist for New Frontend

- [ ] Copy `voice-frontend-code.js` to your project
- [ ] Update API base URL if different
- [ ] Add voice input button (calls `toggleVoiceInput()`)
- [ ] Add voice output toggle (calls `toggleVoiceOutput()`)
- [ ] Display bot messages (use `onMessage` callback)
- [ ] Handle errors (use `onError` callback)

---

## 🔧 Backend Configuration

**No configuration needed!** The backend TTS service is already set up.

If you want to check TTS service:
- File: `src/tts-service.js`
- Uses: `gtts` (Google Text-to-Speech) package
- Already installed and working

---

## 🚀 Quick Test

### Test Backend (Terminal):
```bash
# Test audio generation
curl -X POST http://localhost:3006/api/bot/audio \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "lang": "en"}' \
  --output test.mp3

# Test chat with audio
curl -X POST http://localhost:3006/api/bot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "roomId": "test", "includeAudio": true}'
```

### Test Frontend (Browser Console):
```javascript
// Test if voice is supported
if ('webkitSpeechRecognition' in window) {
  console.log('✅ Voice input supported');
}

// Test backend connection
fetch('http://localhost:3006/api/bot/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'test',
    roomId: 'test',
    includeAudio: true
  })
}).then(r => r.json()).then(console.log);
```

---

## 📝 Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| **Backend** | ✅ Ready | None - Already supports voice |
| **Backend TTS** | ✅ Working | None - Already configured |
| **Frontend Voice Input** | ❌ Not Implemented | Copy `voice-frontend-code.js` |
| **Frontend Voice Output** | ❌ Not Implemented | Use backend audio or browser TTS |

---

## 💡 Key Points

1. **Backend is ready** - No changes needed
2. **Frontend needs implementation** - Use provided code
3. **Voice Input** = Browser API (frontend only)
4. **Voice Output** = Backend TTS (preferred) or Browser API (fallback)
5. **Same backend works with any frontend** - Just use the API endpoints

---

**Files Created:**
- `VOICE_IMPLEMENTATION_GUIDE.md` - Detailed guide with examples
- `voice-frontend-code.js` - Copy-paste ready code
- `VOICE_QUICK_START.md` - This file

**Next Steps:**
1. Copy `voice-frontend-code.js` to your new frontend project
2. Follow the usage examples in the file
3. Test with your backend URL

import React, { useState, useEffect, useRef } from 'react'
import { voiceBotService } from '../services/voiceBotService'
import { getTVScreenState } from './TVScreen'

export default function NPCInteractionButton() {
  const [isVisible, setIsVisible] = useState(true)
  const [showChatHistory, setShowChatHistory] = useState(false) // Chat history collapsed by default
  const [isListening, setIsListening] = useState(false)
  const [roomId, setRoomId] = useState(null)
  const recognitionRef = useRef(null)
  const [transcribedText, setTranscribedText] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef(null)

  // Initialize voice bot service
  useEffect(() => {
    const initializeBot = async () => {
      const tvState = getTVScreenState()
      const currentRoomId = tvState.roomId || 'room-abc123'
      
      if (currentRoomId) {
        setRoomId(currentRoomId)
        try {
          await voiceBotService.connect(currentRoomId)
          console.log('Voice Bot service connected')
        } catch (error) {
          console.error('Failed to connect Voice Bot:', error)
        }
      }
    }

    initializeBot()

    // Set up response handler to show response and play audio
    voiceBotService.setOnResponse(async (data) => {
      if (data && data.text) {
        // Add response to conversation history
        setConversationHistory(prev => [...prev, {
          type: 'response',
          text: data.text,
          timestamp: Date.now()
        }])
        
        // Play audio response from backend
        if (data.audio) {
          setIsSpeaking(true)
          try {
            const audioElement = await voiceBotService.playAudio(data.audio, data.audioFormat || 'mp3')
            if (audioElement) {
              // Update speaking state when audio ends
              audioElement.addEventListener('ended', () => {
                setIsSpeaking(false)
              })
              // Also handle errors
              audioElement.addEventListener('error', () => {
                setIsSpeaking(false)
              })
            }
          } catch (error) {
            console.error('Error playing audio:', error)
            setIsSpeaking(false)
          }
        } else {
          // Fallback: no audio received
          console.warn('No audio in response, text only')
        }
      }
    })

    // Set up audio ended callback
    voiceBotService.setOnAudioEnded(() => {
      setIsSpeaking(false)
    })

    // Set up error handler
    voiceBotService.setOnError((error) => {
      console.error('Voice Bot error:', error)
      setConversationHistory(prev => [...prev, {
        type: 'error',
        text: `Error: ${error.message || 'Failed to get response'}`,
        timestamp: Date.now()
      }])
    })

    // Update room ID periodically
    const interval = setInterval(() => {
      const tvState = getTVScreenState()
      const currentRoomId = tvState.roomId || 'room-abc123'
      if (currentRoomId !== roomId) {
        setRoomId(currentRoomId)
        if (currentRoomId && !voiceBotService.getIsConnected()) {
          voiceBotService.connect(currentRoomId).catch(console.error)
        }
      }
    }, 2000)

    return () => {
      clearInterval(interval)
      voiceBotService.disconnect()
    }
  }, [roomId])

  const handleVoiceInput = () => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setIsListening(false)
      return
    }

    // Start speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setTranscribedText('Listening...')
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setTranscribedText(transcript)
      
      // Add user message to conversation history
      if (transcript.trim()) {
        const userMessage = transcript.trim()
        setConversationHistory(prev => [...prev, {
          type: 'user',
          text: userMessage,
          timestamp: Date.now()
        }])
        // Send transcribed text to voice bot (will get voice response)
        voiceBotService.sendMessage(userMessage).catch(error => {
          console.error('Error sending message:', error)
        })
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      setTranscribedText('')
      
      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.')
      } else if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setTimeout(() => setTranscribedText(''), 2000)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  // Minimal collapsed view
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          backgroundColor: 'rgba(79, 172, 254, 0.8)',
          color: 'white',
          border: '2px solid #4facfe',
          borderRadius: '8px',
          padding: '12px 20px',
          cursor: 'pointer',
          zIndex: 1000,
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        👤 Talk to Sales Person
        {conversationHistory.length > 0 && (
          <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
            ({conversationHistory.length})
          </span>
        )}
      </button>
    )
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationHistory, transcribedText])

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: showChatHistory ? '15px' : '10px',
      borderRadius: '10px',
      color: 'white',
      zIndex: 1000,
      width: showChatHistory ? '350px' : 'auto',
      maxHeight: showChatHistory ? '70vh' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      border: '2px solid #4facfe',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: showChatHistory ? '10px' : '0',
        borderBottom: showChatHistory ? '1px solid #444' : 'none',
        paddingBottom: showChatHistory ? '8px' : '0',
        flexShrink: 0
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          👤 Sales Person
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {conversationHistory.length > 0 && (
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              style={{
                background: 'transparent',
                border: '1px solid #4facfe',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '5px',
                marginRight: '5px',
              }}
              title={showChatHistory ? 'Hide chat history' : 'Show chat history'}
            >
              💬 {conversationHistory.length}
            </button>
          )}
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 5px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Scrollable conversation area - only shown when expanded */}
      {showChatHistory && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          maxHeight: 'calc(70vh - 200px)',
          paddingRight: '5px',
          marginBottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {conversationHistory.map((message, index) => (
            <div
              key={index}
              style={{
                padding: '10px',
                borderRadius: '5px',
                backgroundColor: message.type === 'user' 
                  ? 'rgba(79, 172, 254, 0.2)' 
                  : isSpeaking && index === conversationHistory.length - 1
                    ? 'rgba(76, 175, 80, 0.3)'
                    : 'rgba(76, 175, 80, 0.2)',
                border: `1px solid ${message.type === 'user' ? '#4facfe' : '#4CAF50'}`,
                fontSize: '13px',
                wordWrap: 'break-word',
                alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
              }}
            >
              <strong>
                {message.type === 'user' 
                  ? 'You:' 
                  : isSpeaking && index === conversationHistory.length - 1
                    ? '🔊 Speaking:'
                    : 'Sales Person:'}
              </strong>
              <div style={{ marginTop: '5px' }}>{message.text}</div>
            </div>
          ))}
          
          {transcribedText && transcribedText !== 'Listening...' && !conversationHistory.some(m => m.type === 'user' && m.text === transcribedText) && (
            <div style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: 'rgba(79, 172, 254, 0.2)',
              border: '1px solid #4facfe',
              fontSize: '13px',
              alignSelf: 'flex-end',
              maxWidth: '90%',
            }}>
              <strong>You said:</strong> {transcribedText}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Fixed controls at bottom */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px',
        flexShrink: 0,
        borderTop: showChatHistory ? '1px solid #444' : 'none',
        paddingTop: showChatHistory ? '10px' : '0'
      }}>
        <button
          onClick={handleVoiceInput}
          style={{
            padding: '15px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: isListening ? '#ff4444' : '#00f2fe',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.3s',
          }}
        >
          {isListening ? '🛑 Stop Listening' : '🎤 Start Voice Input'}
        </button>
        
        {!showChatHistory && (
          <div style={{ 
            fontSize: '11px', 
            opacity: 0.7, 
            textAlign: 'center'
          }}>
            {voiceBotService.getIsConnected() ? '✅ Connected' : '⏳ Connecting...'}
          </div>
        )}
      </div>
    </div>
  )
}

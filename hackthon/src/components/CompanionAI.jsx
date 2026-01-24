import React, { useEffect, useRef, useState } from 'react'
import { aiAgentService } from '../services/aiAgentService'
import { getTVScreenState } from './TVScreen'

/**
 * CompanionAI - Handles AI agent interaction for the NPC companion
 * Listens for user speech when audio is enabled and responds via voice
 */
export default function CompanionAI() {
  const [isListening, setIsListening] = useState(false)
  const [roomId, setRoomId] = useState(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const microphoneRef = useRef(null)
  const dataArrayRef = useRef(null)
  const lastAudioTimeRef = useRef(0)
  const silenceTimeoutRef = useRef(null)
  const isProcessingRef = useRef(false)

  // Initialize AI agent connection
  useEffect(() => {
    const initializeAI = async () => {
      // Get room ID from TV screen state
      const tvState = getTVScreenState()
      const currentRoomId = tvState.roomId || 'room-abc123' // Default room ID
      
      if (currentRoomId) {
        setRoomId(currentRoomId)
        try {
          await aiAgentService.connect(currentRoomId)
          console.log('AI Agent connected for companion')
        } catch (error) {
          console.error('Failed to connect AI Agent:', error)
        }
      }
    }

    initializeAI()

    // Set up response handler
    aiAgentService.setOnResponse((data) => {
      console.log('AI Response received:', data)
      // Response will be automatically spoken by aiAgentService
    })

    return () => {
      aiAgentService.disconnect()
    }
  }, [])

  // Monitor audio state and detect speech
  useEffect(() => {
    const checkAudioState = () => {
      const tvState = getTVScreenState()
      const audioEnabled = tvState.audioEnabled || false
      const currentRoomId = tvState.roomId || 'room-abc123'

      // Update room ID if changed
      if (currentRoomId !== roomId) {
        setRoomId(currentRoomId)
        if (currentRoomId && !aiAgentService.getIsConnected()) {
          aiAgentService.connect(currentRoomId).catch(console.error)
        }
      }

      if (audioEnabled && !isListening) {
        startListening()
      } else if (!audioEnabled && isListening) {
        stopListening()
      }
    }

    const interval = setInterval(checkAudioState, 500) // Check every 500ms
    checkAudioState() // Initial check

    return () => {
      clearInterval(interval)
      stopListening()
    }
  }, [isListening, roomId])

  const startListening = async () => {
    if (isListening || isProcessingRef.current) return

    try {
      // Get user's microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      microphoneRef.current = stream

      // Create audio context for analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      // Create analyser to detect audio levels
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      source.connect(analyserRef.current)

      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)

      setIsListening(true)
      detectSpeech()
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopListening = () => {
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop())
      microphoneRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    dataArrayRef.current = null
    setIsListening(false)
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
  }

  const detectSpeech = () => {
    if (!analyserRef.current || !dataArrayRef.current || !isListening) return

    analyserRef.current.getByteFrequencyData(dataArrayRef.current)
    
    // Calculate average volume
    const sum = dataArrayRef.current.reduce((a, b) => a + b, 0)
    const average = sum / dataArrayRef.current.length
    const threshold = 30 // Adjust based on testing

    // Detect if user is speaking (volume above threshold)
    if (average > threshold) {
      lastAudioTimeRef.current = Date.now()
      
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }

      // Set timeout to detect end of speech (1.5 seconds of silence)
      silenceTimeoutRef.current = setTimeout(() => {
        if (Date.now() - lastAudioTimeRef.current > 1500 && !isProcessingRef.current) {
          processSpeech()
        }
      }, 1500)
    }

    // Continue monitoring
    if (isListening) {
      requestAnimationFrame(detectSpeech)
    }
  }

  const processSpeech = async () => {
    if (isProcessingRef.current || !roomId) return

    isProcessingRef.current = true
    console.log('Processing speech - sending to AI agent')

    try {
      // For now, send a generic message
      // In a full implementation, you would:
      // 1. Record audio chunks
      // 2. Send to speech-to-text service
      // 3. Send transcribed text to AI agent
      
      // Simplified: Send a message indicating user spoke
      // You can enhance this with actual speech-to-text
      const userMessage = "User is speaking. Please respond as a helpful shopping assistant in the virtual mall."
      
      aiAgentService.askAI(userMessage)
    } catch (error) {
      console.error('Error processing speech:', error)
    } finally {
      // Reset after a delay to allow response
      setTimeout(() => {
        isProcessingRef.current = false
      }, 3000)
    }
  }

  // This component doesn't render anything - it's a background service
  return null
}

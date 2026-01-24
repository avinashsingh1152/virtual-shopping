import React, { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRoomStore } from '../stores/roomStore'
import { webrtcService } from '../services/webrtc'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

/**
 * Room Component - Displays video feeds in the virtual world
 */
export default function Room({ position, rotation }) {
  const { 
    currentRoom, 
    isInRoom, 
    roomCreatorId,
    creatorStream, // Stream from room creator (received via WebRTC)
    currentUserId,
    localStream,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo
  } = useRoomStore()
  
  const videoTextureRef = useRef(null)
  const videoElementRef = useRef(null)
  const [videoTexture, setVideoTexture] = useState(null)
  const meshRef = useRef()
  
  const { participants } = useRoomStore()
  
  // Update texture every frame
  useFrame(() => {
    if (videoTextureRef.current && videoElementRef.current) {
      const video = videoElementRef.current
      if (video.readyState >= 2 && videoTextureRef.current) {
        videoTextureRef.current.needsUpdate = true
      }
    }
  })
  
  // Show other participants' video (not your own)
  // Priority: 1) Other participants' streams, 2) Creator's stream, 3) Your own stream (if no others)
  const isCreator = currentUserId && roomCreatorId && currentUserId === roomCreatorId
  
  // Get first available participant stream (excluding self) - prioritize streams with active video
  const otherParticipantStream = participants
    .filter(p => p.id !== currentUserId && p.stream)
    .map(p => p.stream)
    .find(stream => {
      if (!stream) return false
      const videoTracks = stream.getVideoTracks()
      // Show stream if it has video tracks (even if disabled, they might enable it)
      return videoTracks.length > 0
    })
  
  // Determine which stream to display - prioritize other participants' live feeds from socket
  let displayStream = null
  if (otherParticipantStream) {
    // Show other participant's video from socket connection
    displayStream = otherParticipantStream
  } else if (creatorStream && !isCreator) {
    // Show creator's stream from socket connection
    displayStream = creatorStream
  } else if (localStream) {
    // Show your own stream as fallback
    const videoTracks = localStream.getVideoTracks()
    if (videoTracks.length > 0) {
      displayStream = localStream
    }
  }
  
  // Create video texture from stream (live video only, no photo)
  useEffect(() => {
    let texture = null
    let video = null
    let interval = null
    
    // Cleanup previous texture
    const cleanup = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      if (texture) {
        texture.dispose()
        texture = null
      }
      if (video) {
        video.pause()
        video.srcObject = null
        if (video.parentNode) {
          video.parentNode.removeChild(video)
        }
        video = null
      }
      if (videoTextureRef.current) {
        videoTextureRef.current = null
      }
      setVideoTexture(null)
    }
    
    // Cleanup previous
    cleanup()
    
    if (displayStream) {
      // Check if stream has video tracks
      const videoTracks = displayStream.getVideoTracks()
      if (videoTracks.length === 0) {
        return // No video tracks at all
      }
      
      // Show stream even if tracks are disabled - they might enable it
      // The video will appear when tracks are enabled
      video = document.createElement('video')
      video.srcObject = displayStream
      video.autoplay = true
      video.playsInline = true
      video.muted = true // Always mute to avoid feedback
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.style.display = 'none' // Hide but keep in DOM
      video.style.position = 'absolute'
      video.style.width = '1px'
      video.style.height = '1px'
      video.style.opacity = '0'
      video.style.pointerEvents = 'none'
      video.style.top = '0'
      video.style.left = '0'
      
      // Add to DOM so it can play
      document.body.appendChild(video)
      
      // Handle video loaded
      video.onloadedmetadata = () => {
        if (texture) {
          texture.needsUpdate = true
        }
      }
      
      video.oncanplay = () => {
        if (texture) {
          texture.needsUpdate = true
        }
      }
      
      video.onplaying = () => {
        if (texture) {
          texture.needsUpdate = true
        }
      }
      
      // Store video element reference
      videoElementRef.current = video
      
      // Create texture immediately
      texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBAFormat
      texture.needsUpdate = true
      
      // Store texture reference
      videoTextureRef.current = texture
      setVideoTexture(texture)
      
      // Try to play video immediately
      const playVideo = async () => {
        try {
          if (video.paused) {
            await video.play()
          }
          texture.needsUpdate = true
        } catch (error) {
          // Try again after a short delay
          setTimeout(async () => {
            if (video && video.paused) {
              try {
                await video.play()
                if (texture) texture.needsUpdate = true
              } catch (err) {
                // Silent fail on retry
              }
            }
          }, 500)
        }
      }
      
      // Set up event handlers
      video.onloadedmetadata = () => {
        texture.needsUpdate = true
        playVideo()
      }
      
      video.oncanplay = () => {
        texture.needsUpdate = true
        playVideo()
      }
      
      video.onplaying = () => {
        texture.needsUpdate = true
      }
      
      // Try to play immediately if ready
      if (video.readyState >= 2) {
        playVideo()
      }
      
      // Also try after a delay
      setTimeout(playVideo, 200)
      
      return cleanup
    } else {
      cleanup()
    }
    
    return cleanup
  }, [displayStream])
  
  if (!isInRoom || !currentRoom) return null
  
  return (
    <group position={position} rotation={rotation}>
      {/* Main video display screen - Shows LIVE video from socket connections */}
      {/* Positioned well in front so it's clearly visible */}
      <mesh 
        ref={meshRef}
        position={[0, 2, 2]} 
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'default'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'default'
        }}
      >
        <planeGeometry args={[10, 7.5]} />
        <meshStandardMaterial 
          map={videoTexture || null}
          color={videoTexture ? '#ffffff' : '#1a1a1a'}
          emissive={videoTexture ? '#000000' : '#1a1a1a'}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Loading/No video indicator */}
      {!videoTexture && (
        <mesh position={[0, 2, 2.01]}>
          <planeGeometry args={[10, 7.5]} />
          <meshStandardMaterial 
            color="#1a1a1a" 
            transparent 
            opacity={0.9}
          />
        </mesh>
      )}
      
      {/* "Live" indicator */}
      {videoTexture && (
        <mesh position={[-4.5, 5.2, 2.02]}>
          <planeGeometry args={[2, 0.6]} />
          <meshStandardMaterial 
            color="#ff0000" 
            emissive="#ff0000"
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      
      {/* Screen frame - positioned behind video */}
      <mesh position={[0, 2, 1.99]} castShadow>
        <boxGeometry args={[10.2, 7.7, 0.1]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
      
      {/* Control panel - positioned in front */}
      <mesh position={[0, 0.5, 2.1]}>
        <boxGeometry args={[8, 1.2, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Audio toggle indicator */}
      <mesh position={[-2.5, 0.5, 2.2]}>
        <boxGeometry args={[1.2, 1, 0.1]} />
        <meshStandardMaterial 
          color={audioEnabled ? '#00ff00' : '#ff0000'} 
          emissive={audioEnabled ? '#00ff00' : '#ff0000'}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Video toggle indicator */}
      <mesh position={[2.5, 0.5, 2.2]}>
        <boxGeometry args={[1.2, 1, 0.1]} />
        <meshStandardMaterial 
          color={videoEnabled ? '#00ff00' : '#ff0000'} 
          emissive={videoEnabled ? '#00ff00' : '#ff0000'}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Room info */}
      <mesh position={[0, -0.8, 2.1]}>
        <planeGeometry args={[7, 0.8]} />
        <meshStandardMaterial color="#4a90e2" transparent opacity={0.8} />
      </mesh>
      
      {/* Status text - show when video is disabled or loading */}
      {!videoTexture && (
        <>
          <mesh position={[0, 2, 2.02]}>
            <planeGeometry args={[9, 1.5]} />
            <meshStandardMaterial 
              color="#333333" 
              transparent 
              opacity={0.9}
            />
          </mesh>
          <mesh position={[0, 1.5, 2.03]}>
            <planeGeometry args={[8, 0.8]} />
            <meshStandardMaterial 
              color="#4a90e2" 
              transparent 
              opacity={0.9}
            />
          </mesh>
        </>
      )}
      
      {/* Participant count */}
      <mesh position={[4, 5.2, 2.02]}>
        <planeGeometry args={[2, 0.6]} />
        <meshStandardMaterial 
          color="#4a90e2" 
          transparent 
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}

/**
 * Room UI Controls Component (2D overlay)
 */
export function RoomControls() {
  const { 
    isInRoom, 
    currentRoom, 
    participants,
    audioEnabled, 
    videoEnabled,
    toggleAudio,
    toggleVideo,
    leaveRoom
  } = useRoomStore()
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isInRoom) return
    
    const handleKeyPress = (e) => {
      // Press 'O' to toggle audio (lowercase only)
      if (e.key.toLowerCase() === 'o' && e.key === 'o' && e.target === document.body) {
        e.preventDefault()
        toggleAudio()
      }
      // Press 'P' to toggle video (lowercase only)
      if (e.key.toLowerCase() === 'p' && e.key === 'p' && e.target === document.body) {
        e.preventDefault()
        if (!videoEnabled) {
          // Ask for permission when enabling
          const confirmed = window.confirm('Enable video? This will request camera access.')
          if (!confirmed) return
        }
        toggleVideo()
      }
      // Press 'Escape' to leave room
      if (e.key === 'Escape' && e.target === document.body) {
        e.preventDefault()
        leaveRoom()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isInRoom, toggleAudio, toggleVideo, leaveRoom, videoEnabled])
  
  if (!isInRoom) return null
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '10px',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '15px 20px',
      borderRadius: '10px',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ color: 'white', marginRight: '10px', alignSelf: 'center' }}>
        Room: {currentRoom?.roomId} | Category: {currentRoom?.category} | Participants: {participants.length + 1}
      </div>
      
      <button
        onClick={toggleAudio}
        style={{
          padding: '10px 20px',
          backgroundColor: audioEnabled ? '#00ff00' : '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
        title="Toggle Audio (Press O)"
      >
        {audioEnabled ? '🔊 Audio ON' : '🔇 Audio OFF'}
      </button>
      
      <button
        onClick={async () => {
          if (!videoEnabled) {
            // Ask for permission when enabling
            const confirmed = window.confirm('Enable video? This will request camera access.')
            if (!confirmed) return
          }
          await toggleVideo()
        }}
        style={{
          padding: '10px 20px',
          backgroundColor: videoEnabled ? '#00ff00' : '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
        title="Toggle Video (Press P) - Requests camera permission"
      >
        {videoEnabled ? '📹 Video ON' : '📷 Video OFF'}
      </button>
      
      <button
        onClick={leaveRoom}
        style={{
          padding: '10px 20px',
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
        title="Leave Room (Press Escape)"
      >
        Leave Room
      </button>
    </div>
  )
}

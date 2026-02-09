import React, { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRoomStore } from '../stores/roomStore'
import * as THREE from 'three'

/**
 * Center Video Display - Shows all participant videos in a grid layout
 * Positioned in the center of the mall
 */
export default function CenterVideoDisplay({ position = [0, 3, 0] }) {
  const { 
    isInRoom,
    currentRoom,
    participants,
    localStream,
    videoEnabled,
    audioEnabled,
    creatorStream,
    currentUserId,
    roomCreatorId
  } = useRoomStore()
  
  const [videoTextures, setVideoTextures] = useState({})
  const videoElementsRef = useRef({})
  const texturesRef = useRef({})
  
  // Collect all video streams (ensuring unique IDs)
  const allStreams = []
  const seenIds = new Set()
  
  // Add creator stream if available (and not already added)
  if (creatorStream && roomCreatorId && roomCreatorId !== currentUserId && !seenIds.has(roomCreatorId)) {
    allStreams.push({
      id: roomCreatorId,
      stream: creatorStream,
      label: 'Creator',
      uniqueKey: `creator-${roomCreatorId}`
    })
    seenIds.add(roomCreatorId)
  }
  
  // Add local stream if video is enabled (and not already added)
  // Show local stream even if tracks are disabled initially (they might be enabled later)
  if (localStream && currentUserId && !seenIds.has(currentUserId)) {
    const videoTracks = localStream.getVideoTracks()
    // Show local stream if it has video tracks (even if disabled, user can enable them)
    if (videoTracks.length > 0) {
      allStreams.push({
        id: currentUserId,
        stream: localStream,
        label: 'You',
        uniqueKey: `local-${currentUserId}`
      })
      seenIds.add(currentUserId)
    }
  }
  
  // Add other participants' streams (excluding duplicates)
  participants.forEach((participant, index) => {
    if (participant.stream && participant.id && !seenIds.has(participant.id)) {
      const videoTracks = participant.stream.getVideoTracks()
      if (videoTracks.length > 0 && videoTracks.some(track => track.enabled && track.readyState === 'live')) {
        const uniqueKey = participant.socketId 
          ? `${participant.id}-${participant.socketId}` 
          : `${participant.id}-${index}`
        allStreams.push({
          id: participant.id,
          stream: participant.stream,
          label: participant.userName || participant.label || `User ${participant.id.slice(-4)}`,
          uniqueKey: uniqueKey
        })
        seenIds.add(participant.id)
      }
    }
  })
  
  // Create video textures for each stream
  useEffect(() => {
    const cleanup = () => {
      // Cleanup all video elements and textures
      Object.values(videoElementsRef.current).forEach(video => {
        if (video && video.parentNode) {
          video.pause()
          video.srcObject = null
          video.parentNode.removeChild(video)
        }
      })
      Object.values(texturesRef.current).forEach(texture => {
        if (texture) texture.dispose()
      })
      videoElementsRef.current = {}
      texturesRef.current = {}
      setVideoTextures({})
    }
    
    cleanup()
    
    if (!isInRoom || allStreams.length === 0) {
      return cleanup
    }
    
    const newTextures = {}
    
    allStreams.forEach(({ id, stream }) => {
      // Check if stream has video tracks
      const videoTracks = stream.getVideoTracks()
      if (videoTracks.length === 0) {
        return
      }
      
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.style.display = 'none'
      video.style.position = 'absolute'
      video.style.width = '1px'
      video.style.height = '1px'
      video.style.opacity = '0'
      video.style.pointerEvents = 'none'
      video.style.top = '0'
      video.style.left = '0'
      
      document.body.appendChild(video)
      videoElementsRef.current[id] = video
      
      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBAFormat
      texture.needsUpdate = true
      
      texturesRef.current[id] = texture
      newTextures[id] = texture
      
      const playVideo = async () => {
        try {
          if (video && video.paused) {
            await video.play()
          }
          if (texture) texture.needsUpdate = true
        } catch (error) {
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
      
      video.onloadedmetadata = () => {
        if (texture) texture.needsUpdate = true
      }
      
      video.oncanplay = () => {
        playVideo()
        if (texture) texture.needsUpdate = true
      }
      
      video.onplaying = () => {
        if (texture) texture.needsUpdate = true
      }
      
      if (video.readyState >= 2) {
        playVideo()
      }
      setTimeout(playVideo, 200)
      setTimeout(playVideo, 1000) // Extra retry after 1 second
    })
    
    setVideoTextures(newTextures)
    
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInRoom, allStreams.length, currentUserId, roomCreatorId, videoEnabled])
  
  // Update textures every frame
  useFrame(() => {
    Object.values(texturesRef.current).forEach(texture => {
      if (texture) {
        texture.needsUpdate = true
      }
    })
  })
  
  // Always show the display, even when not in room (will show empty state)
  
  // Calculate grid layout
  const videoCount = allStreams.length || 1
  const cols = Math.ceil(Math.sqrt(videoCount))
  const rows = Math.ceil(videoCount / cols)
  const screenWidth = 20
  const screenHeight = 15
  const gap = 0.5
  const totalWidth = Math.max((screenWidth * cols) + (gap * (cols - 1)), 40) // Minimum width
  const totalHeight = Math.max((screenHeight * rows) + (gap * (rows - 1)), 20) // Minimum height
  const startX = -totalWidth / 2 + screenWidth / 2
  const startY = totalHeight / 2 - screenHeight / 2
  
  // If no videos, show a single placeholder screen
  const hasVideos = allStreams.length > 0
  
  return (
    <group position={position}>
      {/* Main monitor frame */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[totalWidth + 2, totalHeight + 4, 1]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.7} />
      </mesh>
      
      {/* Video screens grid */}
      {hasVideos ? allStreams.map(({ id, stream, label, uniqueKey }, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)
        const x = startX + col * (screenWidth + gap)
        const y = startY - row * (screenHeight + gap)
        const texture = videoTextures[id]
        
        return (
          <group key={uniqueKey || `${id}-${index}`} position={[x, y, 0.1]}>
            {/* Individual screen frame */}
            <mesh position={[0, 0, -0.05]} castShadow>
              <boxGeometry args={[screenWidth + 0.2, screenHeight + 0.2, 0.1]} />
              <meshStandardMaterial color="#2c2c2c" />
            </mesh>
            
            {/* Video screen */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[screenWidth, screenHeight]} />
              <meshStandardMaterial 
                map={texture || null}
                color={texture ? '#ffffff' : '#1a1a1a'}
                emissive={texture ? '#000000' : '#1a1a1a'}
                emissiveIntensity={0.2}
              />
            </mesh>
            
            {/* Loading/No video overlay */}
            {!texture && (
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[screenWidth, screenHeight]} />
                <meshStandardMaterial 
                  color="#1a1a1a" 
                  transparent 
                  opacity={0.8}
                />
              </mesh>
            )}
            
            {/* Label */}
            <mesh position={[0, -screenHeight/2 - 0.3, 0.02]}>
              <planeGeometry args={[screenWidth, 0.8]} />
              <meshStandardMaterial 
                color="#4a90e2" 
                transparent 
                opacity={0.9}
              />
            </mesh>
            
            {/* Live indicator */}
            {texture && (
              <mesh position={[-screenWidth/2 + 0.5, screenHeight/2 - 0.3, 0.02]}>
                <planeGeometry args={[1.5, 0.5]} />
                <meshStandardMaterial 
                  color="#ff0000" 
                  emissive="#ff0000"
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            )}
          </group>
        )
      }) : (
        // Placeholder when no videos
        <group position={[0, 0, 0.1]}>
          <mesh position={[0, 0, -0.05]} castShadow>
            <boxGeometry args={[screenWidth + 0.2, screenHeight + 0.2, 0.1]} />
            <meshStandardMaterial color="#2c2c2c" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[screenWidth, screenHeight]} />
            <meshStandardMaterial 
              color="#1a1a1a"
              emissive="#1a1a1a"
              emissiveIntensity={0.1}
            />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[screenWidth - 2, screenHeight - 2]} />
            <meshStandardMaterial 
              color="#4a90e2" 
              transparent 
              opacity={0.3}
            />
          </mesh>
        </group>
      )}
      
      {/* Keyboard shortcuts display */}
      <group position={[0, -totalHeight/2 - 1.5, 0.1]}>
        {/* Shortcuts panel background */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[totalWidth, 2.5, 0.1]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        
        {/* Left side - Audio shortcut */}
        <group position={[-totalWidth/4, 0, 0.05]}>
          {/* Status indicator */}
          <mesh position={[0, 0.5, 0.01]}>
            <planeGeometry args={[totalWidth/2 - 1, 0.6]} />
            <meshStandardMaterial 
              color={audioEnabled ? '#00ff00' : '#ff0000'} 
              emissive={audioEnabled ? '#00ff00' : '#ff0000'}
              emissiveIntensity={0.6}
              transparent 
              opacity={0.9}
            />
          </mesh>
          
          {/* O Key visual */}
          <mesh position={[-2, -0.3, 0.02]}>
            <boxGeometry args={[1, 1, 0.05]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          
          {/* Status text area */}
          <mesh position={[0.5, -0.3, 0.01]}>
            <planeGeometry args={[totalWidth/2 - 3.5, 0.8]} />
            <meshStandardMaterial 
              color="#2c2c2c" 
              transparent 
              opacity={0.8}
            />
          </mesh>
        </group>
        
        {/* Right side - Video shortcut */}
        <group position={[totalWidth/4, 0, 0.05]}>
          {/* Status indicator */}
          <mesh position={[0, 0.5, 0.01]}>
            <planeGeometry args={[totalWidth/2 - 1, 0.6]} />
            <meshStandardMaterial 
              color={videoEnabled ? '#00ff00' : '#ff0000'} 
              emissive={videoEnabled ? '#00ff00' : '#ff0000'}
              emissiveIntensity={0.6}
              transparent 
              opacity={0.9}
            />
          </mesh>
          
          {/* P Key visual */}
          <mesh position={[-2, -0.3, 0.02]}>
            <boxGeometry args={[1, 1, 0.05]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          
          {/* Status text area */}
          <mesh position={[0.5, -0.3, 0.01]}>
            <planeGeometry args={[totalWidth/2 - 3.5, 0.8]} />
            <meshStandardMaterial 
              color="#2c2c2c" 
              transparent 
              opacity={0.8}
            />
          </mesh>
        </group>
        
        {/* Divider line */}
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.1, 2.5, 0.02]} />
          <meshStandardMaterial color="#4a90e2" />
        </mesh>
      </group>
      
      {/* Room info display */}
      <group position={[0, totalHeight/2 + 1.5, 0.1]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[totalWidth, 1.5, 0.1]} />
          <meshStandardMaterial color="#4a90e2" transparent opacity={0.9} />
        </mesh>
        
        {/* Room info sections */}
        <mesh position={[-totalWidth/3, 0, 0.05]}>
          <planeGeometry args={[totalWidth/3 - 0.2, 1.2]} />
          <meshStandardMaterial color="#2c2c2c" transparent opacity={0.8} />
        </mesh>
        
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[totalWidth/3 - 0.2, 1.2]} />
          <meshStandardMaterial color="#2c2c2c" transparent opacity={0.8} />
        </mesh>
        
        <mesh position={[totalWidth/3, 0, 0.05]}>
          <planeGeometry args={[totalWidth/3 - 0.2, 1.2]} />
          <meshStandardMaterial color="#2c2c2c" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  )
}

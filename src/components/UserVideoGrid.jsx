import React, { useEffect, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import io from 'socket.io-client'
import { getAllRoomsFromRedis } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004'

/**
 * UserVideoGrid - Google Meet style user display in virtual world
 * Shows all users in a grid with their video feeds
 */
export default function UserVideoGrid({ position = [0, 5, -90], rotation = [0, 0, 0] }) {
  const [socket, setSocket] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [users, setUsers] = useState([])
  const [userStreams, setUserStreams] = useState(new Map()) // Map of userId -> stream
  const [currentUserId, setCurrentUserId] = useState(null)
  const peerConnectionsRef = useRef(new Map()) // Map of socketId -> RTCPeerConnection
  const videoElementsRef = useRef(new Map()) // Map of userId -> video element
  const texturesRef = useRef(new Map()) // Map of userId -> texture
  const groupRef = useRef()
  
  // Connect to socket and room
  useEffect(() => {
    let socketInstance = null
    
    async function connect() {
      try {
        // Get room from Redis
        const roomsData = await getAllRoomsFromRedis()
        if (roomsData.success && roomsData.rooms && roomsData.rooms.length > 0) {
          const firstRoom = roomsData.rooms[0]
          const channelId = firstRoom.roomId
          setRoomId(channelId)
          
          // Get or create user ID
          const userId = localStorage.getItem('userId') || `user-${Date.now()}`
          localStorage.setItem('userId', userId)
          setCurrentUserId(userId)
          
          // Connect to Socket.IO MEETING namespace on port 3000 (separate from REST API on 3004)
          const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : window.location.origin
          
          const socketUrl = `${serverUrl}/meeting`
          socketInstance = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
          })
          
          socketInstance.on('connect', () => {
            // Join room
            socketInstance.emit('join-room', {
              roomId: channelId,
              userId: userId,
              userName: `User ${userId.slice(-4)}`,
              productCategory: firstRoom.productCategory || 'General'
            })
          })
          
          socketInstance.on('joined-room', (data) => {
            // Room joined
          })
          
          socketInstance.on('room-users', async (data) => {
            if (data && data.users) {
              setUsers(data.users)
              
              // New joiner creates offers to all existing users (matches API contract)
              const mySocketId = socketInstance.id
              for (const user of data.users) {
                if (user.socketId && user.socketId !== mySocketId) {
                  await createPeerConnection(user.socketId, user.userId, user.userName, true)
                  // Small delay between offers (like API contract)
                  await new Promise(resolve => setTimeout(resolve, 200))
                }
              }
            }
          })
          
          socketInstance.on('user-joined', async (data) => {
            if (data) {
              setUsers(prev => {
                const exists = prev.find(u => u.userId === data.userId || u.socketId === data.socketId)
                if (!exists) {
                  return [...prev, {
                    userId: data.userId,
                    userName: data.userName,
                    socketId: data.socketId,
                    role: data.role || 'participant'
                  }]
                }
                return prev
              })
              
              // Existing user waits for offer from new joiner (matches API contract)
              const mySocketId = socketInstance.id
              if (data.socketId && data.socketId !== mySocketId) {
                await createPeerConnection(data.socketId, data.userId, data.userName, false)
              }
            }
          })
          
          socketInstance.on('user-left', (data) => {
            setUsers(prev => prev.filter(u => u.userId !== data.userId))
            
            // Remove stream
            setUserStreams(prev => {
              const next = new Map(prev)
              next.delete(data.userId)
              return next
            })
            
            // Close peer connection
            if (peerConnectionsRef.current.has(data.socketId)) {
              const pc = peerConnectionsRef.current.get(data.socketId)
              pc.close()
              peerConnectionsRef.current.delete(data.socketId)
            }
            
            // Cleanup video element
            if (videoElementsRef.current.has(data.userId)) {
              const video = videoElementsRef.current.get(data.userId)
              video.srcObject?.getTracks().forEach(track => track.stop())
              if (video.parentNode) {
                document.body.removeChild(video)
              }
              videoElementsRef.current.delete(data.userId)
            }
            
            // Cleanup texture
            if (texturesRef.current.has(data.userId)) {
              const texture = texturesRef.current.get(data.userId)
              texture.dispose()
              texturesRef.current.delete(data.userId)
            }
          })
          
          // WebRTC handlers
          socketInstance.on('offer', async (data) => {
            const { offer, senderSocketId } = data
            let pc = peerConnectionsRef.current.get(senderSocketId)
            
            if (!pc) {
              const user = users.find(u => u.socketId === senderSocketId)
              pc = createPeerConnection(senderSocketId, user?.userId || senderSocketId, user?.userName || 'User', false)
            }
            
            try {
              const state = pc.signalingState
              if (state === 'have-local-offer') {
                // Already have local offer, close and recreate
                pc.close()
                peerConnectionsRef.current.delete(senderSocketId)
                const user = users.find(u => u.socketId === senderSocketId)
                pc = createPeerConnection(senderSocketId, user?.userId || senderSocketId, user?.userName || 'User', false)
              }
              
              if (pc.signalingState === 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(offer))
                const answer = await pc.createAnswer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true
                })
                await pc.setLocalDescription(answer)
                
                socketInstance.emit('answer', {
                  answer: pc.localDescription,
                  targetSocketId: senderSocketId,
                  roomId: channelId
                })
              }
            } catch (error) {
              // Error handling offer
            }
          })
          
          socketInstance.on('answer', async (data) => {
            const { answer, senderSocketId } = data
            const pc = peerConnectionsRef.current.get(senderSocketId)
            
            if (pc && pc.signalingState === 'have-local-offer') {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
                
                // Process queued ICE candidates
                if (pc.queuedCandidates && pc.queuedCandidates.length > 0) {
                  for (const candidate of pc.queuedCandidates) {
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(candidate))
                    } catch (err) {
                      // Error adding queued candidate
                    }
                  }
                  pc.queuedCandidates = []
                }
              } catch (error) {
                // Error handling answer
              }
            }
          })
          
          socketInstance.on('ice-candidate', async (data) => {
            const { candidate, senderSocketId } = data
            if (!candidate || !senderSocketId) return
            
            const pc = peerConnectionsRef.current.get(senderSocketId)
            
            if (pc && candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
              } catch (err) {
                // Queue candidate if remote description not set yet
                if (!pc.queuedCandidates) pc.queuedCandidates = []
                pc.queuedCandidates.push(candidate)
              }
            }
          })
          
          setSocket(socketInstance)
        }
      } catch (error) {
        // Error connecting
      }
    }
    
    connect()
    
    return () => {
      if (socketInstance) {
        socketInstance.emit('leave-room')
        socketInstance.disconnect()
      }
      // Cleanup all peer connections
      peerConnectionsRef.current.forEach(pc => pc.close())
      peerConnectionsRef.current.clear()
      
      // Cleanup all video elements
      videoElementsRef.current.forEach(video => {
        video.srcObject?.getTracks().forEach(track => track.stop())
        if (video.parentNode) {
          document.body.removeChild(video)
        }
      })
      videoElementsRef.current.clear()
      
      // Cleanup all textures
      texturesRef.current.forEach(texture => texture.dispose())
      texturesRef.current.clear()
    }
  }, [])
  
  // Create peer connection
  function createPeerConnection(socketId, userId, userName, isInitiator) {
    if (peerConnectionsRef.current.has(socketId)) {
      return peerConnectionsRef.current.get(socketId)
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    
    // Handle remote stream - matches API contract approach
    pc.ontrack = (event) => {
      // Get or create stream (like API contract)
      let stream = event.streams[0]
      if (!stream) {
        stream = new MediaStream()
      }
      
      // Add track to stream (like API contract)
      const existingTrack = stream.getTracks().find(t => t.id === event.track.id)
      if (!existingTrack) {
        stream.addTrack(event.track)
      }
      
      // Store stream
      setUserStreams(prev => {
        const next = new Map(prev)
        next.set(userId, stream)
        return next
      })
      
      // Create video element for this user if it doesn't exist
      if (!videoElementsRef.current.has(userId)) {
        const video = document.createElement('video')
        video.autoplay = true
        video.playsInline = true
        video.muted = false
        video.volume = 0.5
        video.style.display = 'none'
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        document.body.appendChild(video)
        videoElementsRef.current.set(userId, video)
        
        // Create texture
        const texture = new THREE.VideoTexture(video)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.format = THREE.RGBAFormat
        texturesRef.current.set(userId, texture)
      }
      
      // Update video source (like API contract)
      const video = videoElementsRef.current.get(userId)
      if (video) {
        // Enable all tracks
        stream.getVideoTracks().forEach(track => {
          track.enabled = true
        })
        stream.getAudioTracks().forEach(track => {
          track.enabled = true
        })
        
        // Always set the stream (like API contract)
        video.srcObject = stream
        video.muted = false
        video.volume = 0.5
        
        // Check if we have live video
        const hasVideo = stream.getVideoTracks().length > 0
        const hasLiveVideo = hasVideo && stream.getVideoTracks()[0].readyState === 'live' && stream.getVideoTracks()[0].enabled
        
        if (hasLiveVideo || hasVideo) {
          // Force play with retry (like API contract)
          const playVideo = async (attempt = 1) => {
            try {
              await video.play()
              const texture = texturesRef.current.get(userId)
              if (texture) {
                texture.needsUpdate = true
              }
            } catch (err) {
              if (attempt < 3 && video && video.srcObject) {
                setTimeout(() => playVideo(attempt + 1), 500 * attempt)
              }
            }
          }
          playVideo()
        }
      }
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetSocketId: socketId,
          roomId: roomId
        })
      }
    }
    
    peerConnectionsRef.current.set(socketId, pc)
    
    // Create offer if initiator (matches API contract)
    if (isInitiator) {
      setTimeout(async () => {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          })
          await pc.setLocalDescription(offer)
          
          if (socket) {
            socket.emit('offer', {
              offer: pc.localDescription,
              targetSocketId: socketId,
              roomId: roomId
            })
          }
        } catch (error) {
          // Error creating offer
        }
      }, 300) // 300ms delay like API contract
    }
    
    return pc
  }
  
  // Update textures every frame and ensure videos are playing
  useFrame(() => {
    texturesRef.current.forEach((texture, userId) => {
      const video = videoElementsRef.current.get(userId)
      if (texture && video) {
        // Only update texture if video has valid data
        const hasValidVideo = video.srcObject && 
                             video.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                             video.videoWidth > 0 && 
                             video.videoHeight > 0
        
        if (hasValidVideo) {
          // Only update texture when video has valid dimensions
          texture.needsUpdate = true
        }
        
        // Ensure video is playing
        if (video.paused && video.srcObject) {
          video.play().catch(() => {})
        }
        
        // Ensure video tracks are enabled
        if (video.srcObject) {
          const stream = video.srcObject
          stream.getVideoTracks().forEach(track => {
            if (!track.enabled) {
              track.enabled = true
            }
          })
        }
      }
    })
  })
  
  // Calculate grid layout
  const userCount = users.length || 0
  const cols = userCount > 0 ? Math.ceil(Math.sqrt(userCount)) : 1
  const rows = userCount > 0 ? Math.ceil(userCount / cols) : 1
  const spacing = 3.5
  const startX = -(cols - 1) * spacing / 2
  const startY = (rows - 1) * spacing / 2
  
  if (userCount === 0) {
    return null
  }
  
  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {users.map((user, index) => {
        const row = Math.floor(index / cols)
        const col = index % cols
        const x = startX + col * spacing
        const y = startY - row * spacing
        const stream = userStreams.get(user.userId)
        const texture = texturesRef.current.get(user.userId)
        const video = videoElementsRef.current.get(user.userId)
        const hasVideo = stream && stream.getVideoTracks().length > 0 && 
                        stream.getVideoTracks().some(track => track.enabled && track.readyState === 'live') &&
                        video && video.readyState >= 2 && video.videoWidth > 0
        
        // Create unique key combining userId, socketId, and index to avoid duplicates
        const uniqueKey = `${user.userId || 'unknown'}-${user.socketId || 'unknown'}-${index}`
        
        return (
          <group key={uniqueKey} position={[x, y, 0]}>
            {/* User video frame/border */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[2.8, 2.3, 0.1]} />
              <meshStandardMaterial 
                color="#2a2a2a" 
                roughness={0.5}
                metalness={0.3}
              />
            </mesh>
            
            {/* User video screen */}
            <mesh position={[0, 0, 0.11]}>
              <boxGeometry args={[2.5, 2, 0.05]} />
              <meshStandardMaterial 
                map={
                  texture && 
                  video && 
                  video.readyState >= 2 && 
                  video.videoWidth > 0 
                    ? texture 
                    : null
                }
                color={hasVideo && texture && video && video.videoWidth > 0 ? "#ffffff" : "#1a1a1a"}
                emissive={hasVideo && texture && video && video.videoWidth > 0 ? "#222222" : "#000000"}
                emissiveIntensity={hasVideo && texture && video && video.videoWidth > 0 ? 0.5 : 0}
                roughness={0.1}
                metalness={0.1}
              />
            </mesh>
            
            {/* User name label background */}
            <mesh position={[0, -1.25, 0.16]}>
              <planeGeometry args={[2.6, 0.5]} />
              <meshStandardMaterial 
                color="#000000" 
                transparent 
                opacity={0.8}
              />
            </mesh>
            
            {/* Status indicator (green if video, gray if no video) */}
            <mesh position={[-1.1, -1.25, 0.17]}>
              <circleGeometry args={[0.15, 16]} />
              <meshStandardMaterial 
                color={hasVideo ? "#4CAF50" : "#666666"}
                emissive={hasVideo ? "#2e7d32" : "#333333"}
                emissiveIntensity={0.3}
              />
            </mesh>
            
            {/* User name display - using a plane with texture would be complex, 
                so we'll use a simple colored indicator instead */}
            <mesh position={[0, -1.25, 0.17]}>
              <planeGeometry args={[2.2, 0.3]} />
              <meshStandardMaterial 
                color={hasVideo ? "#4CAF50" : "#666666"}
                transparent
                opacity={0.3}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

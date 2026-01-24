import React, { useEffect, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerStore } from '../stores/playerStore'
import { getAllRoomsFromRedis } from '../services/api'
import io from 'socket.io-client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004'

// Global state for TV screen controls (accessible from App.jsx)
let tvScreenState = {
  isNear: false,
  audioEnabled: false,
  videoEnabled: false,
  userCount: 0,
  users: [],
  onEnableAudio: null,
  onEnableVideo: null,
  connectionStatus: 'disconnected',
  roomId: null,
  socket: null,
  remoteStreamsCount: 0,
  peerConnectionsCount: 0,
  displayStream: null,
}

export default function TVScreen({ position, rotation }) {
  const playerPosition = usePlayerStore((state) => state.position)
  const [isNear, setIsNear] = useState(false)
  const [socket, setSocket] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [users, setUsers] = useState([])
  const [localStream, setLocalStream] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(false) // Default: off at start
  const [videoEnabled, setVideoEnabled] = useState(false) // Default: off at start
  const [remoteStreams, setRemoteStreams] = useState([]) // Streams from other users
  const [displayStream, setDisplayStream] = useState(null) // Currently displayed stream (remote or local)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // For debugging
  const [textureKey, setTextureKey] = useState(0) // Force re-render when texture changes
  const videoRef = useRef(null)
  const textureRef = useRef(null)
  const meshRef = useRef(null)
  const peerConnectionsRef = useRef(new Map()) // Map of socketId -> RTCPeerConnection
  const currentUserIdRef = useRef(null) // Store currentUserId for use in event handlers
  
  const PROXIMITY_DISTANCE = 5.0 // Distance to show controls
  
  // Handle toggle audio
  const handleToggleAudio = React.useCallback(async () => {
    if (!socket || !roomId) {
      // If socket not ready, wait a bit and try again
      setTimeout(() => {
        if (socket && roomId) {
          handleToggleAudio()
        }
      }, 500)
      return
    }
    
    if (audioEnabled) {
      // Disable audio
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false
        })
      }
      setAudioEnabled(false)
      socket.emit('toggle-audio', {
        isMuted: true,
        roomId: roomId
      })
    } else {
      // Enable audio
      try {
        let stream
        if (localStream) {
          // Enable existing audio tracks
          localStream.getAudioTracks().forEach(track => {
            track.enabled = true
          })
          stream = localStream
        } else {
          // Request new audio stream
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoEnabled })
          setLocalStream(stream)
        }
        
        // Add audio tracks to all peer connections and renegotiate if needed
        for (const [socketId, pc] of peerConnectionsRef.current.entries()) {
          let needsRenegotiation = false
          stream.getAudioTracks().forEach(track => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio')
            if (sender) {
              sender.replaceTrack(track)
            } else {
              pc.addTrack(track, stream)
              needsRenegotiation = true
            }
          })
          
          // If we added new tracks, renegotiate the connection
          if (needsRenegotiation && pc.signalingState === 'stable' && socket) {
            // Create new offer to include the new tracks
            pc.createOffer().then(offer => {
              pc.setLocalDescription(offer).then(() => {
                socket.emit('offer', {
                  offer: offer,
                  targetSocketId: socketId,
                  roomId: roomId
                })
              }).catch(() => {})
            }).catch(() => {})
          }
        }
        
        setAudioEnabled(true)
        
        // Notify server
        socket.emit('toggle-audio', {
          isMuted: false,
          roomId: roomId
        })
      } catch (error) {
        alert('Microphone permission denied')
      }
    }
  }, [socket, roomId, localStream, audioEnabled, videoEnabled])
  
  // Handle toggle video
  const handleToggleVideo = React.useCallback(async () => {
    if (!socket || !roomId) {
      // If socket not ready, wait a bit and try again
      setTimeout(() => {
        if (socket && roomId) {
          handleToggleVideo()
        }
      }, 500)
      return
    }
    
    if (videoEnabled) {
      // Disable video
      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = false
        })
      }
      setVideoEnabled(false)
      socket.emit('toggle-video', {
        isVideoOff: true,
        roomId: roomId
      })
    } else {
      // Enable video
      try {
        let stream
        if (localStream) {
          // Enable existing video tracks or add new ones
          const hasVideoTracks = localStream.getVideoTracks().length > 0
          if (hasVideoTracks) {
            localStream.getVideoTracks().forEach(track => {
              track.enabled = true
            })
            stream = localStream
          } else {
            // Need to get new stream with video
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: audioEnabled, 
              video: true 
            })
            // Merge with existing audio if needed
            if (localStream.getAudioTracks().length > 0) {
              localStream.getAudioTracks().forEach(track => {
                stream.addTrack(track)
              })
            }
            setLocalStream(stream)
          }
        } else {
          // Request new video stream
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: audioEnabled, 
            video: true 
          })
          setLocalStream(stream)
        }
        
        // Update video element to show your own video
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
          if (textureRef.current) {
            textureRef.current.needsUpdate = true
          }
        }
        
        // Add tracks to all peer connections and renegotiate if needed
        for (const [socketId, pc] of peerConnectionsRef.current.entries()) {
          let needsRenegotiation = false
          stream.getTracks().forEach(track => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === track.kind)
            if (sender) {
              sender.replaceTrack(track)
            } else {
              pc.addTrack(track, stream)
              needsRenegotiation = true
            }
          })
          
          // If we added new tracks, renegotiate the connection
          if (needsRenegotiation && pc.signalingState === 'stable' && socket) {
            // Create new offer to include the new tracks
            pc.createOffer().then(offer => {
              pc.setLocalDescription(offer).then(() => {
                socket.emit('offer', {
                  offer: offer,
                  targetSocketId: socketId,
                  roomId: roomId
                })
              }).catch(() => {})
            }).catch(() => {})
          }
        }
        
        setVideoEnabled(true)
        
        // Notify server
        socket.emit('toggle-video', {
          isVideoOff: false,
          roomId: roomId
        })
      } catch (error) {
        alert('Camera permission denied')
      }
    }
  }, [socket, roomId, localStream, audioEnabled, videoEnabled])
  
  // Proximity detection and texture updates
  useFrame(() => {
    if (!meshRef.current) return
    
    const tvPosition = new THREE.Vector3(...position)
    const playerPos = new THREE.Vector3(...playerPosition)
    const distance = tvPosition.distanceTo(playerPos)
    
    const near = distance <= PROXIMITY_DISTANCE
    setIsNear(near)
    
    // Update global state for overlay
    tvScreenState.isNear = near
    tvScreenState.audioEnabled = audioEnabled
    tvScreenState.videoEnabled = videoEnabled
    tvScreenState.userCount = users.length
    tvScreenState.onEnableAudio = handleToggleAudio
    tvScreenState.onEnableVideo = handleToggleVideo
    tvScreenState.connectionStatus = connectionStatus
    tvScreenState.roomId = roomId
    tvScreenState.socket = socket
    tvScreenState.remoteStreamsCount = remoteStreams.length
    tvScreenState.peerConnectionsCount = peerConnectionsRef.current.size
    tvScreenState.displayStream = displayStream
    tvScreenState.users = users
    
    // Continuously update texture and ensure video is playing
    if (textureRef.current && videoRef.current) {
      // Only update texture if video has valid data
      const hasValidVideo = videoRef.current.srcObject && 
                           videoRef.current.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                           videoRef.current.videoWidth > 0 && 
                           videoRef.current.videoHeight > 0
      
      if (hasValidVideo) {
        // Only update texture when video has valid dimensions
        textureRef.current.needsUpdate = true
      }
      
      // Ensure video is playing
      if (videoRef.current.paused && videoRef.current.srcObject) {
        videoRef.current.play().catch(() => {})
      }
      
      // Ensure video tracks are enabled and check if video is actually playing
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject
        const videoTracks = stream.getVideoTracks()
        
        // Enable all video tracks
        videoTracks.forEach(track => {
          if (!track.enabled) {
            track.enabled = true
          }
        })
        
        // If we have video tracks but video is not playing, force play
        if (videoTracks.length > 0 && videoRef.current.paused) {
          videoRef.current.play().catch(() => {})
        }
      }
    }
  })
  
  // Track if connection has been initialized
  const hasConnectedRef = useRef(false)
  
  // Get room/channel ID from Redis and connect to Socket.IO - only once on mount
  useEffect(() => {
    // Only connect once
    if (hasConnectedRef.current) {
      return
    }
    hasConnectedRef.current = true
    
    let socketInstance = null
    let retryTimeout = null
    let retryCount = 0
    let currentRoomId = null
    const MAX_RETRIES = 5
    const RETRY_DELAY = 2000 // 2 seconds
    
    // Create peer connection for WebRTC - defined inside useEffect to access socketInstance
    function createPeerConnection(socketId, userId, userName, isInitiator) {
      if (peerConnectionsRef.current.has(socketId)) {
        return peerConnectionsRef.current.get(socketId)
      }
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      
      // Add local stream tracks if available
      // This ensures new peer connections get the local stream when it becomes available
      if (localStream) {
        localStream.getTracks().forEach(track => {
          if (track.readyState === 'live' && track.enabled) {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === track.kind)
            if (sender) {
              sender.replaceTrack(track)
            } else {
              pc.addTrack(track, localStream)
            }
          }
        })
      }
      
      // Handle remote stream - matches API contract approach
      pc.ontrack = (event) => {
        // Get or create stream (like API contract)
        let stream = event.streams[0]
        if (!stream) {
          // Create new stream if needed
          stream = new MediaStream()
        }
        
        // Add track to stream (like API contract)
        const existingTrack = stream.getTracks().find(t => t.id === event.track.id)
        if (!existingTrack) {
          stream.addTrack(event.track)
        }
        
        // Check for video and audio tracks
        const hasVideo = stream.getVideoTracks().length > 0
        const hasAudio = stream.getAudioTracks().length > 0
        
        if (!hasVideo && !hasAudio) return
        
        // Add to remote streams list
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.socketId === socketId)
          if (existing) {
            return prev.map(s => 
              s.socketId === socketId 
                ? { ...s, stream: stream } 
                : s
            )
          }
          return [...prev, { socketId, userId, userName, stream: stream }]
        })
        
        // Ensure video element exists
        if (!videoRef.current) {
          const video = document.createElement('video')
          video.autoplay = true
          video.playsInline = true
          video.muted = false
          video.volume = 0.5
          video.style.display = 'none'
          video.setAttribute('playsinline', 'true')
          video.setAttribute('webkit-playsinline', 'true')
          video.setAttribute('crossorigin', 'anonymous')
          document.body.appendChild(video)
          videoRef.current = video
          
          // Create texture from video
          textureRef.current = new THREE.VideoTexture(video)
          textureRef.current.minFilter = THREE.LinearFilter
          textureRef.current.magFilter = THREE.LinearFilter
          textureRef.current.format = THREE.RGBAFormat
        }
        
        // Display video stream on TV screen (like API contract)
        if (videoRef.current) {
          // Enable all tracks
          stream.getVideoTracks().forEach(track => {
            track.enabled = true
          })
          stream.getAudioTracks().forEach(track => {
            track.enabled = true
          })
          
          // Always set the stream (like API contract)
          videoRef.current.srcObject = stream
          videoRef.current.muted = false
          videoRef.current.volume = 0.5
          videoRef.current.autoplay = true
          videoRef.current.playsInline = true
          
          // Check if we have live video
          const hasLiveVideo = hasVideo && stream.getVideoTracks()[0].readyState === 'live' && stream.getVideoTracks()[0].enabled
          
          if (hasLiveVideo || hasVideo) {
            // Force play with retry (like API contract)
            const playVideo = async (attempt = 1) => {
              try {
                await videoRef.current.play()
                setDisplayStream(stream)
                if (hasVideo) {
                  setVideoEnabled(true)
                }
                if (textureRef.current) {
                  textureRef.current.needsUpdate = true
                  setTextureKey(prev => prev + 1)
                }
              } catch (err) {
                if (attempt < 3 && videoRef.current && videoRef.current.srcObject) {
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
        if (event.candidate && socketInstance) {
          socketInstance.emit('ice-candidate', {
            candidate: event.candidate,
            targetSocketId: socketId,
            roomId: currentRoomId
          })
        }
      }
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectionStatus(`webrtc-connected: ${userName}`)
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setConnectionStatus(`webrtc-${pc.connectionState}: ${userName}`)
        }
      }
      
      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus(`ice-connected: ${userName}`)
        }
      }
      
      peerConnectionsRef.current.set(socketId, pc)
      
      // Create offer if initiator (after adding local tracks) - matches API contract
      if (isInitiator) {
        // Small delay to ensure tracks are added (like API contract)
        setTimeout(async () => {
          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            })
            await pc.setLocalDescription(offer)
            
            if (socketInstance) {
              socketInstance.emit('offer', {
                offer: pc.localDescription,
                targetSocketId: socketId,
                roomId: currentRoomId
              })
            }
          } catch (error) {
            // Error creating offer
          }
        }, 300) // 300ms delay like API contract
      }
      
      return pc
    }
    
    async function connectToRoom() {
      try {
        // Get all rooms from Redis and use the first one
        const roomsData = await getAllRoomsFromRedis()
        if (roomsData.success && roomsData.rooms && roomsData.rooms.length > 0) {
          const firstRoom = roomsData.rooms[0]
          const channelId = firstRoom.roomId
          currentRoomId = channelId
          setRoomId(channelId)
          
          function attemptConnection() {
            // Connect to Socket.IO MEETING namespace on port 3000 (separate from REST API on 3004)
            const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
              ? 'http://localhost:3000'
              : window.location.origin
            
            const socketUrl = `${serverUrl}/meeting`
            // Debug: Log the connection URL
            setConnectionStatus(`Connecting to ${socketUrl}...`)
            
            socketInstance = io(socketUrl, {
              transports: ['websocket', 'polling'],
              reconnection: true,
              reconnectionDelay: 1000,
              reconnectionDelayMax: 5000,
              reconnectionAttempts: MAX_RETRIES,
              timeout: 10000,
            })
            
            socketInstance.on('connect', async () => {
              retryCount = 0 // Reset retry count on successful connection
              setConnectionStatus('connected')
              
              const currentUserId = localStorage.getItem('userId') || `tv-user-${Date.now()}`
              localStorage.setItem('userId', currentUserId)
              currentUserIdRef.current = currentUserId // Store in ref for use in other handlers
              const userName = 'TV Viewer'
              
              // Don't request media at startup - user will enable via buttons
              // Just create the video element for displaying remote streams
              if (!videoRef.current) {
                const video = document.createElement('video')
                video.autoplay = true
                video.playsInline = true
                video.muted = false // Allow audio playback
                video.volume = 0.5 // Set volume to 50% to avoid feedback
                video.style.display = 'none'
                document.body.appendChild(video)
                videoRef.current = video
                
                // Create texture from video
                textureRef.current = new THREE.VideoTexture(video)
                textureRef.current.minFilter = THREE.LinearFilter
                textureRef.current.magFilter = THREE.LinearFilter
              }
              
              // Join room with audio and video OFF by default
              socketInstance.emit('join-room', {
                roomId: channelId,
                userId: currentUserId,
                userName: userName,
                productCategory: firstRoom.productCategory || 'General'
              })
              
              // Notify server that audio and video are OFF (default)
              socketInstance.emit('toggle-audio', {
                isMuted: true,
                roomId: channelId
              })
              
              socketInstance.emit('toggle-video', {
                isVideoOff: true,
                roomId: channelId
              })
            })
            
            socketInstance.on('connect_error', (error) => {
              setConnectionStatus(`connect_error: ${error.message}`)
              retryCount++
              if (retryCount < MAX_RETRIES) {
                // Retry connection after delay
                retryTimeout = setTimeout(() => {
                  if (socketInstance) {
                    socketInstance.disconnect()
                  }
                  attemptConnection()
                }, RETRY_DELAY)
              }
            })
            
            socketInstance.on('disconnect', () => {
              // Connection lost, will auto-reconnect if reconnection is enabled
            })
            
            socketInstance.on('joined-room', (data) => {
              setConnectionStatus(`joined-room: ${data?.userName || data?.userId || 'TV Viewer'}`)
              // Room joined successfully - TV Viewer should now be visible to others
              // Update users state to include TV Viewer itself
              if (data) {
                setUsers(prev => {
                  const exists = prev.find(u => u.userId === data.userId || u.socketId === socketInstance.id)
                  if (!exists) {
                    return [...prev, {
                      userId: data.userId || currentUserIdRef.current || localStorage.getItem('userId') || `tv-user-${Date.now()}`,
                      userName: data.userName || 'TV Viewer',
                      socketId: socketInstance.id,
                      role: data.role || 'participant'
                    }]
                  }
                  return prev
                })
              }
            })
            
            socketInstance.on('room-users', (data) => {
              setConnectionStatus(`room-users: ${data?.users?.length || 0} users`)
              // Update users list - includes all users in room including TV Viewer
              if (data && data.users && Array.isArray(data.users)) {
                // Ensure TV Viewer is included in the list
                const mySocketId = socketInstance.id
                const myUserId = currentUserIdRef.current || localStorage.getItem('userId') || `tv-user-${Date.now()}`
                const myUserName = 'TV Viewer'
                
                // Check if TV Viewer is in the list
                const tvViewerInList = data.users.some(u => 
                  u.userId === myUserId || u.socketId === mySocketId || u.userName === 'TV Viewer'
                )
                
                // Add TV Viewer if not in list
                const allUsers = tvViewerInList 
                  ? data.users 
                  : [...data.users, {
                      userId: myUserId,
                      userName: myUserName,
                      socketId: mySocketId,
                      role: 'participant'
                    }]
                
                setUsers(allUsers)
                
                // Create peer connections for ALL existing users (excluding self)
                // New joiner creates offers to all existing users (like the API contract)
                allUsers.forEach(async (user) => {
                  if (user.socketId && user.socketId !== mySocketId) {
                    // Create peer connection for every user - new joiner is initiator
                    if (!peerConnectionsRef.current.has(user.socketId)) {
                      await createPeerConnection(user.socketId, user.userId, user.userName, true)
                      // Small delay between offers (like API contract)
                      await new Promise(resolve => setTimeout(resolve, 200))
                    }
                  }
                })
              }
            })
            
            socketInstance.on('user-joined', (data) => {
              setConnectionStatus(`user-joined: ${data?.userName || data?.userId || 'unknown'}`)
              // New user joined - add to users list
              if (data && data.userId && data.socketId) {
                setUsers(prev => {
                  // Check if user already exists by userId or socketId
                  const exists = prev.find(u => 
                    u.userId === data.userId || 
                    u.socketId === data.socketId ||
                    (u.userName === data.userName && data.userName)
                  )
                  if (!exists) {
                    return [...prev, {
                      userId: data.userId,
                      userName: data.userName || `User ${data.userId.slice(-4)}`,
                      socketId: data.socketId,
                      role: data.role || 'participant'
                    }]
                  }
                  // Update existing user if found
                  return prev.map(u => 
                    (u.userId === data.userId || u.socketId === data.socketId)
                      ? { ...u, ...data, socketId: data.socketId }
                      : u
                  )
                })
                
                // Create peer connection for new user immediately
                // This allows us to receive their video/audio when they enable it
                const mySocketId = socketInstance.id
                if (data.socketId && data.socketId !== mySocketId) {
                  if (!peerConnectionsRef.current.has(data.socketId)) {
                    createPeerConnection(data.socketId, data.userId, data.userName, mySocketId < data.socketId)
                  }
                }
              }
            })
            
            socketInstance.on('user-left', (data) => {
              setUsers(prev => prev.filter(u => u.userId !== data.userId))
              
              // Close peer connection
              if (peerConnectionsRef.current.has(data.socketId)) {
                const pc = peerConnectionsRef.current.get(data.socketId)
                pc.close()
                peerConnectionsRef.current.delete(data.socketId)
              }
            })
            
            // WebRTC signaling handlers
            socketInstance.on('offer', async (data) => {
              const { offer, senderSocketId, senderUserId, senderUserName } = data
              let pc = peerConnectionsRef.current.get(senderSocketId)
              
              if (!pc) {
                pc = createPeerConnection(senderSocketId, senderUserId, senderUserName, false)
              }
              
              try {
                if (pc.signalingState === 'stable') {
                  await pc.setRemoteDescription(new RTCSessionDescription(offer))
                  const answer = await pc.createAnswer()
                  await pc.setLocalDescription(answer)
                  
                  socketInstance.emit('answer', {
                    answer: answer,
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
                  
                  // Process queued ICE candidates after setting remote description
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
              const pc = peerConnectionsRef.current.get(senderSocketId)
              
              if (pc && candidate) {
                try {
                  if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate))
                  } else {
                    // Queue candidate if remote description not set yet
                    if (!pc.queuedCandidates) pc.queuedCandidates = []
                    pc.queuedCandidates.push(candidate)
                  }
                } catch (error) {
                  // Error adding ICE candidate
                }
              }
            })
            
            socketInstance.on('error', () => {
              // Socket error occurred
            })
            
            setSocket(socketInstance)
          }
          
          // Start connection attempt
          attemptConnection()
        }
      } catch (error) {
        // Error connecting TV screen to room
      }
    }
    
    // Connect to room once at start
    connectToRoom()
    
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (socketInstance) {
        socketInstance.emit('leave-room')
        socketInstance.disconnect()
        socketInstance = null
      }
      if (socket) {
        socket.emit('leave-room')
        socket.disconnect()
      }
      // Close all peer connections
      peerConnectionsRef.current.forEach(pc => pc.close())
      peerConnectionsRef.current.clear()
      hasConnectedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run once on mount
  
  
  // Update texture when remote streams change - prioritize remote streams
  useEffect(() => {
    if (videoRef.current && textureRef.current) {
      // Find first remote stream with active video
      const remoteStreamWithVideo = remoteStreams.find(s => {
        if (!s.stream) return false
        const videoTracks = s.stream.getVideoTracks()
        return videoTracks.length > 0 && videoTracks.some(track => track.enabled && track.readyState === 'live')
      })
      
      if (remoteStreamWithVideo && remoteStreamWithVideo.stream) {
        // Show remote user's video on TV screen
        const stream = remoteStreamWithVideo.stream
        
        // Ensure video tracks are enabled
        stream.getVideoTracks().forEach(track => {
          track.enabled = true
        })
        
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream
          videoRef.current.muted = false
          videoRef.current.volume = 0.5
          videoRef.current.autoplay = true
          videoRef.current.playsInline = true
          
          // Play with retry
          const playVideo = () => {
            videoRef.current.play().then(() => {
              if (textureRef.current) {
                textureRef.current.needsUpdate = true
                setTextureKey(prev => prev + 1) // Force re-render
              }
            }).catch(() => {
              setTimeout(() => {
                if (videoRef.current && videoRef.current.srcObject) {
                  playVideo()
                }
              }, 500)
            })
          }
          playVideo()
          
          setDisplayStream(stream)
          setVideoEnabled(true) // Enable video display
        }
        // Force texture update
        if (textureRef.current) {
          textureRef.current.needsUpdate = true
          setTextureKey(prev => prev + 1) // Force re-render
        }
      } else if (videoEnabled && localStream && localStream.getVideoTracks().length > 0) {
        // Fallback to local stream only if no remote streams and user enabled their video
        if (videoRef.current.srcObject !== localStream) {
          videoRef.current.srcObject = localStream
          videoRef.current.play().catch(() => {})
          setDisplayStream(localStream)
        }
        textureRef.current.needsUpdate = true
      } else if (remoteStreams.length === 0 && !videoEnabled) {
        // No streams - show black screen
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject = null
          setDisplayStream(null)
        }
      }
    }
  }, [remoteStreams, videoEnabled, localStream])
  
  // Cleanup video element and texture
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject?.getTracks().forEach(track => track.stop())
        if (videoRef.current.parentNode) {
          document.body.removeChild(videoRef.current)
        }
        videoRef.current = null
      }
      if (textureRef.current) {
        textureRef.current.dispose()
        textureRef.current = null
      }
    }
  }, [])
  
  return (
    <group position={position} rotation={rotation} ref={meshRef}>
      {/* TV Frame/Bezel - Moved forward slightly */}
      <mesh position={[0, 0, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[8, 4.5, 0.2]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      
      {/* TV Screen - Display video or placeholder - Moved forward to avoid wall clipping */}
      <mesh position={[0, 0, 0.15]} castShadow key={textureKey}>
        <boxGeometry args={[7.5, 4, 0.05]} />
        <meshStandardMaterial 
          map={
            textureRef.current && 
            videoRef.current && 
            videoRef.current.readyState >= 2 && 
            videoRef.current.videoWidth > 0 
              ? textureRef.current 
              : null
          }
          color={displayStream && textureRef.current && videoRef.current && videoRef.current.videoWidth > 0 ? "#ffffff" : "#000000"}
          emissive={displayStream && textureRef.current && videoRef.current && videoRef.current.videoWidth > 0 ? "#222222" : "#000000"}
          emissiveIntensity={displayStream && textureRef.current && videoRef.current && videoRef.current.videoWidth > 0 ? 0.8 : 0}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* TV Stand/Bracket */}
      <mesh position={[0, -2.5, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.3, 0.3]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>
      
    </group>
  )
}

// Export function to get TV screen state for overlay
export function getTVScreenState() {
  return tvScreenState
}

// TV Controls UI Component (2D overlay)
export function TVControlsOverlay({ 
  isNear, 
  audioEnabled, 
  videoEnabled, 
  onEnableAudio, 
  onEnableVideo,
  userCount,
  connectionStatus,
  roomId,
  socket,
  remoteStreamsCount,
  peerConnectionsCount,
  displayStream,
  users = []
}) {
  if (!isNear) return null
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '15px 25px',
      borderRadius: '10px',
      color: 'white',
      zIndex: 1000,
      display: 'flex',
      gap: '15px',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ marginRight: '10px' }}>
        <strong>TV Screen Controls</strong>
        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
          {userCount > 0 ? `${userCount} user(s) in room` : 'No users in room'}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '3px' }}>
          Your Status: {audioEnabled ? 'Audio ON' : 'Audio OFF'} | {videoEnabled ? 'Video ON' : 'Video OFF'}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '3px', color: remoteStreamsCount > 0 ? '#4CAF50' : '#999' }}>
          {remoteStreamsCount > 0 ? `📹 ${remoteStreamsCount} user(s) with video` : 'No users with video'}
        </div>
        <details style={{ fontSize: '10px', opacity: 0.6, marginTop: '5px', cursor: 'pointer' }}>
          <summary>Debug Info</summary>
          <div style={{ marginTop: '5px', fontSize: '9px', fontFamily: 'monospace' }}>
            <div>Connection: {connectionStatus || 'unknown'}</div>
            <div>Room ID: {roomId || 'none'}</div>
            <div>Socket: {socket ? 'connected' : 'disconnected'}</div>
            <div>Remote Streams: {remoteStreamsCount}</div>
            <div>Peer Connections: {peerConnectionsCount}</div>
            <div>Display Stream: {displayStream ? 'active' : 'none'}</div>
          </div>
        </details>
      </div>
      
      <button
        onClick={onEnableAudio}
        style={{
          padding: '8px 16px',
          backgroundColor: audioEnabled ? '#4CAF50' : '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        {audioEnabled ? '🔊 Audio ON' : '🔇 Audio OFF'}
      </button>
      
      <button
        onClick={onEnableVideo}
        style={{
          padding: '8px 16px',
          backgroundColor: videoEnabled ? '#4CAF50' : '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        {videoEnabled ? '📹 Video ON' : '📷 Video OFF'}
      </button>
      
      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '5px', fontStyle: 'italic' }}>
        Note: Audio plays from video element. Check browser audio settings if no sound.
      </div>
    </div>
  )
}

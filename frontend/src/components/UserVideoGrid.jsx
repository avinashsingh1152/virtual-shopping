import React, { useEffect, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import io from 'socket.io-client'
import { getAllRoomsFromRedis } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

/**
 * UserVideoGrid - Google Meet style user display in virtual world
 */
export default function UserVideoGrid({ position = [0, 5, -90], rotation = [0, 0, 0], playerPosition = [0, 0, 0] }) {
  const [socket, setSocket] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [users, setUsers] = useState([])
  const [userStreams, setUserStreams] = useState(new Map()) // Map of socketId -> stream
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const peerConnectionsRef = useRef(new Map()) // Map of socketId -> RTCPeerConnection
  const videoElementsRef = useRef(new Map()) // Map of socketId -> video element
  const texturesRef = useRef(new Map()) // Map of socketId -> texture
  const groupRef = useRef()
  const localStreamRef = useRef(null)

  // Socket setup
  useEffect(() => {
    let socketInstance = null

    async function init() {
      try {
        // 1. Determine Room ID (Priority: 'fashion-1' -> API first room -> Default)
        let channelId = 'fashion-1'
        try {
          const roomsData = await getAllRoomsFromRedis()
          if (roomsData.success && roomsData.rooms && roomsData.rooms.length > 0) {
            const fashionRoom = roomsData.rooms.find(r => r.roomId === 'fashion-1')
            if (fashionRoom) channelId = fashionRoom.roomId
          }
        } catch (e) {
          console.error("Error fetching rooms, using default", e)
        }

        setRoomId(channelId)

        // 2. Get User ID
        const userId = localStorage.getItem('userId') || `user-${Date.now()}`
        localStorage.setItem('userId', userId)
        setCurrentUserId(userId)

        // 3. Connect Socket
        const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3001'
          : window.location.origin

        const socketUrl = `${serverUrl}/meeting`
        console.log(`🟢 UserVideoGrid: Connecting to ${socketUrl} for room ${channelId}`)

        socketInstance = io(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
        })

        socketInstance.on('connect', () => {
          socketInstance.emit('join-room', {
            roomId: channelId,
            userId: userId,
            userName: `User ${userId.slice(-4)}`,
            productCategory: 'General'
          })
        })

        socketInstance.on('room-users', async (data) => {
          if (data && data.users) {
            setUsers(data.users)

            // Initiate connections to existing users
            const mySocketId = socketInstance.id
            for (const user of data.users) {
              if (user.socketId && user.socketId !== mySocketId) {
                await createPeerConnection(user.socketId, user.userName, true, socketInstance)
                await new Promise(resolve => setTimeout(resolve, 200))
              }
            }
          }
        })

        socketInstance.on('user-joined', async (data) => {
          if (data) {
            setUsers(prev => {
              const exists = prev.find(u => u.socketId === data.socketId)
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

            const mySocketId = socketInstance.id
            if (data.socketId && data.socketId !== mySocketId) {
              await createPeerConnection(data.socketId, data.userName, false, socketInstance)
            }
          }
        })

        socketInstance.on('user-left', (data) => {
          handleUserLeft(data)
        })

        // WebRTC Handlers
        socketInstance.on('offer', async (data) => {
          const { offer, senderSocketId } = data
          let pc = peerConnectionsRef.current.get(senderSocketId)

          if (!pc) {
            const user = users.find(u => u.socketId === senderSocketId)
            pc = createPeerConnection(senderSocketId, user?.userName || 'User', false, socketInstance)
          }

          try {
            if (pc.signalingState === 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(offer))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              socketInstance.emit('answer', {
                answer,
                targetSocketId: senderSocketId,
                roomId: channelId
              })
            }
          } catch (e) { console.error("Error handling offer", e) }
        })

        socketInstance.on('answer', async (data) => {
          const pc = peerConnectionsRef.current.get(data.senderSocketId)
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            } catch (e) {
              console.error("Error handling answer", e)
            }
          }
        })

        socketInstance.on('ice-candidate', async (data) => {
          const pc = peerConnectionsRef.current.get(data.senderSocketId)
          if (pc && data.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
            } catch (e) { console.error("Error adding ice candidate", e) }
          }
        })

        setSocket(socketInstance)

      } catch (error) {
        console.error('Socket init error:', error)
      }
    }

    init()

    return () => {
      if (socketInstance) {
        socketInstance.emit('leave-room')
        socketInstance.disconnect()
      }
      peerConnectionsRef.current.forEach(pc => pc.close())
      peerConnectionsRef.current.clear()

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }

      // Cleanup videos/textures
      videoElementsRef.current.forEach(video => {
        if (video && video.parentNode) document.body.removeChild(video)
      })
      videoElementsRef.current.clear()
      texturesRef.current.forEach(t => t.dispose())
      texturesRef.current.clear()
    }
  }, [])


  function createPeerConnection(socketId, userName, isInitiator, socket) {
    if (peerConnectionsRef.current.has(socketId)) return peerConnectionsRef.current.get(socketId)

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    // ADD LOCAL TRACKS IF BROADCASTING
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    pc.ontrack = (event) => {
      console.log(`🎥 UserVideoGrid: Received track from ${socketId}`, event.streams[0])
      const stream = event.streams[0]
      if (stream) {
        console.log(`✅ UserVideoGrid: Setting stream for ${socketId}, tracks:`, stream.getTracks().length)
        setUserStreams(prev => {
          const next = new Map(prev)
          next.set(socketId, stream) // Use socketId as key
          console.log(`📊 UserVideoGrid: Total streams now:`, next.size)
          return next
        })
        createVideoTextureForStream(socketId, stream)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetSocketId: socketId,
          roomId
        })
      }
    }

    peerConnectionsRef.current.set(socketId, pc)

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer)
        if (socket) {
          socket.emit('offer', {
            offer,
            targetSocketId: socketId,
            roomId
          })
        }
      })
    }

    return pc
  }

  function handleUserLeft(data) {
    setUsers(prev => prev.filter(u => u.socketId !== data.socketId))

    if (peerConnectionsRef.current.has(data.socketId)) {
      peerConnectionsRef.current.get(data.socketId).close()
      peerConnectionsRef.current.delete(data.socketId)
    }

    setUserStreams(prev => {
      const next = new Map(prev)
      next.delete(data.socketId)
      return next
    })

    if (videoElementsRef.current.has(data.socketId)) {
      const v = videoElementsRef.current.get(data.socketId)
      if (v.parentNode) document.body.removeChild(v)
      videoElementsRef.current.delete(data.socketId)
    }

    if (texturesRef.current.has(data.socketId)) {
      texturesRef.current.get(data.socketId).dispose()
      texturesRef.current.delete(data.socketId)
    }
  }

  function createVideoTextureForStream(id, stream, isLocal = false) {
    console.log(`🖼️ UserVideoGrid: Creating texture for ${id}, isLocal:${isLocal}`)
    if (videoElementsRef.current.has(id)) {
      console.log(`⚠️ UserVideoGrid: Texture already exists for ${id}, skipping`)
      return
    }

    const video = document.createElement('video')
    video.srcObject = stream
    video.autoplay = true
    video.playsInline = true
    video.muted = true // Always mute to prevent echo/feedback loops in 3D world
    video.style.display = 'none'
    document.body.appendChild(video)
    videoElementsRef.current.set(id, video)

    const texture = new THREE.VideoTexture(video)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.format = THREE.RGBAFormat
    texturesRef.current.set(id, texture)

    // Force play
    video.play().catch(e => console.error("Video play error", e))
  }

  // Toggle Broadcasting Logic
  const toggleBroadcast = async () => {
    console.log(`🔄 UserVideoGrid: toggleBroadcast called, current state: ${isBroadcasting}`)
    if (isBroadcasting) {
      // Stop Broadcasting
      console.log(`⏹️ UserVideoGrid: Stopping broadcast...`)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => {
          t.stop()
          console.log(`🚫 UserVideoGrid: Stopped track: ${t.kind}`)
        })
        localStreamRef.current = null
      }

      // Remove tracks from existing connections
      peerConnectionsRef.current.forEach(async (pc, socketId) => {
        pc.getSenders().forEach(sender => pc.removeTrack(sender))
        // Renegotiate removal
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          if (socket) socket.emit('offer', { offer, targetSocketId: socketId, roomId })
        } catch (e) {
          console.error("Error renegotiating stop", e)
        }
      })

      setIsBroadcasting(false)
      setUserStreams(prev => {
        const next = new Map(prev)
        next.delete('local')
        return next
      })
    } else {
      // Start Broadcasting
      console.log(`▶️ UserVideoGrid: Starting broadcast, requesting media...`)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        console.log(`✅ UserVideoGrid: Got media stream with ${stream.getTracks().length} tracks`)
        stream.getTracks().forEach(t => console.log(`  - ${t.kind}: ${t.label}`))
        localStreamRef.current = stream

        // Only store local stream for reference, DO NOT DISPLAY IT (as requested)
        // But we might need it for logic, just don't put it in 'renderUsers'

        // Add tracks to all existing connections
        peerConnectionsRef.current.forEach(async (pc, socketId) => {
          stream.getTracks().forEach(track => pc.addTrack(track, stream))
          // Renegotiate addition
          try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            if (socket) socket.emit('offer', { offer, targetSocketId: socketId, roomId })
          } catch (e) {
            console.error("Error renegotiating start", e)
          }
        })

        setIsBroadcasting(true)
      } catch (e) {
        console.error("Error starting broadcast", e)
        alert("Could not access camera/microphone")
      }
    }
  }

  // Listen for global control events
  useEffect(() => {
    const handleToggleRequest = () => {
      toggleBroadcast()
    }

    window.addEventListener('RequestToggleVideo', handleToggleRequest)
    // Initial sync
    window.dispatchEvent(new CustomEvent('VideoStateChanged', { detail: { enabled: isBroadcasting } }))

    return () => {
      window.removeEventListener('RequestToggleVideo', handleToggleRequest)
    }
  }, [isBroadcasting])

  // Notify global controls when broadcasting state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('VideoStateChanged', { detail: { enabled: isBroadcasting } }))
  }, [isBroadcasting])



  // UseFrame for texture updates only (proximity detection disabled)
  useFrame(() => {
    /* PROXIMITY DETECTION DISABLED - causing issues with repeated camera access
    // Proximity-based auto video join
    if (playerPosition && position) {
      const dx = playerPosition[0] - position[0]
      const dy = playerPosition[1] - position[1]
      const dz = playerPosition[2] - position[2]
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)
      
      const PROXIMITY_THRESHOLD = 15 // Auto-enable within 15 units
      
      if (distance < PROXIMITY_THRESHOLD && !isBroadcasting) {
        console.log(`📍 UserVideoGrid: Player close to TV (distance: ${distance.toFixed(2)}), auto-enabling video`)
        toggleBroadcast()
      }
    }
    */

    // Update textures
    texturesRef.current.forEach((texture, id) => {
      const video = videoElementsRef.current.get(id)
      if (texture && video && video.readyState >= 2) {
        texture.needsUpdate = true
      }
    })
  })

  // Render - Display all remote videos on a single TV screen plane
  const renderUsers = users.filter(u => u.socketId !== socket?.id && u.socketId !== 'local')

  // If there are remote users, show the first one's video on the TV screen
  // (For multiple users, we'd need a canvas composite, but for now show first user)
  const firstRemoteUser = renderUsers[0]
  const firstTexture = firstRemoteUser ? texturesRef.current.get(firstRemoteUser.socketId) : null
  const firstVideo = firstRemoteUser ? videoElementsRef.current.get(firstRemoteUser.socketId) : null
  const hasRemoteVideo = firstTexture && firstVideo && firstVideo.readyState >= 2

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Single TV Screen Plane - Shows remote participant video */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[16, 9]} />
        <meshStandardMaterial
          map={hasRemoteVideo ? firstTexture : null}
          color={hasRemoteVideo ? "#ffffff" : "#1a1a1a"}
          emissive={hasRemoteVideo ? "#555555" : "#000000"}
          emissiveIntensity={hasRemoteVideo ? 1.0 : 0}
          toneMapped={false}
        />
      </mesh>

      {/* Display name overlay if there's a remote user */}
      {firstRemoteUser && (
        <Html position={[0, 5, 0.2]} center>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            whiteSpace: 'nowrap',
            border: '2px solid rgba(255,255,255,0.3)'
          }}>
            {firstRemoteUser.userName || `User ${firstRemoteUser.socketId.slice(-4)}`}
          </div>
        </Html>
      )}
    </group>
  )
}

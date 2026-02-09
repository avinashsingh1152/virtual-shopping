// Socket.IO service for real-time communication
import io from 'socket.io-client'

if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error('❌ VITE_API_BASE_URL is required!')
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const WS_URL = API_BASE_URL.replace(/^http/, 'ws')

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.roomId = null
    this.userId = null
    this.userName = null
    this.listeners = new Map() // Store event listeners for cleanup
  }

  /**
   * Connect to Socket.IO server
   */
  connect() {
    if (this.socket?.connected) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      // Connect to Socket.IO MEETING namespace on port 3001 (same as API)
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? API_BASE_URL
        : API_BASE_URL

      const socketUrl = `${serverUrl}/meeting`
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      this.socket.on('connect', () => {
        this.isConnected = true
        resolve()
      })

      this.socket.on('disconnect', () => {
        this.isConnected = false
      })

      this.socket.on('connect_error', (error) => {
        reject(error)
      })

      this.socket.on('error', ({ message }) => {
        console.error('Socket error:', message)
      })
    })
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      // Remove all listeners
      this.listeners.forEach((handler, event) => {
        this.socket.off(event, handler)
      })
      this.listeners.clear()

      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.roomId = null
      this.userId = null
      this.userName = null
    }
  }

  /**
   * Join a room
   * @param {string} roomId - Room ID to join
   * @param {string} userId - User ID
   * @param {string} userName - User name
   * @param {Function} onJoined - Callback when joined
   * @param {Function} onRoomUsers - Callback with existing users
   * @param {Function} onUserJoined - Callback when new user joins
   * @param {Function} onUserLeft - Callback when user leaves
   */
  async joinRoom(roomId, userId, userName, {
    onJoined,
    onRoomUsers,
    onUserJoined,
    onUserLeft
  } = {}) {
    if (!this.socket || !this.isConnected) {
      await this.connect()
    }

    this.roomId = roomId
    this.userId = userId
    this.userName = userName

    // Emit join-room event
    this.socket.emit('join-room', {
      roomId,
      userId,
      userName
    })

    // Set up event listeners
    if (onJoined) {
      const handler = (data) => {
        onJoined(data)
      }
      this.socket.on('joined-room', handler)
      this.listeners.set('joined-room', handler)
    }

    if (onRoomUsers) {
      const handler = (data) => {
        onRoomUsers(data.users)
      }
      this.socket.on('room-users', handler)
      this.listeners.set('room-users', handler)
    }

    if (onUserJoined) {
      const handler = (data) => {
        onUserJoined(data)
      }
      this.socket.on('user-joined', handler)
      this.listeners.set('user-joined', handler)
    }

    if (onUserLeft) {
      const handler = (data) => {
        onUserLeft(data)
      }
      this.socket.on('user-left', handler)
      this.listeners.set('user-left', handler)
    }
  }

  /**
   * Leave the current room
   */
  leaveRoom() {
    if (this.socket && this.roomId) {
      this.socket.emit('leave-room')

      // Remove room-specific listeners
      const roomEvents = ['joined-room', 'room-users', 'user-joined', 'user-left']
      roomEvents.forEach(event => {
        const handler = this.listeners.get(event)
        if (handler) {
          this.socket.off(event, handler)
          this.listeners.delete(event)
        }
      })

      this.roomId = null
    }
  }

  /**
   * Send WebRTC offer
   * @param {RTCSessionDescriptionInit} offer - WebRTC offer
   * @param {string} targetSocketId - Target socket ID
   */
  sendOffer(offer, targetSocketId) {
    if (this.socket && this.roomId) {
      this.socket.emit('offer', {
        offer,
        targetSocketId,
        roomId: this.roomId
      })
    }
  }

  /**
   * Send WebRTC answer
   * @param {RTCSessionDescriptionInit} answer - WebRTC answer
   * @param {string} targetSocketId - Target socket ID
   */
  sendAnswer(answer, targetSocketId) {
    if (this.socket && this.roomId) {
      this.socket.emit('answer', {
        answer,
        targetSocketId,
        roomId: this.roomId
      })
    }
  }

  /**
   * Send ICE candidate
   * @param {RTCIceCandidateInit} candidate - ICE candidate
   * @param {string} targetSocketId - Target socket ID
   */
  sendIceCandidate(candidate, targetSocketId) {
    if (this.socket && this.roomId) {
      this.socket.emit('ice-candidate', {
        candidate,
        targetSocketId,
        roomId: this.roomId
      })
    }
  }

  /**
   * Listen for WebRTC offer
   * @param {Function} handler - Handler function
   */
  onOffer(handler) {
    if (this.socket) {
      this.socket.on('offer', handler)
      this.listeners.set('offer', handler)
    }
  }

  /**
   * Listen for WebRTC answer
   * @param {Function} handler - Handler function
   */
  onAnswer(handler) {
    if (this.socket) {
      this.socket.on('answer', handler)
      this.listeners.set('answer', handler)
    }
  }

  /**
   * Listen for ICE candidate
   * @param {Function} handler - Handler function
   */
  onIceCandidate(handler) {
    if (this.socket) {
      this.socket.on('ice-candidate', handler)
      this.listeners.set('ice-candidate', handler)
    }
  }

  /**
   * Toggle audio (mute/unmute)
   * @param {boolean} isMuted - Whether audio is muted
   */
  toggleAudio(isMuted) {
    if (this.socket && this.roomId) {
      this.socket.emit('toggle-audio', {
        isMuted,
        roomId: this.roomId
      })
    }
  }

  /**
   * Toggle video (on/off)
   * @param {boolean} isVideoOff - Whether video is off
   */
  toggleVideo(isVideoOff) {
    if (this.socket && this.roomId) {
      this.socket.emit('toggle-video', {
        isVideoOff,
        roomId: this.roomId
      })
    }
  }

  /**
   * Listen for user audio changes
   * @param {Function} handler - Handler function
   */
  onUserAudioChanged(handler) {
    if (this.socket) {
      this.socket.on('user-audio-changed', handler)
      this.listeners.set('user-audio-changed', handler)
    }
  }

  /**
   * Listen for user video changes
   * @param {Function} handler - Handler function
   */
  onUserVideoChanged(handler) {
    if (this.socket) {
      this.socket.on('user-video-changed', handler)
      this.listeners.set('user-video-changed', handler)
    }
  }

  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket?.id || null
  }

  /**
   * Check if connected
   */
  getIsConnected() {
    return this.isConnected && this.socket?.connected
  }
}

// Export singleton instance
export const socketService = new SocketService()

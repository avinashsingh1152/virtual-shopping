// WebRTC service for room connections with Socket.IO integration
import { socketService } from './socketService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004'

// STUN servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

class WebRTCService {
  constructor() {
    this.peers = new Map() // Map of socketId -> RTCPeerConnection
    this.iceCandidateQueue = new Map() // Map of socketId -> Array of ICE candidates to process
    this.localStream = null
    this.roomId = null
    this.userId = null
    this.userName = null
    this.onParticipantAdded = null
    this.onParticipantRemoved = null
    this.isInitiator = new Map() // Track which peer initiated the connection
  }

  /**
   * Initialize WebRTC connection for a room
   * @param {string} roomId - Room ID to join
   * @param {Function} onParticipantAdded - Callback when participant joins (receives { id, stream, audioEnabled, videoEnabled })
   * @param {Function} onParticipantRemoved - Callback when participant leaves (receives participantId)
   * @param {boolean} audioEnabled - Whether audio is enabled
   * @param {boolean} videoEnabled - Whether video is enabled
   * @param {string} creatorId - ID of the room creator
   * @param {string} userId - Current user ID
   * @param {string} userName - Current user name
   */
  async joinRoom(
    roomId,
    onParticipantAdded,
    onParticipantRemoved,
    audioEnabled = false,
    videoEnabled = false,
    creatorId = null,
    userId = null,
    userName = 'User'
  ) {
    this.roomId = roomId
    this.userId = userId || `user-${Date.now()}`
    this.userName = userName
    this.onParticipantAdded = onParticipantAdded
    this.onParticipantRemoved = onParticipantRemoved

    try {
      // Get user media (always request both, but disable tracks if needed)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      })

      // Disable tracks by default (user must manually enable)
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled
      })
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled
      })

      // Connect to Socket.IO
      await socketService.connect()

      // Set up Socket.IO event handlers
      this.setupSocketHandlers()

      // Join room via Socket.IO
      await socketService.joinRoom(
        roomId,
        this.userId,
        this.userName,
        {
          onJoined: (data) => {
            // Room joined successfully
          },
          onRoomUsers: (users) => {
            // Create peer connections for existing users
            // Use socket ID comparison to determine who initiates (avoid race condition)
            const mySocketId = socketService.getSocketId()
            users.forEach(user => {
              if (user.socketId !== mySocketId) {
                // The peer with the "lower" socket ID initiates the connection
                // This ensures only one peer creates the offer
                const shouldInitiate = mySocketId < user.socketId
                this.createPeerConnection(user.socketId, user.userId, user.userName, shouldInitiate)
              }
            })
          },
          onUserJoined: (data) => {
            // New user joined - create peer connection
            // Use socket ID comparison to determine who initiates
            const mySocketId = socketService.getSocketId()
            if (data.socketId !== mySocketId) {
              // The peer with the "lower" socket ID initiates the connection
              const shouldInitiate = mySocketId < data.socketId
              this.createPeerConnection(data.socketId, data.userId, data.userName, shouldInitiate)
            }
          },
          onUserLeft: (data) => {
            // User left - close peer connection
            this.closePeerConnection(data.socketId)
            if (onParticipantRemoved) {
              onParticipantRemoved(data.userId)
            }
          }
        }
      )

      return this.localStream
    } catch (error) {
      console.error('Error joining room:', error)

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.error('Permission denied - user did not grant camera/microphone access')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        console.error('No camera/microphone found')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        console.error('Camera/microphone is being used by another application')
      }

      throw error
    }
  }

  /**
   * Set up Socket.IO event handlers for WebRTC signaling
   */
  setupSocketHandlers() {
    // Handle incoming offer
    socketService.onOffer(async ({ offer, senderSocketId, senderUserId, senderUserName }) => {
      // When we receive an offer, we're NOT the initiator (they are)
      // Check if we already have a connection - if so, we might have been the initiator
      let peerConnection = this.peers.get(senderSocketId)
      
      // If we don't have a connection yet, create one (we're the responder, not initiator)
      if (!peerConnection) {
        peerConnection = this.createPeerConnection(senderSocketId, senderUserId, senderUserName, false)
      }
      
      try {
        // Only process offer if we're in stable state (not already processing another offer/answer)
        // If we're in have-local-offer state, it means we already sent an offer, so ignore this one
        if (peerConnection.signalingState === 'stable') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          
          socketService.sendAnswer(peerConnection.localDescription, senderSocketId)
          
          // Process any queued ICE candidates now that remote description is set
          this.processQueuedIceCandidates(senderSocketId, peerConnection)
        } else if (peerConnection.signalingState === 'have-local-offer') {
          // We already sent an offer, so we're the initiator - ignore this offer
          // The other side should respond to our offer instead
          console.warn(`Received offer but we're already the initiator for ${senderSocketId}`)
        } else {
          console.warn(`Received offer in wrong state: ${peerConnection.signalingState} for ${senderSocketId}`)
        }
      } catch (error) {
        console.error('Error handling offer:', error)
      }
    })

    // Handle incoming answer
    socketService.onAnswer(async ({ answer, senderSocketId }) => {
      const peerConnection = this.peers.get(senderSocketId)
      if (peerConnection) {
        try {
          // Only set remote description if we're in the correct state (have-local-offer)
          // This means we initiated the connection and are waiting for an answer
          if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            
            // Process any queued ICE candidates now that remote description is set
            this.processQueuedIceCandidates(senderSocketId, peerConnection)
          } else {
            // If we're not in the right state, the answer might have arrived out of order
            // or we're not the initiator. Log for debugging but don't throw.
            console.warn(`Received answer in wrong state: ${peerConnection.signalingState} for ${senderSocketId}`)
          }
        } catch (error) {
          console.error('Error handling answer:', error)
        }
      }
    })

    // Handle incoming ICE candidate
    socketService.onIceCandidate(async ({ candidate, senderSocketId }) => {
      const peerConnection = this.peers.get(senderSocketId)
      if (!peerConnection || !candidate) {
        return
      }

      try {
        // Check if remote description is set
        if (peerConnection.remoteDescription) {
          // Remote description is set, add candidate immediately
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        } else {
          // Remote description not set yet, queue the candidate
          if (!this.iceCandidateQueue.has(senderSocketId)) {
            this.iceCandidateQueue.set(senderSocketId, [])
          }
          this.iceCandidateQueue.get(senderSocketId).push(candidate)
        }
      } catch (error) {
        // If error is not about null remote description, log it
        if (!error.message.includes('remote description') && !error.message.includes('null')) {
          console.error('Error adding ICE candidate:', error)
        }
      }
    })

    // Handle user audio changes
    socketService.onUserAudioChanged(({ userId, socketId, isMuted }) => {
      if (this.onParticipantAdded) {
        // Update participant audio state
        // This would typically update the store
      }
    })

    // Handle user video changes
    socketService.onUserVideoChanged(({ userId, socketId, isVideoOff }) => {
      if (this.onParticipantAdded) {
        // Update participant video state
        // This would typically update the store
      }
    })
  }

  /**
   * Create or get existing peer connection
   */
  getOrCreatePeerConnection(socketId, userId, userName, isInitiator = false) {
    if (this.peers.has(socketId)) {
      return this.peers.get(socketId)
    }
    return this.createPeerConnection(socketId, userId, userName, isInitiator)
  }

  /**
   * Create a new peer connection
   * @param {string} socketId - Target socket ID
   * @param {string} userId - Target user ID
   * @param {string} userName - Target user name
   * @param {boolean} isInitiator - Whether we initiate the connection
   */
  createPeerConnection(socketId, userId, userName, isInitiator = false) {
    // Don't create duplicate connections
    if (this.peers.has(socketId)) {
      return this.peers.get(socketId)
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    })

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendIceCandidate(event.candidate, socketId)
      }
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0]
      if (remoteStream && this.onParticipantAdded) {
        // Determine audio/video state from tracks
        const audioTracks = remoteStream.getAudioTracks()
        const videoTracks = remoteStream.getVideoTracks()
        const audioEnabled = audioTracks.length > 0 && audioTracks[0].enabled
        const videoEnabled = videoTracks.length > 0 && videoTracks[0].enabled

        this.onParticipantAdded({
          id: userId, // Use userId as the participant ID
          userId: userId, // Also include userId field for compatibility
          socketId: socketId,
          stream: remoteStream,
          audioEnabled,
          videoEnabled,
          userName: userName || `User ${userId.slice(-4)}` // Use provided userName or generate one
        })
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        this.closePeerConnection(socketId)
      }
    }

    this.peers.set(socketId, peerConnection)
    this.isInitiator.set(socketId, isInitiator)

    // If we're the initiator, create and send offer
    if (isInitiator) {
      this.createOffer(socketId)
    }

    return peerConnection
  }

  /**
   * Create and send WebRTC offer
   */
  async createOffer(socketId) {
    const peerConnection = this.peers.get(socketId)
    if (!peerConnection) return

    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      socketService.sendOffer(peerConnection.localDescription, socketId)
    } catch (error) {
      console.error('Error creating offer:', error)
    }
  }

  /**
   * Process queued ICE candidates for a peer connection
   */
  async processQueuedIceCandidates(socketId, peerConnection) {
    const queue = this.iceCandidateQueue.get(socketId)
    if (!queue || queue.length === 0) {
      return
    }

    // Process all queued candidates
    for (const candidate of queue) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        // Ignore errors for queued candidates that might be duplicates or invalid
        if (!error.message.includes('duplicate') && !error.message.includes('InvalidStateError')) {
          console.error('Error processing queued ICE candidate:', error)
        }
      }
    }

    // Clear the queue
    this.iceCandidateQueue.delete(socketId)
  }

  /**
   * Process queued ICE candidates for a peer connection
   */
  async processQueuedIceCandidates(socketId, peerConnection) {
    const queue = this.iceCandidateQueue.get(socketId)
    if (!queue || queue.length === 0) {
      return
    }

    // Process all queued candidates
    for (const candidate of queue) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        // Ignore errors for queued candidates that might be duplicates or invalid
        if (!error.message.includes('duplicate') && !error.message.includes('InvalidStateError')) {
          console.error('Error processing queued ICE candidate:', error)
        }
      }
    }

    // Clear the queue
    this.iceCandidateQueue.delete(socketId)
  }

  /**
   * Close peer connection
   */
  closePeerConnection(socketId) {
    const peerConnection = this.peers.get(socketId)
    if (peerConnection) {
      peerConnection.close()
      this.peers.delete(socketId)
      this.isInitiator.delete(socketId)
      this.iceCandidateQueue.delete(socketId) // Clear any queued candidates
    }
  }

  /**
   * Leave the current room
   */
  leaveRoom() {
    // Leave room via Socket.IO
    if (this.roomId) {
      socketService.leaveRoom()
    }

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // Close all peer connections
    this.peers.forEach(peer => peer.close())
    this.peers.clear()
    this.isInitiator.clear()
    this.iceCandidateQueue.clear() // Clear all queued ICE candidates

    // Disconnect socket
    socketService.disconnect()

    this.roomId = null
    this.userId = null
    this.userName = null
  }

  /**
   * Toggle audio track and notify via Socket.IO
   */
  toggleAudio() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks()
      const newState = audioTracks.length > 0 ? !audioTracks[0].enabled : false
      
      audioTracks.forEach(track => {
        track.enabled = newState
      })

      // Update tracks in all peer connections
      this.peers.forEach((peerConnection, socketId) => {
        const senders = peerConnection.getSenders()
        const audioSender = senders.find(sender => 
          sender.track && sender.track.kind === 'audio'
        )
        if (audioSender && audioTracks.length > 0) {
          // Replace the track to ensure it's updated
          audioSender.replaceTrack(audioTracks[0]).catch(error => {
            console.error('Error replacing audio track:', error)
          })
        }
      })

      // Notify via Socket.IO
      if (this.roomId) {
        socketService.toggleAudio(!newState) // isMuted = !enabled
      }
    }
  }

  /**
   * Toggle video track and notify via Socket.IO
   */
  toggleVideo() {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks()
      const newState = videoTracks.length > 0 ? !videoTracks[0].enabled : false
      
      videoTracks.forEach(track => {
        track.enabled = newState
      })

      // Update tracks in all peer connections
      this.peers.forEach((peerConnection, socketId) => {
        const senders = peerConnection.getSenders()
        const videoSender = senders.find(sender => 
          sender.track && sender.track.kind === 'video'
        )
        if (videoSender && videoTracks.length > 0) {
          // Replace the track to ensure it's updated
          videoSender.replaceTrack(videoTracks[0]).catch(error => {
            console.error('Error replacing video track:', error)
          })
        }
      })

      // Notify via Socket.IO
      if (this.roomId) {
        socketService.toggleVideo(!newState) // isVideoOff = !enabled
      }
    }
  }

  /**
   * Get local stream
   */
  getLocalStream() {
    return this.localStream
  }

  /**
   * Get current user ID
   */
  getUserId() {
    return this.userId
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService()

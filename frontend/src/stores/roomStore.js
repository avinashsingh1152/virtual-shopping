import { create } from 'zustand'
import { webrtcService } from '../services/webrtc'

export const useRoomStore = create((set, get) => ({
  currentRoom: null,
  isInRoom: false,
  roomCreatorId: null, // ID of the person who created the room
  creatorStream: null, // Video stream of the room creator (received via WebRTC)
  currentUserId: null, // Current user's ID (set when app initializes)
  channelActive: false, // Whether the video channel is active
  roomActive: false, // Whether the room is active
  participants: [], // Array of { id, stream, audioEnabled, videoEnabled }
  localStream: null,
  audioEnabled: false,
  videoEnabled: false,
  
  setCurrentUserId: (userId) => {
    set({ currentUserId: userId })
  },
  
  joinRoom: (roomId, category, creatorId = null, channelActive = false, roomActive = true) => {
    set({ 
      currentRoom: { roomId, category },
      isInRoom: true,
      roomCreatorId: creatorId,
      channelActive,
      roomActive,
      audioEnabled: false, // Default: audio off
      videoEnabled: false, // Default: video off
    })
  },
  
  setChannelStatus: (channelActive, roomActive = null) => {
    set(state => ({
      channelActive,
      roomActive: roomActive !== null ? roomActive : state.roomActive
    }))
  },
  
  leaveRoom: () => {
    // Leave room via webrtc service (stops streams and connections)
    webrtcService.leaveRoom()
    
    set({ 
      currentRoom: null,
      isInRoom: false,
      roomCreatorId: null,
      creatorStream: null,
      channelActive: false,
      roomActive: false,
      participants: [],
      localStream: null,
      audioEnabled: false,
      videoEnabled: false,
    })
  },
  
  setCreatorStream: (stream) => {
    set({ creatorStream: stream })
  },
  
  setLocalStream: (stream) => {
    set({ localStream: stream })
  },
  
  toggleAudio: () => {
    const { localStream, audioEnabled } = get()
    const newState = !audioEnabled
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = newState
      })
    }
    // Update webrtc service (will notify via Socket.IO)
    webrtcService.toggleAudio()
    set({ audioEnabled: newState })
  },
  
  toggleVideo: async () => {
    const { localStream, videoEnabled } = get()
    const newState = !videoEnabled
    
    // If enabling video and no local stream, request permission
    if (newState && !localStream) {
      try {
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false, // Only request video for now
          video: true
        })
        
        // Get existing audio tracks if any
        const existingAudioTracks = localStream?.getAudioTracks() || []
        
        // Create new stream with video + existing audio
        const newStream = new MediaStream()
        stream.getVideoTracks().forEach(track => newStream.addTrack(track))
        existingAudioTracks.forEach(track => newStream.addTrack(track))
        
        set({ localStream: newStream })
        webrtcService.localStream = newStream
        
        // Enable video tracks
        newStream.getVideoTracks().forEach(track => track.enabled = true)
        set({ videoEnabled: true })
        return
      } catch (error) {
        console.error('Error requesting video permission:', error)
        alert('Camera permission denied. Please allow camera access to enable video.')
        return
      }
    }
    
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = newState
      })
    }
    // Update webrtc service (will notify via Socket.IO)
    webrtcService.toggleVideo()
    set({ videoEnabled: newState })
  },
  
  addParticipant: (participant) => {
    set(state => ({
      participants: [...state.participants, participant]
    }))
  },
  
  removeParticipant: (participantId) => {
    set(state => ({
      participants: state.participants.filter(p => p.id !== participantId)
    }))
  },
  
  updateParticipant: (participantId, updates) => {
    set(state => ({
      participants: state.participants.map(p => 
        p.id === participantId ? { ...p, ...updates } : p
      )
    }))
  },
}))

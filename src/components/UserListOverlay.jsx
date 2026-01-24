import React, { useEffect, useState } from 'react'
import { getAllRoomsFromRedis } from '../services/api'
import io from 'socket.io-client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004'

// Global state for user list
let userListState = {
  users: [],
  roomId: null,
  connectionStatus: 'disconnected',
}

export function UserListOverlay() {
  const [state, setState] = useState({
    users: [],
    roomId: null,
    connectionStatus: 'disconnected',
  })
  
  useEffect(() => {
    let socketInstance = null
    
    async function connect() {
      try {
        const roomsData = await getAllRoomsFromRedis()
        if (roomsData.success && roomsData.rooms && roomsData.rooms.length > 0) {
          const firstRoom = roomsData.rooms[0]
          const channelId = firstRoom.roomId
          
          const userId = localStorage.getItem('userId') || `user-${Date.now()}`
          localStorage.setItem('userId', userId)
          
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
            socketInstance.emit('join-room', {
              roomId: channelId,
              userId: userId,
              userName: `User ${userId.slice(-4)}`,
              productCategory: firstRoom.productCategory || 'General'
            })
            userListState.connectionStatus = 'connected'
            setState(prev => ({ ...prev, connectionStatus: 'connected', roomId: channelId }))
          })
          
          socketInstance.on('room-users', (data) => {
            if (data && data.users) {
              userListState.users = data.users
              userListState.roomId = channelId
              setState(prev => ({ ...prev, users: data.users, roomId: channelId }))
            }
          })
          
          socketInstance.on('user-joined', (data) => {
            if (data) {
              setState(prev => {
                const exists = prev.users.find(u => u.userId === data.userId || u.socketId === data.socketId)
                if (!exists) {
                  const newUsers = [...prev.users, {
                    userId: data.userId,
                    userName: data.userName,
                    socketId: data.socketId,
                    role: data.role || 'participant'
                  }]
                  userListState.users = newUsers
                  return { ...prev, users: newUsers }
                }
                return prev
              })
            }
          })
          
          socketInstance.on('user-left', (data) => {
            setState(prev => {
              const newUsers = prev.users.filter(u => u.userId !== data.userId)
              userListState.users = newUsers
              return { ...prev, users: newUsers }
            })
          })
          
          socketInstance.on('user-audio-changed', (data) => {
            setState(prev => ({
              ...prev,
              users: prev.users.map(u => 
                u.userId === data.userId || u.socketId === data.socketId
                  ? { ...u, isMuted: data.isMuted }
                  : u
              )
            }))
          })
          
          socketInstance.on('user-video-changed', (data) => {
            setState(prev => ({
              ...prev,
              users: prev.users.map(u => 
                u.userId === data.userId || u.socketId === data.socketId
                  ? { ...u, isVideoOff: data.isVideoOff }
                  : u
              )
            }))
          })
        }
      } catch (error) {
        // Error connecting
      }
    }
    
    connect()
    
    // Update state periodically
    const interval = setInterval(() => {
      const currentState = getUserListState()
      setState(currentState)
    }, 500)
    
    return () => {
      clearInterval(interval)
      if (socketInstance) {
        socketInstance.emit('leave-room')
        socketInstance.disconnect()
      }
    }
  }, [])
  
  if (state.users.length === 0) {
    return null
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: '15px',
      borderRadius: '10px',
      color: 'white',
      zIndex: 1000,
      minWidth: '250px',
      maxHeight: '400px',
      overflowY: 'auto',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ 
        fontSize: '16px', 
        fontWeight: 'bold', 
        marginBottom: '10px',
        borderBottom: '1px solid #444',
        paddingBottom: '8px'
      }}>
        👥 Participants ({state.users.length})
      </div>
      
      <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '10px' }}>
        Room: {state.roomId || 'None'}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {state.users.map((user, index) => (
          <div 
            key={user.userId || user.socketId || index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '5px',
              fontSize: '13px'
            }}
          >
            {/* Status indicator */}
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: user.isVideoOff !== false ? '#666' : '#4CAF50',
              flexShrink: 0
            }} />
            
            {/* User name */}
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.userName || `User ${(user.userId || '').slice(-4)}`}
            </div>
            
            {/* Audio/Video status icons */}
            <div style={{ display: 'flex', gap: '5px', fontSize: '12px' }}>
              {user.isMuted !== false ? '🔇' : '🔊'}
              {user.isVideoOff !== false ? '📷' : '📹'}
            </div>
            
            {/* Role badge */}
            {user.role === 'owner' && (
              <div style={{
                fontSize: '10px',
                backgroundColor: '#FFA500',
                color: '#000',
                padding: '2px 6px',
                borderRadius: '3px',
                fontWeight: 'bold'
              }}>
                Owner
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Export function to get user list state
export function getUserListState() {
  return {
    users: userListState.users || [],
    roomId: userListState.roomId,
    connectionStatus: userListState.connectionStatus,
  }
}

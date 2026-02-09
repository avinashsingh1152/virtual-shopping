import React from 'react'
import { useRoomStore } from '../stores/roomStore'

/**
 * Channel Status Indicator - Shows green/red indicator at top of screen
 */
export default function ChannelStatusIndicator() {
  const { isInRoom, channelActive, currentRoom } = useRoomStore()
  
  if (!isInRoom || !currentRoom) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '10px 20px',
      borderRadius: '10px',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Status indicator circle */}
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: channelActive ? '#00ff00' : '#ff0000',
        boxShadow: channelActive 
          ? '0 0 10px #00ff00, 0 0 20px #00ff00' 
          : '0 0 10px #ff0000, 0 0 20px #ff0000',
        animation: channelActive ? 'pulse 2s infinite' : 'none'
      }} />
      
      {/* Status text */}
      <span style={{
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {channelActive ? 'Channel Active' : 'Channel Inactive'}
      </span>
      
      {/* Room info */}
      <span style={{
        color: '#cccccc',
        fontSize: '12px',
        marginLeft: '10px'
      }}>
        {currentRoom.roomId}
      </span>
      
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
}

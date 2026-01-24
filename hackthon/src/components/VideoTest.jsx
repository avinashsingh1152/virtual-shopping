import React, { useEffect, useRef } from 'react'
import { useRoomStore } from '../stores/roomStore'

/**
 * Test component to verify video stream is working
 * This shows a regular HTML video element for debugging
 */
export default function VideoTest() {
  const { localStream, videoEnabled, isInRoom } = useRoomStore()
  const videoRef = useRef(null)
  
  useEffect(() => {
    if (videoRef.current && localStream && videoEnabled) {
      videoRef.current.srcObject = localStream
      videoRef.current.play().catch(err => {
        console.error('Test video play error:', err)
      })
    }
  }, [localStream, videoEnabled])
  
  if (!isInRoom || !videoEnabled) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '200px',
      height: '150px',
      zIndex: 3000,
      background: '#000',
      border: '2px solid #00ff00'
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '5px',
        color: 'white',
        fontSize: '10px',
        background: 'rgba(0,0,0,0.7)',
        padding: '2px 5px'
      }}>
        Test Video
      </div>
    </div>
  )
}

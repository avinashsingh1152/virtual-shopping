import React, { useState, useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'

export default function MouseLookHint() {
  const [showHint, setShowHint] = useState(false) // Start hidden, only show after user interaction
  const [isLocked, setIsLocked] = useState(false)
  const cameraMode = usePlayerStore((state) => state.cameraMode)

  useEffect(() => {
    // Only show hint after a short delay to prevent showing on initial load
    const showTimer = setTimeout(() => {
      const locked = document.pointerLockElement !== null
      if (!locked) {
        const enableMouseLook = cameraMode === 'first-person' || cameraMode === 'third-person'
        if (enableMouseLook) {
          setShowHint(true)
        }
      }
    }, 1000) // Wait 1 second before showing hint

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement !== null
      setIsLocked(locked)
      const enableMouseLook = cameraMode === 'first-person' || cameraMode === 'third-person'
      setShowHint(!locked && enableMouseLook)
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange)
    document.addEventListener('mozpointerlockchange', handlePointerLockChange)
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange)

    return () => {
      clearTimeout(showTimer)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('mozpointerlockchange', handlePointerLockChange)
      document.removeEventListener('webkitpointerlockchange', handlePointerLockChange)
    }
  }, [cameraMode])

  // Only show hint in first-person or third-person mode
  const enableMouseLook = cameraMode === 'first-person' || cameraMode === 'third-person'
  if (!showHint || !enableMouseLook) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '20px 40px',
        borderRadius: '10px',
        border: '2px solid #4facfe',
        zIndex: 2000,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
        Click to Enable Mouse Look
      </div>
      <div style={{ fontSize: '14px', opacity: 0.8 }}>
        Move your mouse to rotate your view 360°
        <br />
        Use WASD to move, Space to jump
        <br />
        Press ESC to unlock mouse
      </div>
    </div>
  )
}

import React from 'react'
import { usePlayerStore } from '../stores/playerStore'

export default function CameraToggleButton() {
  const cameraMode = usePlayerStore((state) => state.cameraMode)
  const toggleCameraMode = usePlayerStore((state) => state.toggleCameraMode)

  const getModeName = () => {
    switch (cameraMode) {
      case 'first-person':
        return 'First Person'
      case 'third-person':
        return 'Third Person'
      default:
        return 'First Person'
    }
  }

  const getNextMode = () => {
    switch (cameraMode) {
      case 'first-person':
        return 'Third Person'
      case 'third-person':
        return 'First Person'
      default:
        return 'Third Person'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={toggleCameraMode}
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: '2px solid #4facfe',
          borderRadius: '8px',
          padding: '12px 20px',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(79, 172, 254, 0.3)'
          e.target.style.borderColor = '#00f2fe'
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(0, 0, 0, 0.8)'
          e.target.style.borderColor = '#4facfe'
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          Current: {getModeName()}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          Click to switch to {getNextMode()}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
          (or press V)
        </div>
      </button>
    </div>
  )
}

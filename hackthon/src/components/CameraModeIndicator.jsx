import React from 'react'
import { usePlayerStore } from '../stores/playerStore'

export default function CameraModeIndicator() {
  const cameraMode = usePlayerStore((state) => state.cameraMode)

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        zIndex: 1000,
        border: '2px solid #4facfe',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        Camera: {
          cameraMode === 'first-person' ? 'First Person' :
          cameraMode === 'third-person' ? 'Third Person' :
          'Top View'
        }
      </div>
      <div style={{ fontSize: '12px', opacity: 0.8 }}>
        Press V to cycle views
      </div>
    </div>
  )
}

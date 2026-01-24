import React from 'react'
import { usePlayerStore } from '../stores/playerStore'

export default function MovementHint() {
  const cameraMode = usePlayerStore((state) => state.cameraMode)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '12px 18px',
        borderRadius: '8px',
        fontFamily: 'sans-serif',
        fontSize: '13px',
        zIndex: 1000,
        border: '2px solid #4facfe',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Controls:</div>
      <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
        <div>WASD / Arrow Keys - Move</div>
        <div>Space - Jump</div>
        <div>Mouse - Look around (click to enable)</div>
        <div>Move mouse up/down - Look at roof/floor</div>
        <div>V - Switch camera view</div>
      </div>
    </div>
  )
}

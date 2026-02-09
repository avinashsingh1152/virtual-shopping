import React from 'react'
import { usePlayerStore } from '../stores/playerStore'

export default function DirectionIndicator() {
  const rotation = usePlayerStore((state) => state.rotation)
  const velocity = usePlayerStore((state) => state.velocity)

  // Convert rotation (radians) to compass direction
  // In Three.js: 0 = North (positive Z), π/2 = East (positive X), π = South (negative Z), -π/2 = West (negative X)
  const getDirection = (rot) => {
    // Normalize rotation to 0-2π range
    let normalizedRot = ((rot % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI)
    
    // Convert to degrees for easier calculation
    const degrees = (normalizedRot * 180) / Math.PI
    
    // Determine direction based on angle
    // North: 315-45 degrees (or -45 to 45)
    // East: 45-135 degrees
    // South: 135-225 degrees
    // West: 225-315 degrees
    
    if (degrees >= 315 || degrees < 45) return 'North'
    if (degrees >= 45 && degrees < 135) return 'East'
    if (degrees >= 135 && degrees < 225) return 'South'
    if (degrees >= 225 && degrees < 315) return 'West'
    
    return 'North' // Default
  }

  // Check if player is moving
  const isMoving = Math.abs(velocity[0]) > 0.01 || Math.abs(velocity[2]) > 0.01
  
  const currentDirection = getDirection(rotation)

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '12px 18px',
        borderRadius: '8px',
        fontFamily: 'sans-serif',
        fontSize: '16px',
        zIndex: 1000,
        border: '2px solid #4facfe',
        minWidth: '120px',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '18px' }}>
        Direction: <span style={{ color: '#4facfe' }}>{currentDirection}</span>
      </div>
      <div style={{ fontSize: '12px', opacity: 0.8 }}>
        {isMoving ? 'Moving' : 'Stationary'}
      </div>
      <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '5px' }}>
        Facing: {currentDirection}
      </div>
    </div>
  )
}

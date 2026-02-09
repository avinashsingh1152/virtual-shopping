import React, { useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { usePlayerStore } from '../stores/playerStore'

export default function ShopEntranceHint({ shopPosition, shopName }) {
  const [showHint, setShowHint] = useState(false)
  const playerPosition = usePlayerStore((state) => state.position)
  const isInsideShop = usePlayerStore((state) => state.isInsideShop)

  useFrame(() => {
    if (isInsideShop) {
      setShowHint(false)
      return
    }

    const [px, py, pz] = playerPosition
    const [sx, sy, sz] = shopPosition

    // Check if player is near the entrance
    const distanceToEntrance = Math.sqrt(
      Math.pow(px - sx, 2) + 
      Math.pow(pz - (sz - 1.5), 2)
    )

    setShowHint(distanceToEntrance < 1.5 && py >= 0 && py <= 3)
  })

  if (!showHint) return null

  return (
    <Html position={[shopPosition[0], shopPosition[1] + 3, shopPosition[2] - 1.5]} center>
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          border: '2px solid #4facfe',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        Press W to enter {shopName}
      </div>
    </Html>
  )
}

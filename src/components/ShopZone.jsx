import React, { useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlayerStore } from '../stores/playerStore'
import ShopZoneUI from './ShopZoneUI'

export default function ShopZone({ position = [5, 0, 5] }) {
  const [isInside, setIsInside] = useState(false)
  const playerPosition = usePlayerStore((state) => state.position)
  const zoneSize = 3 // 3x3x3 box

  useFrame(() => {
    const [px, py, pz] = playerPosition
    const [zx, zy, zz] = position

    const halfSize = zoneSize / 2
    const inside =
      px >= zx - halfSize &&
      px <= zx + halfSize &&
      py >= zy - halfSize &&
      py <= zy + halfSize &&
      pz >= zz - halfSize &&
      pz <= zz + halfSize

    if (inside !== isInside) {
      setIsInside(inside)
    }
  })

  return (
    <>
      {/* Zone indicator ring */}
      <mesh position={[position[0], 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zoneSize * 0.4, zoneSize * 0.5, 32]} />
        <meshStandardMaterial
          color={isInside ? '#00ff00' : '#4facfe'}
          transparent
          opacity={0.6}
          emissive={isInside ? '#00ff00' : '#4facfe'}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* UI Overlay */}
      {isInside && <ShopZoneUI />}
    </>
  )
}

import React, { useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlayerStore } from '../stores/playerStore'
import ShopInterior from './ShopInterior'

export default function ShopEntrance({ shopPosition, shopName, shopColor, onExit }) {
  const [isInside, setIsInside] = useState(false)
  const playerPosition = usePlayerStore((state) => state.position)
  const isInsideShop = usePlayerStore((state) => state.isInsideShop)
  const currentShop = usePlayerStore((state) => state.currentShop)

  useFrame(() => {
    const [px, py, pz] = playerPosition
    const [sx, sy, sz] = shopPosition

    // Check if player is near the entrance (front of shop, facing negative Z)
    const distanceToEntrance = Math.sqrt(
      Math.pow(px - sx, 2) + 
      Math.pow(pz - (sz - 1.5), 2)
    )

    // Check if player is at the right height
    const heightCheck = py >= 0 && py <= 3

      // Open shop - player enters when inside shop bounds (no door needed)
      // Shop is 48x48, so check if player is within shop area
      const shopHalfSize = 24 // Half of 48
      const insideShopX = Math.abs(px - sx) < shopHalfSize
      const insideShopZ = Math.abs(pz - sz) < shopHalfSize
      
      if (insideShopX && insideShopZ && heightCheck && !isInsideShop) {
        setIsInside(true)
        usePlayerStore.setState({ 
          isInsideShop: true,
          currentShop: shopName
        })
      }

    // Check if player exits shop (leaves shop bounds)
    if (isInsideShop && currentShop === shopName) {
      const shopHalfSize = 24 // Half of 48
      const insideShopX = Math.abs(px - sx) < shopHalfSize
      const insideShopZ = Math.abs(pz - sz) < shopHalfSize
      
      // Player exits when outside shop bounds
      if (!insideShopX || !insideShopZ) {
        setIsInside(false)
        usePlayerStore.setState({ 
          isInsideShop: false,
          currentShop: null
        })
        if (onExit) onExit()
      }
    }
  })

  // Sync with store state
  useEffect(() => {
    if (isInsideShop && currentShop === shopName) {
      setIsInside(true)
    } else {
      setIsInside(false)
    }
  }, [isInsideShop, currentShop, shopName])

  if (!isInside) return null

  return (
    <group position={shopPosition}>
      <ShopInterior shopName={shopName} shopColor={shopColor} />
    </group>
  )
}

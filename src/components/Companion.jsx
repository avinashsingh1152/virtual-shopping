import React, { useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { usePlayerStore } from '../stores/playerStore'
import * as THREE from 'three'

// Simple companion avatar (fallback if model doesn't load)
function SimpleCompanionAvatar() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.5, 1, 0.4]} />
        <meshStandardMaterial color="#e24a4a" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.4, 0.9, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color="#e24a4a" />
      </mesh>
      <mesh position={[0.4, 0.9, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color="#e24a4a" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0.15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
    </group>
  )
}

// Companion Avatar Loader - Loads 3D model
function CompanionAvatarLoader({ modelUrl }) {
  if (!modelUrl) {
    return <SimpleCompanionAvatar />
  }

  try {
    const { scene } = useGLTF(modelUrl)
    
    React.useEffect(() => {
      if (scene) {
        scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        
        // Scale the model to appropriate size
        const box = new THREE.Box3().setFromObject(scene)
        const size = box.getSize(new THREE.Vector3())
        const maxSize = Math.max(size.x, size.y, size.z)
        const scale = maxSize > 0 ? 1.8 / maxSize : 1 // Scale to ~1.8 units tall
        scene.scale.set(scale, scale, scale)
      }
    }, [scene])
    
    if (scene) {
      return <primitive object={scene.clone()} />
    }
  } catch (e) {
    console.warn('Failed to load companion avatar model, using fallback:', e)
  }
  
  return <SimpleCompanionAvatar />
}

// Companion Component - Follows the player
export default function Companion() {
  const companionRef = useRef()
  const playerPosition = usePlayerStore((state) => state.position)
  const playerRotation = usePlayerStore((state) => state.rotation)
  const playerVelocity = usePlayerStore((state) => state.velocity)
  
  // Companion follows behind and slightly to the side
  const followDistance = 2.5 // Distance behind player
  const sideOffset = 1.0 // Side offset (to the right)
  const followSpeed = 0.15 // How fast companion follows (smoothing factor)
  
  // Free companion avatar model URL
  // Option 1: Use a free avatar from Mixamo (download and host yourself)
  // Option 2: Create one at Ready Player Me: https://readyplayer.me/
  // Option 3: Use a free model from CGTrader or Free3D
  // Option 4: Place a GLB file in /public/models/companion/companion.glb
  
  // For now, using a simple approach - you can download a free avatar and place it locally:
  // 1. Go to https://www.mixamo.com/ (free, requires Adobe account)
  // 2. Download a character as FBX
  // 3. Convert to GLB using Blender or online converter
  // 4. Place in /public/models/companion/companion.glb
  // 5. Update this line: const companionModelUrl = '/models/companion/companion.glb'
  
  // Or use Ready Player Me:
  // 1. Go to https://readyplayer.me/
  // 2. Create your avatar
  // 3. Copy the GLB URL from the dashboard
  // 4. Paste it here
  
  // After converting FBX to GLB, place the file in /public/models/companion/companion.glb
  // Then uncomment the line below:
  // const companionModelUrl = '/models/companion/companion.glb'
  
  const companionModelUrl = null // Set to '/models/companion/companion.glb' after conversion
  
  useFrame(() => {
    if (!companionRef.current) return
    
    const [playerX, playerY, playerZ] = playerPosition
    
    // Calculate target position (behind and to the right of player)
    const targetX = playerX - Math.sin(playerRotation) * followDistance + Math.cos(playerRotation) * sideOffset
    const targetZ = playerZ - Math.cos(playerRotation) * followDistance - Math.sin(playerRotation) * sideOffset
    const targetY = playerY // Same height as player
    
    // Smoothly move companion toward target position
    const currentPos = companionRef.current.position
    currentPos.x += (targetX - currentPos.x) * followSpeed
    currentPos.y += (targetY - currentPos.y) * followSpeed
    currentPos.z += (targetZ - currentPos.z) * followSpeed
    
    // Make companion face the same direction as player (with slight delay for natural look)
    const targetRotation = playerRotation
    const currentRotation = companionRef.current.rotation.y
    let rotationDiff = targetRotation - currentRotation
    
    // Normalize rotation difference to shortest path
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI
    
    companionRef.current.rotation.y += rotationDiff * followSpeed
    
    // Optional: Add slight bobbing animation when moving
    const isMoving = Math.abs(playerVelocity[0]) > 0.01 || Math.abs(playerVelocity[2]) > 0.01
    if (isMoving) {
      const bobAmount = 0.05
      const bobSpeed = 0.1
      companionRef.current.position.y = targetY + Math.sin(Date.now() * bobSpeed) * bobAmount
    }
  })
  
  return (
    <group ref={companionRef} position={[0, 0, 0]}>
      <Suspense fallback={<SimpleCompanionAvatar />}>
        <CompanionAvatarLoader modelUrl={companionModelUrl} />
      </Suspense>
    </group>
  )
}

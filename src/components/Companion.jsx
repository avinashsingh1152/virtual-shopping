import React, { useRef, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { usePlayerStore } from '../stores/playerStore'
import * as THREE from 'three'

// Flipkart Mascot - Cute anime-style 2D sprite that always faces camera
function FlipkartMascot({ camera }) {
  const meshRef = useRef()
  const mascotTexture = useTexture('/flipkar-sales-person.png')
  
  // Make the sprite always face the camera (billboard effect)
  useFrame(() => {
    if (meshRef.current && camera) {
      meshRef.current.lookAt(camera.position)
    }
  })
  
  // Configure texture for transparency
  React.useEffect(() => {
    if (mascotTexture) {
      mascotTexture.flipY = false // Don't flip the texture
    }
  }, [mascotTexture])
  
  return (
    <mesh ref={meshRef} position={[0, 1.5, 0]}>
      <planeGeometry args={[2, 2.5]} /> {/* Width and height for cute anime size */}
      <meshStandardMaterial 
        map={mascotTexture}
        transparent={true}
        alphaTest={0.1} // Remove transparent pixels
        side={THREE.DoubleSide}
        color="#ffffff" // White color to preserve natural image colors
      />
    </mesh>
  )
}

// Companion Avatar Loader - Uses Flipkart mascot or 3D model
function CompanionAvatarLoader({ modelUrl, camera }) {
  // Always use Flipkart mascot for cute anime style
  return (
    <Suspense fallback={
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[2, 2.5]} />
        <meshStandardMaterial color="#ffff00" transparent opacity={0.5} />
      </mesh>
    }>
      <FlipkartMascot camera={camera} />
    </Suspense>
  )
  
  // Keep 3D model loading as fallback option for future use
  /*
  if (!modelUrl) {
    return (
      <Suspense fallback={
        <mesh position={[0, 1.5, 0]}>
          <planeGeometry args={[2, 2.5]} />
          <meshStandardMaterial color="#ffff00" transparent opacity={0.5} />
        </mesh>
      }>
        <FlipkartMascot camera={camera} />
      </Suspense>
    )
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
    console.warn('Failed to load companion avatar model, using mascot:', e)
  }
  
  return (
    <Suspense fallback={
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[2, 2.5]} />
        <meshStandardMaterial color="#ffff00" transparent opacity={0.5} />
      </mesh>
    }>
      <FlipkartMascot camera={camera} />
    </Suspense>
  )
  */
}

// Companion Component - Follows the player
export default function Companion() {
  const companionRef = useRef()
  const { camera } = useThree()
  const playerPosition = usePlayerStore((state) => state.position)
  const playerRotation = usePlayerStore((state) => state.rotation)
  const playerVelocity = usePlayerStore((state) => state.velocity)
  const cameraMode = usePlayerStore((state) => state.cameraMode)
  
  // Position Sales Person in front of camera view, on the right side
  // Distance in front of camera
  const forwardDistance = 5.0
  // Distance to the right side
  const rightDistance = 4.0
  // Smooth follow speed - reduced to prevent vibration
  const followSpeed = 0.1
  
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
    if (!companionRef.current || !camera) return
    
    // Get camera's forward direction and right direction
    const cameraForward = new THREE.Vector3()
    camera.getWorldDirection(cameraForward)
    
    const cameraRight = new THREE.Vector3()
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0)
    cameraRight.normalize()
    
    // Calculate target position: in front of camera, to the right side
    const targetPosition = new THREE.Vector3()
    targetPosition.copy(camera.position)
    targetPosition.addScaledVector(cameraForward, forwardDistance) // Move forward
    targetPosition.addScaledVector(cameraRight, rightDistance) // Move to the right
    
    // Use smooth lerp to prevent vibration
    const currentPos = companionRef.current.position
    currentPos.lerp(targetPosition, followSpeed)
    
    // Make companion face towards the camera (look at player)
    companionRef.current.lookAt(camera.position)
    
    // Optional: Add slight bobbing animation only when player is moving
    const isMoving = Math.abs(playerVelocity[0]) > 0.01 || Math.abs(playerVelocity[2]) > 0.01
    if (isMoving) {
      const bobAmount = 0.03 // Reduced bobbing
      const bobSpeed = 0.08 // Slower bobbing
      const baseY = targetPosition.y
      currentPos.y = baseY + Math.sin(Date.now() * bobSpeed) * bobAmount
    } else {
      // When not moving, keep Y position stable - use manual lerp
      currentPos.y += (targetPosition.y - currentPos.y) * followSpeed
    }
  })
  
  // Initial position - will be updated by useFrame
  const [px, py, pz] = playerPosition
  const initialPos = [px + 4, py, pz - 5]

  return (
    <group ref={companionRef} position={initialPos}>
      <Suspense fallback={
        <mesh position={[0, 1.5, 0]}>
          <planeGeometry args={[2, 2.5]} />
          <meshStandardMaterial color="#ffff00" transparent opacity={0.5} />
        </mesh>
      }>
        <CompanionAvatarLoader modelUrl={companionModelUrl} camera={camera} />
      </Suspense>
    </group>
  )
}

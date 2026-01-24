import React, { useRef, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Other Player Avatar - Image sprite for remote players
function OtherPlayerAvatar({ position, rotation, playerId }) {
  const meshRef = useRef()
  const groupRef = useRef()
  const { camera } = useThree()
  const avatarTexture = useTexture('/avatar-players.png')
  
  // Image dimensions
  const imageHeight = 2.5
  const imageWidth = 2
  
  // Position: X and Z from player position, Y is half the image height so bottom is at ground level
  // The mesh center should be at Y = imageHeight/2 = 1.25 so bottom is at Y=0
  const groundPosition = [position[0] || 0, 0, position[2] || 0]
  const meshYOffset = imageHeight / 2 // 1.25 units - center of image above ground
  
  // Configure texture for transparency
  React.useEffect(() => {
    if (avatarTexture) {
      avatarTexture.flipY = false // Don't flip the texture
    }
  }, [avatarTexture])
  
  // Smoothly interpolate position and make sprite face camera
  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return
    
    // Update group position (X, Z at ground level)
    const currentGroupPos = groupRef.current.position
    const targetGroupPos = new THREE.Vector3(...groundPosition)
    
    // Smooth position interpolation for X and Z
    currentGroupPos.x = currentGroupPos.x + (targetGroupPos.x - currentGroupPos.x) * 0.2
    currentGroupPos.z = currentGroupPos.z + (targetGroupPos.z - currentGroupPos.z) * 0.2
    currentGroupPos.y = 0 // Always keep group at ground level
    
    // Make the sprite always face the camera (billboard effect)
    if (camera) {
      meshRef.current.lookAt(camera.position)
    }
  })
  
  return (
    <group ref={groupRef} position={groundPosition}>
      <mesh ref={meshRef} position={[0, meshYOffset, 0]}>
        <planeGeometry args={[imageWidth, imageHeight]} /> {/* Width and height for avatar size */}
        <meshStandardMaterial 
          map={avatarTexture}
          transparent={true}
          alphaTest={0.1} // Remove transparent pixels
          side={THREE.DoubleSide}
          color="#ffffff" // White color to preserve natural image colors
        />
      </mesh>
    </group>
  )
}

// Other Player Component - Uses avatar image sprite
function OtherPlayer({ position, rotation, playerId }) {
  const imageHeight = 2.5
  const meshYOffset = imageHeight / 2 // 1.25 units - center of image above ground
  
  return (
    <Suspense fallback={
      <group position={[position[0] || 0, 0, position[2] || 0]}>
        {/* Simple fallback while image loads - positioned so bottom is at ground */}
        <mesh position={[0, meshYOffset, 0]}>
          <planeGeometry args={[2, 2.5]} />
          <meshStandardMaterial color="#cccccc" transparent opacity={0.5} />
        </mesh>
      </group>
    }>
      <OtherPlayerAvatar position={position} rotation={rotation} playerId={playerId} />
    </Suspense>
  )
}

export default OtherPlayer

import React, { useState, Suspense } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

/**
 * LiveChat Texture Content - Inner component that uses useTexture hook
 */
function LiveChatContent({ position, rotation, isOpen, setIsOpen }) {
  const chatTextureUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400'
  
  // useTexture must be called unconditionally (it's a hook)
  const chatTexture = useTexture(chatTextureUrl)
  
  const handleClick = (e) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Chat kiosk base */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2.4, 1.5]} />
        <meshStandardMaterial 
          color="#4a90e2" 
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      
      {/* Chat screen */}
      <mesh 
        position={[0, 1.2, 0.76]} 
        castShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'default'
        }}
      >
        <planeGeometry args={[2.5, 2]} />
        <meshStandardMaterial 
          map={chatTexture || null}
          color={chatTexture ? '#ffffff' : '#4a90e2'}
          transparent={false}
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* "Live Chat" label */}
      <mesh position={[0, 2.6, 0.77]}>
        <planeGeometry args={[2.5, 0.3]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      
      {/* Indicator light */}
      <mesh position={[1.2, 2.4, 0.77]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

/**
 * LiveChat Component - Interactive chat interface
 * @param {Object} props
 * @param {Array} props.position - [x, y, z] position
 * @param {Array} props.rotation - [x, y, z] rotation
 */
export default function LiveChat({ position, rotation }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <Suspense fallback={
      <group position={position} rotation={rotation}>
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, 2.4, 1.5]} />
          <meshStandardMaterial color="#4a90e2" />
        </mesh>
      </group>
    }>
      <LiveChatContent
        position={position}
        rotation={rotation}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    </Suspense>
  )
}

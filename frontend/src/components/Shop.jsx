import React from 'react'

export default function Shop({ position, name, color = '#4a90e2', onEnter }) {
  const shopWidth = 6  // Increased from 3
  const shopDepth = 6  // Increased from 3
  const shopHeight = 5  // Increased from 4
  const roofHeight = 0.5

  return (
    <group position={position}>
      {/* Main Building Structure */}
      <mesh position={[0, shopHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[shopWidth, shopHeight, shopDepth]} />
        <meshStandardMaterial 
          color="#f5f5f5" 
          roughness={0.7} 
          metalness={0.1}
        />
      </mesh>

      {/* Decorative Base/Foundation */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[shopWidth + 0.1, 0.4, shopDepth + 0.1]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.5} />
      </mesh>

      {/* Columns/Pillars on corners */}
      <mesh position={[-shopWidth/2 + 0.15, shopHeight/2 + 0.2, -shopDepth/2 + 0.15]} castShadow>
        <boxGeometry args={[0.2, shopHeight + 0.4, 0.2]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[shopWidth/2 - 0.15, shopHeight/2 + 0.2, -shopDepth/2 + 0.15]} castShadow>
        <boxGeometry args={[0.2, shopHeight + 0.4, 0.2]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-shopWidth/2 + 0.15, shopHeight/2 + 0.2, shopDepth/2 - 0.15]} castShadow>
        <boxGeometry args={[0.2, shopHeight + 0.4, 0.2]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[shopWidth/2 - 0.15, shopHeight/2 + 0.2, shopDepth/2 - 0.15]} castShadow>
        <boxGeometry args={[0.2, shopHeight + 0.4, 0.2]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Modern Slanted Roof */}
      <mesh 
        position={[0, shopHeight + roofHeight/2, 0]} 
        rotation={[0, Math.PI / 4, 0]}
        castShadow
      >
        <boxGeometry args={[shopWidth + 0.5, roofHeight, shopDepth + 0.5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Glass Storefront */}
      <mesh position={[0, shopHeight * 0.6, -shopDepth/2 - 0.01]} castShadow>
        <boxGeometry args={[shopWidth - 0.4, shopHeight * 0.8, 0.1]} />
        <meshStandardMaterial 
          color="#e8f4f8" 
          transparent 
          opacity={0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Storefront Frame */}
      <mesh position={[0, shopHeight * 0.6, -shopDepth/2 - 0.02]} castShadow>
        <boxGeometry args={[shopWidth - 0.2, shopHeight * 0.85, 0.05]} />
        <meshStandardMaterial color="#2c2c2c" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Glass Door */}
      <mesh position={[0, 1.2, -shopDepth/2 - 0.015]} castShadow>
        <boxGeometry args={[0.8, 2, 0.08]} />
        <meshStandardMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.4}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Door Frame */}
      <mesh position={[0, 1.2, -shopDepth/2 - 0.025]} castShadow>
        <boxGeometry args={[0.9, 2.1, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Modern Signage Board */}
      <mesh position={[0, shopHeight + 0.3, -shopDepth/2 - 0.1]} castShadow>
        <boxGeometry args={[shopWidth - 0.3, 0.4, 0.15]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>

      {/* Signage Text Area (glowing) */}
      <mesh position={[0, shopHeight + 0.3, -shopDepth/2 - 0.05]} castShadow>
        <boxGeometry args={[shopWidth - 0.5, 0.25, 0.05]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Side Windows */}
      <mesh position={[-shopWidth/2 - 0.01, shopHeight * 0.7, 0]} castShadow>
        <boxGeometry args={[0.1, 1.5, 1.5]} />
        <meshStandardMaterial 
          color="#e8f4f8" 
          transparent 
          opacity={0.25}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[shopWidth/2 + 0.01, shopHeight * 0.7, 0]} castShadow>
        <boxGeometry args={[0.1, 1.5, 1.5]} />
        <meshStandardMaterial 
          color="#e8f4f8" 
          transparent 
          opacity={0.25}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Decorative Stripes */}
      <mesh position={[0, shopHeight * 0.3, shopDepth/2 + 0.01]} castShadow>
        <boxGeometry args={[shopWidth, 0.1, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, shopHeight * 0.7, shopDepth/2 + 0.01]} castShadow>
        <boxGeometry args={[shopWidth, 0.1, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Entrance Steps */}
      <mesh position={[0, 0.1, -shopDepth/2 - 0.3]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.2, 0.4]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>

      {/* Entrance Trigger Zone (invisible) */}
      <mesh 
        position={[0, 1, -shopDepth/2 - 0.5]} 
        visible={false}
        onClick={onEnter}
      >
        <boxGeometry args={[1.5, 2.5, 1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

import React from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Floor() {
  const floorRef = useRef()
  const gridSize = 20
  const tileSize = 1

  return (
    <group ref={floorRef}>
      {/* Main floor plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.1}
          metalness={0.8}
          envMapIntensity={1}
        />
      </mesh>

      {/* Grid lines for visual structure */}
      <GridLines size={gridSize} divisions={gridSize} />
    </group>
  )
}

function GridLines({ size, divisions }) {
  const gridHelper = new THREE.GridHelper(size, divisions, '#e0e0e0', '#e0e0e0')
  
  return (
    <primitive object={gridHelper} position={[0, 0.01, 0]} />
  )
}

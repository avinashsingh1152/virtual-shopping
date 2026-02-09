import React, { Suspense, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// List of GLB files in public/glb folder
export const GLB_FILES = [
  '/glb/Avocado.glb',
  '/glb/BoomBox.glb',
  '/glb/ChronographWatch.glb',
  '/glb/DamagedHelmet.glb',
  '/glb/Duck.glb',
  '/glb/IridescenceLamp.glb',
  '/glb/MaterialsVariantsShoe.glb',
  '/glb/RobotExpressive.glb',
  '/glb/SheenChair.glb',
  '/glb/Stork.glb',
]

// Individual GLB Model Component
function GLBModel({ modelUrl, position, index }) {
  const { scene } = useGLTF(modelUrl)
  
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
    }
  }, [scene])
  
  if (scene) {
    // Calculate bounding box to scale model appropriately for floor display
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z)
    // Scale to fit within 2 units (larger than wall products since they're on the floor)
    const scale = maxSize > 0 ? 2.0 / maxSize : 1
    
    // Calculate Y offset to place model on floor
    // Get the minimum Y of the bounding box (bottom of model)
    const minY = box.min.y
    // After scaling, the bottom will be at minY * scale
    // We want the bottom at Y=0, so we offset by -minY * scale
    const yOffset = -minY * scale
    
    return (
      <group position={[position[0], yOffset, position[2]]} rotation={[0, index * 0.5, 0]}>
        <primitive object={scene.clone()} scale={scale} />
      </group>
    )
  }
  
  return null
}

// Main component that displays all GLB models on the floor
export default function FloorGLBModels() {
  // Preload all GLB models for better performance
  useEffect(() => {
    GLB_FILES.forEach((modelUrl) => {
      useGLTF.preload(modelUrl)
    })
  }, [])
  
  // Calculate positions in a grid pattern with proper spacing
  // Arrange in a grid pattern with good spacing from walls
  const spacing = 20 // Distance between models (increased for better visibility)
  const gridCols = 3 // Number of columns
  const totalModels = GLB_FILES.length
  const gridRows = Math.ceil(totalModels / gridCols)
  
  // Center the grid in the mall (mall is 200x200, so center is at 0,0)
  // Calculate total grid width and height
  const totalGridWidth = (gridCols - 1) * spacing
  const totalGridHeight = (gridRows - 1) * spacing
  
  // Start positions to center the grid
  const startX = -totalGridWidth / 2
  const startZ = -totalGridHeight / 2
  
  const positions = GLB_FILES.map((_, index) => {
    const col = index % gridCols
    const row = Math.floor(index / gridCols)
    const x = startX + col * spacing
    const z = startZ + row * spacing
    return [x, 0, z] // Y will be adjusted by the model component
  })
  
  return (
    <group>
      {GLB_FILES.map((modelUrl, index) => (
        <Suspense
          key={modelUrl}
          fallback={
            <mesh position={positions[index]} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
          }
        >
          <GLBModel
            modelUrl={modelUrl}
            position={positions[index]}
            index={index}
          />
        </Suspense>
      ))}
    </group>
  )
}

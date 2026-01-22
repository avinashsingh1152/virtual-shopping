import React from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlayerStore } from '../stores/playerStore'
import { FLOOR_HEIGHT } from './MallStructure'

const STAIR_WIDTH = 3
const STAIR_DEPTH = 2
const STAIR_STEP_HEIGHT = 0.2
const STAIR_STEP_COUNT = 20 // Number of steps
const STAIR_STEP_DEPTH = STAIR_DEPTH / STAIR_STEP_COUNT

export default function Stairs({ position, floorIndex, direction = 'up' }) {
  const yBase = floorIndex * FLOOR_HEIGHT
  const playerPosition = usePlayerStore((state) => state.position)
  const currentFloor = usePlayerStore((state) => state.currentFloor)
  const setCurrentFloor = usePlayerStore((state) => state.setCurrentFloor)
  const setPosition = usePlayerStore((state) => state.setPosition)

  // Handle floor transition and step height adjustment (no automatic movement)
  useFrame(() => {
    // Check if player is on stairs
    const onStairs = 
      playerPosition[0] > position[0] - STAIR_WIDTH / 2 &&
      playerPosition[0] < position[0] + STAIR_WIDTH / 2 &&
      playerPosition[2] > position[2] - STAIR_DEPTH / 2 &&
      playerPosition[2] < position[2] + STAIR_DEPTH / 2 &&
      Math.abs(playerPosition[1] - yBase) < FLOOR_HEIGHT + 1

    if (onStairs) {
      // Calculate which step the player is on based on their current Z position
      const relativeZ = playerPosition[2] - (position[2] - STAIR_DEPTH / 2)
      const stepIndex = Math.max(0, Math.min(STAIR_STEP_COUNT - 1, Math.floor(relativeZ / STAIR_STEP_DEPTH)))
      const stepHeight = stepIndex * STAIR_STEP_HEIGHT
      const targetY = yBase + stepHeight
      
      // Only adjust Y position to match step height (no automatic Z movement)
      if (Math.abs(playerPosition[1] - targetY) > 0.05) {
        setPosition([playerPosition[0], targetY, playerPosition[2]])
      }

      // Check if player reached the top/bottom and update floor
      if (direction === 'up' && stepIndex >= STAIR_STEP_COUNT - 2 && currentFloor === floorIndex) {
        // Move to next floor
        setCurrentFloor(floorIndex + 1)
        setPosition([playerPosition[0], (floorIndex + 1) * FLOOR_HEIGHT, playerPosition[2]])
      } else if (direction === 'down' && stepIndex <= 1 && currentFloor === floorIndex && floorIndex > 0) {
        // Move to previous floor
        setCurrentFloor(floorIndex - 1)
        setPosition([playerPosition[0], (floorIndex - 1) * FLOOR_HEIGHT, playerPosition[2]])
      }
    }
  })

  return (
    <group position={[position[0], yBase, position[2]]}>
      {/* Premium IKEA-style stairs with modern design */}
      {Array.from({ length: STAIR_STEP_COUNT }).map((_, index) => (
        <StairStep key={index} index={index} />
      ))}
      
      {/* Modern handrails - IKEA style */}
      <Handrail 
        position={[-STAIR_WIDTH / 2 - 0.15, 0, 0]} 
        height={STAIR_STEP_COUNT * STAIR_STEP_HEIGHT}
      />
      <Handrail 
        position={[STAIR_WIDTH / 2 + 0.15, 0, 0]} 
        height={STAIR_STEP_COUNT * STAIR_STEP_HEIGHT}
      />
      
      {/* Stair landing/platform at top */}
      <mesh 
        position={[0, STAIR_STEP_COUNT * STAIR_STEP_HEIGHT, STAIR_DEPTH / 2 + 0.5]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[STAIR_WIDTH + 0.5, 0.1, 1]} />
        <meshStandardMaterial 
          color="#f5f5f0"
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>
    </group>
  )
}

function StairStep({ index }) {
  const stepY = (index * STAIR_STEP_HEIGHT) + (STAIR_STEP_HEIGHT / 2)
  const stepZ = (index * STAIR_STEP_DEPTH) - (STAIR_DEPTH / 2) + (STAIR_STEP_DEPTH / 2)
  
  return (
    <group position={[0, stepY, stepZ]}>
      {/* Main step - premium wood-like finish */}
      <mesh
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[STAIR_WIDTH, STAIR_STEP_HEIGHT, STAIR_STEP_DEPTH]} />
        <meshStandardMaterial 
          color="#e8e0d0" // Light wood/beige tone
          roughness={0.5}
          metalness={0.05}
        />
      </mesh>
      
      {/* Step nosing - modern detail */}
      <mesh
        position={[0, STAIR_STEP_HEIGHT / 2, STAIR_STEP_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[STAIR_WIDTH, 0.02, 0.05]} />
        <meshStandardMaterial 
          color="#d4c4b0" // Slightly darker nosing
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}

function Handrail({ position, height }) {
  const railHeight = 0.9 // Height of handrail from steps
  
  return (
    <group position={position}>
      {/* Vertical posts */}
      {[0, height / 3, height * 2 / 3, height].map((y, i) => (
        <mesh key={`post-${i}`} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.05, 8]} />
          <meshStandardMaterial 
            color="#2c2c2c" // Dark modern finish
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
      
      {/* Horizontal handrail */}
      <mesh position={[0, height + railHeight, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, height]} />
        <meshStandardMaterial 
          color="#2c2c2c" // Dark modern finish
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Support brackets */}
      {Array.from({ length: Math.floor(height / 0.8) }).map((_, i) => {
        const y = i * 0.8
        return (
          <mesh key={`bracket-${i}`} position={[0, y + railHeight, 0]} castShadow>
            <boxGeometry args={[0.04, 0.04, 0.15]} />
            <meshStandardMaterial 
              color="#3c3c3c"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        )
      })}
    </group>
  )
}

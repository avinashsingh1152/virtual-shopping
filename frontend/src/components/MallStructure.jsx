import React from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

// Mall configuration
const FLOOR_HEIGHT = 4 // Height between floors (kept for compatibility)
const FLOOR_COUNT = 1 // Single floor only
const MALL_SIZE = 120 // Overall mall size (increased for larger shops)
const CORRIDOR_WIDTH = 12 // Width of main corridors (wider for better visibility)
const WALL_HEIGHT = 4 // Height of walls
const WALL_THICKNESS = 0.2

// Define walkable paths (corridors) - coordinates where player can walk - UPDATED FOR LARGER MALL
const WALKABLE_PATHS = [
  // Main horizontal corridor (ground floor) - much wider
  { x: -40, z: 0, width: 80, depth: CORRIDOR_WIDTH, floor: 0 },
  { x: 40, z: 0, width: 80, depth: CORRIDOR_WIDTH, floor: 0 },
  // Main vertical corridor (ground floor) - much wider
  { x: 0, z: -40, width: CORRIDOR_WIDTH, depth: 80, floor: 0 },
  { x: 0, z: 40, width: CORRIDOR_WIDTH, depth: 80, floor: 0 },
  
  // Upper floors - same layout
  { x: -12, z: 0, width: 24, depth: CORRIDOR_WIDTH, floor: 1 },
  { x: 12, z: 0, width: 24, depth: CORRIDOR_WIDTH, floor: 1 },
  { x: 0, z: -12, width: CORRIDOR_WIDTH, depth: 24, floor: 1 },
  { x: 0, z: 12, width: CORRIDOR_WIDTH, depth: 24, floor: 1 },
  
  { x: -12, z: 0, width: 24, depth: CORRIDOR_WIDTH, floor: 2 },
  { x: 12, z: 0, width: 24, depth: CORRIDOR_WIDTH, floor: 2 },
  { x: 0, z: -12, width: CORRIDOR_WIDTH, depth: 24, floor: 2 },
  { x: 0, z: 12, width: CORRIDOR_WIDTH, depth: 24, floor: 2 },
]

// Define shop positions (these are blocked areas) - UPDATED FOR 4X LARGER SHOPS
const SHOP_POSITIONS = [
  // Ground floor shops (4x larger = 48 units, so size = 24 for collision)
  { x: 20, z: 20, size: 24, floor: 0 },
  { x: -20, z: 20, size: 24, floor: 0 },
  { x: 20, z: -20, size: 24, floor: 0 },
  { x: -20, z: -20, size: 24, floor: 0 },
  { x: 0, z: 30, size: 24, floor: 0 },
  // Upper floor shops
  { x: 5, z: 5, size: 3, floor: 1 },
  { x: -5, z: 5, size: 3, floor: 1 },
  { x: 5, z: -5, size: 3, floor: 1 },
  { x: -5, z: -5, size: 3, floor: 1 },
  { x: 0, z: 7, size: 3, floor: 1 },
  { x: 5, z: 5, size: 3, floor: 2 },
  { x: -5, z: 5, size: 3, floor: 2 },
  { x: 5, z: -5, size: 3, floor: 2 },
  { x: -5, z: -5, size: 3, floor: 2 },
]

// Stair positions
const STAIR_POSITIONS = [
  { x: 0, z: 0, floor: 0 }, // Central stairs
  { x: 0, z: 0, floor: 1 }, // Central stairs on floor 1
]

export default function MallStructure() {
  return (
    <group>
      {/* Render floors */}
      {Array.from({ length: FLOOR_COUNT }).map((_, floorIndex) => (
        <FloorLevel key={floorIndex} floorIndex={floorIndex} />
      ))}
      
      {/* Render walls */}
      {Array.from({ length: FLOOR_COUNT }).map((_, floorIndex) => (
        <Walls key={`walls-${floorIndex}`} floorIndex={floorIndex} />
      ))}
    </group>
  )
}

function FloorLevel({ floorIndex }) {
  const yPosition = floorIndex * FLOOR_HEIGHT
  
  return (
    <group position={[0, yPosition, 0]}>
      {/* Premium floor - IKEA style polished concrete/light wood */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[MALL_SIZE, MALL_SIZE]} />
        <meshStandardMaterial
          color={floorIndex === 0 ? "#f5f5f0" : "#f8f8f3"} // Warm white/beige tone
          roughness={0.3} // Slightly polished
          metalness={0.1}
          envMapIntensity={1.2}
        />
      </mesh>
      
      {/* Premium pathways/roads between stores */}
      <Pathways />
      
      {/* Premium pathways/roads between stores */}
      <Pathways />
      
      {/* Floor pattern - subtle grid for premium look */}
      <GridLines size={MALL_SIZE} divisions={MALL_SIZE} />
      
      {/* Ceiling for upper floors with texture */}
      {floorIndex > 0 && <Ceiling floorIndex={floorIndex} />}
      
      {/* Ceiling lights - IKEA style modern lighting */}
      <CeilingLights floorIndex={floorIndex} />
    </group>
  )
}

function GridLines({ size, divisions }) {
  // Subtle grid lines for premium look
  const gridHelper = new THREE.GridHelper(size, divisions, '#e8e8e3', '#f0f0eb')
  return <primitive object={gridHelper} position={[0, 0.01, 0]} />
}

function Ceiling({ floorIndex }) {
  return (
    <mesh
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, FLOOR_HEIGHT, 0]}
      receiveShadow
    >
      <planeGeometry args={[MALL_SIZE, MALL_SIZE]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.8}
        metalness={0.05}
        emissive="#fafafa"
        emissiveIntensity={0.1}
      />
    </mesh>
  )
}

function CeilingLights({ floorIndex }) {
  const yPosition = FLOOR_HEIGHT - 0.1
  const lightSpacing = 6
  
  return (
    <group position={[0, yPosition, 0]}>
      {/* Modern recessed ceiling lights */}
      {Array.from({ length: 5 }).map((_, i) => {
        const x = (i - 2) * lightSpacing
        return (
          <group key={`light-row-${i}`}>
            {Array.from({ length: 5 }).map((_, j) => {
              const z = (j - 2) * lightSpacing
              return (
                <group key={`light-${i}-${j}`} position={[x, 0, z]}>
                  {/* Recessed light fixture */}
                  <mesh position={[0, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
                    <meshStandardMaterial 
                      color="#ffffff" 
                      emissive="#ffffff"
                      emissiveIntensity={0.5}
                      metalness={0.9}
                      roughness={0.1}
                    />
                  </mesh>
                  {/* Light glow */}
                  <pointLight 
                    position={[0, 0, 0]} 
                    intensity={0.8} 
                    distance={8}
                    decay={2}
                    color="#fffef5"
                  />
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

function Walls({ floorIndex }) {
  const yPosition = floorIndex * FLOOR_HEIGHT
  const wallY = yPosition + WALL_HEIGHT / 2
  
  return (
    <group position={[0, yPosition, 0]}>
      {/* Outer perimeter walls */}
      {/* North wall */}
      <WallSegment 
        position={[0, wallY, MALL_SIZE / 2]} 
        rotation={[0, 0, 0]}
        width={MALL_SIZE}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* South wall */}
      <WallSegment 
        position={[0, wallY, -MALL_SIZE / 2]} 
        rotation={[0, 0, 0]}
        width={MALL_SIZE}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* East wall */}
      <WallSegment 
        position={[MALL_SIZE / 2, wallY, 0]} 
        rotation={[0, Math.PI / 2, 0]}
        width={MALL_SIZE}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* West wall */}
      <WallSegment 
        position={[-MALL_SIZE / 2, wallY, 0]} 
        rotation={[0, Math.PI / 2, 0]}
        width={MALL_SIZE}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* Internal corridor walls - create pathways */}
      {/* Horizontal corridor walls */}
      <CorridorWalls floorIndex={floorIndex} />
    </group>
  )
}

function WallSegment({ position, rotation, width, height, depth }) {
  // Load premium wall texture (lightweight)
  const wallTexture = useTexture({
    map: 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=150',
  })
  
  // Configure texture repetition
  if (wallTexture.map) {
    wallTexture.map.wrapS = THREE.RepeatWrapping
    wallTexture.map.wrapT = THREE.RepeatWrapping
    wallTexture.map.repeat.set(width / 3, height / 3) // Scale texture appropriately
  }
  
  return (
    <group>
      {/* Main wall - IKEA style clean white walls with texture */}
      <mesh position={position} rotation={rotation} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          {...wallTexture}
          color="#fafafa" // Clean white
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      
      {/* Wall baseboard - premium detail */}
      <mesh 
        position={[position[0], position[1] - height/2 + 0.1, position[2]]} 
        rotation={rotation} 
        castShadow
      >
        <boxGeometry args={[width, 0.2, depth + 0.01]} />
        <meshStandardMaterial 
          color="#e8e8e3" // Subtle gray baseboard
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
      
      {/* Wall top trim - modern detail */}
      <mesh 
        position={[position[0], position[1] + height/2 - 0.05, position[2]]} 
        rotation={rotation} 
        castShadow
      >
        <boxGeometry args={[width, 0.1, depth + 0.01]} />
        <meshStandardMaterial 
          color="#f0f0eb" // Light trim
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
    </group>
  )
}

function CorridorWalls({ floorIndex }) {
  const wallY = WALL_HEIGHT / 2
  const corridorOffset = CORRIDOR_WIDTH / 2 + 0.1
  
  return (
    <>
      {/* Walls around horizontal corridor (leaving openings for shops) */}
      {/* Top corridor wall (north of center) */}
      <WallSegment 
        position={[-6, wallY, corridorOffset]} 
        rotation={[0, 0, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      <WallSegment 
        position={[6, wallY, corridorOffset]} 
        rotation={[0, 0, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* Bottom corridor wall (south of center) */}
      <WallSegment 
        position={[-6, wallY, -corridorOffset]} 
        rotation={[0, 0, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      <WallSegment 
        position={[6, wallY, -corridorOffset]} 
        rotation={[0, 0, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* Walls around vertical corridor (leaving openings for shops) */}
      {/* Right corridor wall (east of center) */}
      <WallSegment 
        position={[corridorOffset, wallY, -6]} 
        rotation={[0, Math.PI / 2, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      <WallSegment 
        position={[corridorOffset, wallY, 6]} 
        rotation={[0, Math.PI / 2, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* Left corridor wall (west of center) */}
      <WallSegment 
        position={[-corridorOffset, wallY, -6]} 
        rotation={[0, Math.PI / 2, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      <WallSegment 
        position={[-corridorOffset, wallY, 6]} 
        rotation={[0, Math.PI / 2, 0]}
        width={12}
        height={WALL_HEIGHT}
        depth={WALL_THICKNESS}
      />
      
      {/* Modern signage/markers on walls - IKEA style */}
      <WallSignage floorIndex={floorIndex} />
    </>
  )
}

function WallSignage({ floorIndex }) {
  const wallY = WALL_HEIGHT / 2 + 0.5
  
  return (
    <>
      {/* Floor indicators - modern minimalist design */}
      <mesh position={[-12, wallY, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.3, 0.05]} />
        <meshStandardMaterial 
          color="#2c2c2c"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Directional arrows - premium look */}
      {[-8, 8].map((x) => (
        <mesh key={`arrow-${x}`} position={[x, wallY - 0.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[0.4, 0.1, 0.02]} />
          <meshStandardMaterial 
            color="#4a4a4a"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
    </>
  )
}

// Premium pathways/roads component - HIGHLY VISIBLE
function Pathways() {
  const pathwayWidth = CORRIDOR_WIDTH + 4 // Much wider pathways for premium feel
  const pathwayColor = "#d4d4c8" // Brighter gray for better visibility
  const borderColor = "#8b8b7a" // Dark border for contrast
  
  return (
    <group>
      {/* Main horizontal pathway (east-west) - VERY VISIBLE */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[MALL_SIZE, pathwayWidth]} />
        <meshStandardMaterial
          color={pathwayColor}
          roughness={0.3}
          metalness={0.1}
          emissive="#e0e0d0"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Horizontal pathway border (top) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, pathwayWidth/2]}
      >
        <planeGeometry args={[MALL_SIZE, 0.3]} />
        <meshStandardMaterial color={borderColor} />
      </mesh>
      
      {/* Horizontal pathway border (bottom) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, -pathwayWidth/2]}
      >
        <planeGeometry args={[MALL_SIZE, 0.3]} />
        <meshStandardMaterial color={borderColor} />
      </mesh>
      
      {/* Main vertical pathway (north-south) - VERY VISIBLE */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[pathwayWidth, MALL_SIZE]} />
        <meshStandardMaterial
          color={pathwayColor}
          roughness={0.3}
          metalness={0.1}
          emissive="#e0e0d0"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Vertical pathway border (left) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-pathwayWidth/2, 0.015, 0]}
      >
        <planeGeometry args={[0.3, MALL_SIZE]} />
        <meshStandardMaterial color={borderColor} />
      </mesh>
      
      {/* Vertical pathway border (right) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pathwayWidth/2, 0.015, 0]}
      >
        <planeGeometry args={[0.3, MALL_SIZE]} />
        <meshStandardMaterial color={borderColor} />
      </mesh>
      
      {/* Pathway borders/markings for premium look */}
      <PathwayMarkings />
    </group>
  )
}

// Pathway markings and directional indicators - UPDATED FOR NEW POSITIONS
function PathwayMarkings() {
  return (
    <group>
      {/* Center intersection circle - LARGER AND MORE VISIBLE */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      >
        <ringGeometry args={[4, 6, 32]} />
        <meshStandardMaterial
          color="#8b8b7a"
          roughness={0.2}
          metalness={0.3}
          emissive="#a0a090"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Directional arrows on pathways - LARGER AND MORE VISIBLE */}
      {[
        { x: -30, z: 0, rotation: 0 }, // West arrow
        { x: 30, z: 0, rotation: Math.PI }, // East arrow
        { x: 0, z: -30, rotation: Math.PI / 2 }, // South arrow
        { x: 0, z: 30, rotation: -Math.PI / 2 }, // North arrow
      ].map((arrow, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, arrow.rotation, 0]}
          position={[arrow.x, 0.03, arrow.z]}
        >
          <coneGeometry args={[1.5, 4, 3]} />
          <meshStandardMaterial
            color="#2a2a2a"
            metalness={0.7}
            roughness={0.2}
            emissive="#4a4a4a"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      
      {/* Store direction indicators - UPDATED POSITIONS */}
      {[
        { x: 20, z: 20, label: "Electronics" },
        { x: -20, z: 20, label: "Fashion" },
        { x: 20, z: -20, label: "Food Court" },
        { x: -20, z: -20, label: "Books" },
        { x: 0, z: 30, label: "Gaming" },
      ].map((shop, i) => (
        <group key={i}>
          {/* Large arrow pointing to shop */}
          <mesh
            rotation={[-Math.PI / 2, Math.atan2(shop.x, shop.z), 0]}
            position={[
              shop.x * 0.15,
              0.03,
              shop.z * 0.15
            ]}
          >
            <coneGeometry args={[1.2, 3, 3]} />
            <meshStandardMaterial
              color="#3a3a3a"
              metalness={0.6}
              roughness={0.3}
              emissive="#5a5a5a"
              emissiveIntensity={0.4}
            />
          </mesh>
          
          {/* Store name indicator on pathway */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              shop.x * 0.1,
              0.04,
              shop.z * 0.1
            ]}
          >
            <boxGeometry args={[3, 0.1, 1]} />
            <meshStandardMaterial
              color="#4a4a4a"
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Export collision data for use in Player component
export { WALKABLE_PATHS, SHOP_POSITIONS, STAIR_POSITIONS, FLOOR_HEIGHT, MALL_SIZE, CORRIDOR_WIDTH }

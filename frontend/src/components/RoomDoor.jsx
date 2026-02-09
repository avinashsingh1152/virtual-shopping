import React, { useRef, useState, Suspense } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerStore } from '../stores/playerStore'
import { useRoomStore } from '../stores/roomStore'
import { fetchRoomsByCategory } from '../services/api'

/**
 * Door with Texture - Inner component that uses useTexture hook
 */
function DoorWithTexture({ position, rotation, room, category, onJoinRoom, onLeaveRoom }) {
  const doorTextureUrl = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400'
  
  // useTexture must be called unconditionally (it's a hook)
  const doorTexture = useTexture(doorTextureUrl)
  
  return (
    <RoomDoorContent
      doorTexture={doorTexture}
      position={position}
      rotation={rotation}
      room={room}
      category={category}
      onJoinRoom={onJoinRoom}
      onLeaveRoom={onLeaveRoom}
    />
  )
}

/**
 * RoomDoor Content - Main door logic without texture loading
 */
function RoomDoorContent({ doorTexture, position, rotation, room, category, onJoinRoom, onLeaveRoom }) {
  const doorRef = useRef()
  const playerPosition = usePlayerStore((state) => state.position)
  const currentRoom = useRoomStore((state) => state.currentRoom)
  const isInRoom = useRoomStore((state) => state.isInRoom)
  const [lastStatusCheck, setLastStatusCheck] = useState(0)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  
  // Proximity detection distance (auto-join when within this distance)
  const JOIN_DISTANCE = 5.0 // units
  const LEAVE_DISTANCE = 8.0 // units (leave when farther than this)
  const STATUS_CHECK_INTERVAL = 2000 // Check status every 2 seconds when near
  
  // Check distance and auto-join/leave
  useFrame(() => {
    if (!doorRef.current) return
    
    const doorWorldPosition = new THREE.Vector3(...position)
    const playerPos = new THREE.Vector3(...playerPosition)
    const distance = doorWorldPosition.distanceTo(playerPos)
    
    const isCurrentRoom = currentRoom?.roomId === room.roomId
    const now = Date.now()
    
    // Fetch room status when near (every STATUS_CHECK_INTERVAL ms)
    if (distance <= JOIN_DISTANCE && !isCheckingStatus && (now - lastStatusCheck) > STATUS_CHECK_INTERVAL) {
      setIsCheckingStatus(true)
      setLastStatusCheck(now)
      
      // Check if room exists in category using categories/rooms API
      fetchRoomsByCategory(category)
        .then(roomsResponse => {
          const rooms = roomsResponse.rooms || []
          const roomExists = rooms.some(r => r.roomId === room.roomId)
          
          // Auto-join only if room exists and not already in this room
          if (distance <= JOIN_DISTANCE && !isCurrentRoom && roomExists && onJoinRoom) {
            // Room exists, so it's active - join with default values
            onJoinRoom(room.roomId, category, room.creatorId, true, true)
          }
        })
        .catch(error => {
          console.error(`Error checking room existence for ${room.roomId}:`, error)
        })
        .finally(() => {
          setIsCheckingStatus(false)
        })
    }
    
    // Auto-leave when far and currently in this room
    if (distance > LEAVE_DISTANCE && isCurrentRoom && isInRoom && onLeaveRoom) {
      onLeaveRoom()
    }
  })
  
  const handleClick = (e) => {
    e.stopPropagation()
    // Manual join still works
    if (onJoinRoom && !isInRoom) {
      onJoinRoom(room.roomId, category, room.creatorId)
    }
  }

  return (
    <group ref={doorRef} position={position} rotation={rotation}>
      {/* Door frame */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 3, 0.2]} />
        <meshStandardMaterial color="#8B7355" roughness={0.7} metalness={0.1} />
      </mesh>
      
      {/* Door with texture */}
      <mesh 
        position={[0, 1.5, 0.11]} 
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
        <planeGeometry args={[1.8, 2.8]} />
        <meshStandardMaterial 
          map={doorTexture || null}
          color={doorTexture ? '#ffffff' : '#8B7355'}
          transparent={false}
          roughness={0.5}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Category label above door */}
      <mesh position={[0, 3.2, 0.12]}>
        <planeGeometry args={[2, 0.4]} />
        <meshStandardMaterial color="#4a90e2" transparent opacity={0.8} />
      </mesh>
      
      {/* Room indicator badge */}
      <mesh position={[0.7, 2.5, 0.12]}>
        <boxGeometry args={[0.4, 0.4, 0.1]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Click hint */}
      <mesh position={[0, 0.3, 0.12]}>
        <planeGeometry args={[1.5, 0.3]} />
        <meshStandardMaterial color="#ffff00" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

/**
 * RoomDoor Component - Main export with Suspense wrapper
 * Displays a door that auto-joins when player is near
 */
export default function RoomDoor({ position, rotation, room, category, onJoinRoom, onLeaveRoom }) {
  return (
    <Suspense fallback={
      <group position={position} rotation={rotation}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 3, 0.2]} />
          <meshStandardMaterial color="#8B7355" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.5, 0.11]}>
          <planeGeometry args={[1.8, 2.8]} />
          <meshStandardMaterial color="#8B7355" />
        </mesh>
      </group>
    }>
      <DoorWithTexture
        position={position}
        rotation={rotation}
        room={room}
        category={category}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
      />
    </Suspense>
  )
}

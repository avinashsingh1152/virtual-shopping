import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { usePlayerStore } from '../stores/playerStore'
import { useRoomStore } from '../stores/roomStore'
import { checkRoomStatus } from '../services/api'
import RoomVideoWall from './RoomVideoWall'

/**
 * CenterRoomWalls Component - Small walls in center, one per live room
 * Shows video on wall when player is near
 */
export default function CenterRoomWalls({ rooms, onJoinRoom, onLeaveRoom }) {
  const playerPosition = usePlayerStore((state) => state.position)
  const currentRoom = useRoomStore((state) => state.currentRoom)
  const isInRoom = useRoomStore((state) => state.isInRoom)
  
  // Filter only active/live rooms
  const liveRooms = rooms.filter(room => room.isActive !== false)
  
  if (liveRooms.length === 0) return null
  
  // Arrange walls in a circle or grid in the center
  const centerRadius = 15 // Distance from center
  const angleStep = (2 * Math.PI) / liveRooms.length // Evenly spaced in circle
  
  return (
    <>
      {liveRooms.map((room, index) => {
        // Calculate position in circle
        const angle = index * angleStep
        const wallX = Math.sin(angle) * centerRadius
        const wallZ = Math.cos(angle) * centerRadius
        
        // Wall faces center (opposite direction)
        const wallRotation = angle + Math.PI
        
        return (
          <Suspense key={`center-wall-${room.roomId}`} fallback={null}>
            <RoomVideoWall
              position={[wallX, 0, wallZ]}
              rotation={[0, wallRotation, 0]}
              room={room}
              onJoinRoom={onJoinRoom}
              onLeaveRoom={onLeaveRoom}
            />
          </Suspense>
        )
      })}
    </>
  )
}

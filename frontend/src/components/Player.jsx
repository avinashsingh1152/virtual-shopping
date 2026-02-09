import React, { useRef, useEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { usePlayerStore } from '../stores/playerStore'
import { checkCollision, getFloorY, isOnStairs } from '../utils/collision'

// Simple placeholder avatar model (we'll use a box for now, Ready Player Me integration below)
function PlaceholderAvatar() {
  const meshRef = useRef()

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.4]} />
        <meshStandardMaterial color="#4a90e2" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
    </group>
  )
}

// Ready Player Me Avatar Component
function ReadyPlayerMeAvatar({ avatarUrl }) {
  // Use drei's useGLTF hook for loading GLTF models
  const { scene } = useGLTF(avatarUrl)
  
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

  if (!scene) return null

  return <primitive object={scene} scale={1} />
}

export default function Player() {
  const playerRef = useRef()
  const position = usePlayerStore((state) => state.position)
  const setPosition = usePlayerStore((state) => state.setPosition)
  const rotation = usePlayerStore((state) => state.rotation)
  const setRotation = usePlayerStore((state) => state.setRotation)
  const pitch = usePlayerStore((state) => state.pitch)
  const setPitch = usePlayerStore((state) => state.setPitch)
  const velocity = usePlayerStore((state) => state.velocity)
  const isJumping = usePlayerStore((state) => state.isJumping)
  const setIsJumping = usePlayerStore((state) => state.setIsJumping)
  const isPointerLocked = useRef(false)

  const moveSpeed = 0.15
  const sprintSpeed = 0.35 // Fast movement speed when sprinting
  const jumpHeight = 2
  const gravity = -0.02
  const mouseSensitivity = 0.002
  
  // Refs for mouse position tracking (must be at top level, not inside useEffect)
  const lastMouseX = useRef(null)
  const lastMouseY = useRef(null)

  // Mouse look controls - active in first-person and third-person modes
  useEffect(() => {
    const cameraMode = usePlayerStore.getState().cameraMode
    
    // Enable mouse look in first-person and third-person modes
    const enableMouseLook = cameraMode === 'first-person' || cameraMode === 'third-person'
    
      if (!enableMouseLook) {
        // Exit pointer lock if not in first-person or third-person
        if (document.pointerLockElement) {
          try {
            if (typeof document.exitPointerLock === 'function') {
              const exitPromise = document.exitPointerLock()
              // Check if exitPromise exists and is a promise-like object
              if (exitPromise && typeof exitPromise === 'object' && exitPromise !== null) {
                if (typeof exitPromise.catch === 'function') {
                  exitPromise.catch(() => {
                    // Silently handle errors
                  })
                } else if (typeof exitPromise.then === 'function') {
                  // It's a thenable, wrap it
                  exitPromise.then(() => {}, () => {})
                }
              }
            }
          } catch (error) {
            // Silently handle errors
          }
        }
        isPointerLocked.current = false
        return
      }
    
    const handleMouseMove = (e) => {
      let deltaX = 0
      let deltaY = 0
      
      if (isPointerLocked.current) {
        // Use movementX/Y when pointer is locked (preferred method)
        deltaX = e.movementX || e.mozMovementX || e.webkitMovementX || 0
        deltaY = e.movementY || e.mozMovementY || e.webkitMovementY || 0
      } else {
        // Fallback: calculate delta from clientX/Y (works without pointer lock)
        if (lastMouseX.current === null || lastMouseY.current === null) {
          lastMouseX.current = e.clientX
          lastMouseY.current = e.clientY
          return
        }
        deltaX = e.clientX - lastMouseX.current
        deltaY = e.clientY - lastMouseY.current
        lastMouseX.current = e.clientX
        lastMouseY.current = e.clientY
      }

      // Only process if there's actual movement
      if (deltaX === 0 && deltaY === 0) return

      const currentState = usePlayerStore.getState()
      
      // Horizontal rotation (yaw) - left/right
      if (deltaX !== 0) {
        const newRotation = currentState.rotation - deltaX * mouseSensitivity
        setRotation(newRotation)
      }
      
      // Vertical rotation (pitch) - up/down
      if (deltaY !== 0) {
        const newPitch = currentState.pitch - deltaY * mouseSensitivity
        setPitch(newPitch) // setPitch already clamps the value
      }
    }

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement !== null
    }

    const handlePointerLockError = (e) => {
      // Handle pointer lock errors gracefully - don't log to avoid console spam
      isPointerLocked.current = false
    }

    const handleClick = (e) => {
      // Request pointer lock on canvas click (in first-person or third-person)
      const canvas = document.querySelector('canvas')
      if (!canvas || isPointerLocked.current) return
      
      // Don't trigger if clicking on UI elements (buttons, etc.)
      const target = e.target
      if (target && (target.tagName === 'BUTTON' || target.closest('button'))) {
        return
      }
      
      // Check if click is on canvas
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX
      const clickY = e.clientY
      
      const isOnCanvas = (
        clickX >= rect.left &&
        clickX <= rect.right &&
        clickY >= rect.top &&
        clickY <= rect.bottom
      )
      
      if (isOnCanvas) {
        try {
          const requestPointerLock = 
            canvas.requestPointerLock || 
            canvas.mozRequestPointerLock || 
            canvas.webkitRequestPointerLock
          
          if (requestPointerLock) {
            const promise = requestPointerLock.call(canvas)
            if (promise && typeof promise.catch === 'function') {
              promise.catch(() => {
                // Silently handle errors
              })
            }
          }
        } catch (error) {
          // Silently handle errors
        }
      }
    }

    // Always listen for mouse movement (works with or without pointer lock)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    document.addEventListener('mozpointerlockchange', handlePointerLockChange)
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange)
    document.addEventListener('pointerlockerror', handlePointerLockError)
    document.addEventListener('mozpointerlockerror', handlePointerLockError)
    document.addEventListener('webkitpointerlockerror', handlePointerLockError)
    
    // Add click listener to canvas specifically
    let canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('click', handleClick)
    }
    
    // Also listen on document as fallback with capture to catch early
    document.addEventListener('click', handleClick, { capture: true })
    
    // Retry canvas setup if not found initially
    let retryTimeout
    if (!canvas) {
      retryTimeout = setTimeout(() => {
        const retryCanvas = document.querySelector('canvas')
        if (retryCanvas) {
          retryCanvas.addEventListener('click', handleClick)
          canvas = retryCanvas
        }
      }, 500)
    }

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('mozpointerlockchange', handlePointerLockChange)
      document.removeEventListener('webkitpointerlockchange', handlePointerLockChange)
      document.removeEventListener('pointerlockerror', handlePointerLockError)
      document.removeEventListener('mozpointerlockerror', handlePointerLockError)
      document.removeEventListener('webkitpointerlockerror', handlePointerLockError)
      
      // Clean up canvas click listener
      const cleanupCanvas = document.querySelector('canvas')
      if (cleanupCanvas) {
        cleanupCanvas.removeEventListener('click', handleClick)
      }
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [setRotation])
  
  // Watch for camera mode changes and exit pointer lock if needed
  useEffect(() => {
    const checkCameraMode = () => {
      const cameraMode = usePlayerStore.getState().cameraMode
      const enableMouseLook = cameraMode === 'first-person' || cameraMode === 'third-person'
      
      if (!enableMouseLook && document.pointerLockElement) {
        try {
          if (typeof document.exitPointerLock === 'function') {
            const exitPromise = document.exitPointerLock()
            // Check if exitPromise exists and is a promise-like object
            if (exitPromise && typeof exitPromise === 'object' && exitPromise !== null) {
              if (typeof exitPromise.catch === 'function') {
                exitPromise.catch(() => {
                  // Silently handle errors
                })
              } else if (typeof exitPromise.then === 'function') {
                // It's a thenable, wrap it
                exitPromise.then(() => {}, () => {})
              }
            }
          }
        } catch (error) {
          // Silently handle errors
        }
        isPointerLocked.current = false
      }
    }
    
    // Check on mount and set up interval to check for changes
    checkCameraMode()
    const interval = setInterval(checkCameraMode, 100)
    
    return () => clearInterval(interval)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const keys = {}
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      // Don't prevent default for V key (camera toggle)
      if (key === 'v') {
        return
      }
      // Handle Shift key for sprint
      if (e.key === 'Shift' || e.shiftKey) {
        keys['shift'] = true
      }
      // Handle arrow keys
      if (e.key === 'ArrowUp') keys['arrowup'] = true
      else if (e.key === 'ArrowDown') keys['arrowdown'] = true
      else if (e.key === 'ArrowLeft') keys['arrowleft'] = true
      else if (e.key === 'ArrowRight') keys['arrowright'] = true
      else keys[key] = true
      e.preventDefault()
    }
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      // Don't prevent default for V key (camera toggle)
      if (key === 'v') {
        return
      }
      // Handle Shift key for sprint
      if (e.key === 'Shift' || !e.shiftKey) {
        keys['shift'] = false
      }
      // Handle arrow keys
      if (e.key === 'ArrowUp') keys['arrowup'] = false
      else if (e.key === 'ArrowDown') keys['arrowdown'] = false
      else if (e.key === 'ArrowLeft') keys['arrowleft'] = false
      else if (e.key === 'ArrowRight') keys['arrowright'] = false
      else keys[key] = false
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const updateMovement = () => {
      const currentState = usePlayerStore.getState()
      const currentVelocity = currentState.velocity
      const currentIsJumping = currentState.isJumping
      const currentPosition = currentState.position
      const currentRotation = currentState.rotation

      // Calculate movement direction from key presses
      // Movement is relative to player rotation (which matches camera view in first-person)
      let moveX = 0
      let moveZ = 0

      // Determine current speed (sprint if Shift is held)
      const currentSpeed = keys['shift'] ? sprintSpeed : moveSpeed

      // Use player rotation for movement direction (works for all camera modes)
      // Forward/backward relative to player rotation
      // W or ArrowUp - Move forward
      if (keys['w'] || keys['arrowup']) {
        moveX -= Math.sin(currentRotation) * currentSpeed
        moveZ -= Math.cos(currentRotation) * currentSpeed
      }
      // S or ArrowDown - Move backward
      if (keys['s'] || keys['arrowdown']) {
        moveX += Math.sin(currentRotation) * currentSpeed
        moveZ += Math.cos(currentRotation) * currentSpeed
      }
      // Left/right relative to player rotation (strafe)
      // A or ArrowLeft - Strafe left
      if (keys['a'] || keys['arrowleft']) {
        // Strafe left: rotate forward direction 90 degrees counterclockwise
        moveX -= Math.cos(currentRotation) * currentSpeed
        moveZ += Math.sin(currentRotation) * currentSpeed
      }
      // D or ArrowRight - Strafe right
      if (keys['d'] || keys['arrowright']) {
        // Strafe right: rotate forward direction 90 degrees clockwise
        moveX += Math.cos(currentRotation) * currentSpeed
        moveZ -= Math.sin(currentRotation) * currentSpeed
      }

      // Normalize diagonal movement to maintain consistent speed
      if (moveX !== 0 && moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ)
        moveX = (moveX / length) * currentSpeed
        moveZ = (moveZ / length) * currentSpeed
      }

      // IMPORTANT: Reset velocity to zero if no keys are pressed (prevent auto-movement)
      // Only keep Y velocity if jumping, otherwise reset everything
      const newVelocity = [moveX, 0, moveZ]

      // Space for jump
      if (keys[' '] && !currentIsJumping && currentPosition[1] <= 0.1) {
        newVelocity[1] = jumpHeight
        usePlayerStore.setState({ isJumping: true })
      } else if (currentIsJumping || currentPosition[1] > 0) {
        // Apply gravity only if jumping or in air
        newVelocity[1] = currentVelocity[1] + gravity
      } else {
        // Reset Y velocity when on ground and not jumping
        newVelocity[1] = 0
        if (currentIsJumping) {
          usePlayerStore.setState({ isJumping: false })
        }
      }

      // Ground collision - prevent falling below floor
      if (currentPosition[1] <= 0 && newVelocity[1] < 0) {
        newVelocity[1] = 0
        usePlayerStore.setState({ isJumping: false })
      }

      // Only update velocity if it changed (prevents unnecessary updates)
      if (newVelocity[0] !== currentVelocity[0] || 
          newVelocity[1] !== currentVelocity[1] || 
          newVelocity[2] !== currentVelocity[2]) {
        usePlayerStore.setState({ velocity: newVelocity })
      }
    }

    const interval = setInterval(updateMovement, 16) // ~60fps

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearInterval(interval)
    }
  }, [])

  // Update position based on velocity with collision detection
  useFrame(() => {
    if (!playerRef.current) return

    const currentState = usePlayerStore.getState()
    const currentPos = currentState.position
    const currentVel = currentState.velocity
    const isJumping = currentState.isJumping

    // Reset velocity if all movement keys are released (prevent auto-movement)
    if (currentVel[0] === 0 && currentVel[1] === 0 && currentVel[2] === 0 && !isJumping) {
      // Only update if position is wrong
      const floorY = getFloorY(0)
      if (Math.abs(currentPos[1] - floorY) > 0.1) {
        setPosition([currentPos[0], floorY, currentPos[2]])
        playerRef.current.position.set(currentPos[0], floorY, currentPos[2])
      }
      return
    }

    // Calculate new position
    let newPos = [
      currentPos[0] + currentVel[0],
      currentPos[1] + currentVel[1],
      currentPos[2] + currentVel[2],
    ]

    // Check collision with walls (only check X and Z, not Y)
    const correctedPos = checkCollision(currentPos, newPos, 0)
    newPos[0] = correctedPos[0]
    newPos[2] = correctedPos[2]

    // Handle floor-based Y position
    const floorY = getFloorY(0)
    
    // Snap to floor level when not jumping
    if (!isJumping && Math.abs(newPos[1] - floorY) < 0.1) {
      newPos[1] = floorY
    }

    // Ground collision - prevent falling below floor
    if (newPos[1] < floorY) {
      newPos[1] = floorY
      usePlayerStore.setState({ isJumping: false, velocity: [currentVel[0], 0, currentVel[2]] })
    }

    // Ensure player stays on floor when not jumping
    if (!isJumping) {
      // Snap to floor if close enough
      if (Math.abs(newPos[1] - floorY) < 0.2) {
        newPos[1] = floorY
      }
    }

    // Update position
    setPosition(newPos)
    playerRef.current.position.set(newPos[0], newPos[1], newPos[2])

    // Rotate player based on mouse look (rotation is controlled by mouse)
    playerRef.current.rotation.y = currentState.rotation
  })

  // Ready Player Me avatar URL (replace with your actual avatar URL)
  // You can get this from Ready Player Me dashboard or API
  // Example: const avatarUrl = "https://models.readyplayer.me/YOUR_AVATAR_ID.glb"
  const avatarUrl = null // Set this to your Ready Player Me avatar URL
  const cameraMode = usePlayerStore((state) => state.cameraMode)

  // Hide player avatar in first-person view (show in third-person)
  const showAvatar = cameraMode !== 'first-person'

  return (
    <group ref={playerRef} position={position}>
      {showAvatar && (
        <Suspense fallback={null}>
          {avatarUrl ? (
            <ReadyPlayerMeAvatar avatarUrl={avatarUrl} />
          ) : (
            <PlaceholderAvatar />
          )}
        </Suspense>
      )}
    </group>
  )
}

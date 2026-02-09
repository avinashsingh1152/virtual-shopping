// Boundary box definition (matches ground plane size: 200x200)
const BOUNDARY_SIZE = 100 // Half size (so total is 200x200, from -100 to +100)
const MIN_X = -BOUNDARY_SIZE
const MAX_X = BOUNDARY_SIZE
const MIN_Z = -BOUNDARY_SIZE
const MAX_Z = BOUNDARY_SIZE
const WALL_THICKNESS = 0.5 // Half thickness of walls (walls are 1 unit thick, so 0.5 on each side)

/**
 * Check if a position is within the boundary box
 */
export function isWalkable(x, z, floor) {
  return x >= MIN_X && x <= MAX_X && z >= MIN_Z && z <= MAX_Z
}

/**
 * Check collision and enforce boundary limits (with wall buffer to prevent seeing through)
 */
export function checkCollision(currentPos, newPos, floor) {
  const [newX, newY, newZ] = newPos
  const [currentX, currentY, currentZ] = currentPos

  // Add buffer to prevent player from getting too close to walls (prevents seeing through)
  const PLAYER_RADIUS = 0.5
  const WALL_BUFFER = WALL_THICKNESS + PLAYER_RADIUS

  // Clamp X position to boundary with buffer
  let clampedX = newX
  if (newX < MIN_X + WALL_BUFFER) {
    clampedX = MIN_X + WALL_BUFFER
  } else if (newX > MAX_X - WALL_BUFFER) {
    clampedX = MAX_X - WALL_BUFFER
  }

  // Clamp Z position to boundary with buffer
  let clampedZ = newZ
  if (newZ < MIN_Z + WALL_BUFFER) {
    clampedZ = MIN_Z + WALL_BUFFER
  } else if (newZ > MAX_Z - WALL_BUFFER) {
    clampedZ = MAX_Z - WALL_BUFFER
  }

  // Return clamped position (keep Y unchanged)
  return [clampedX, newY, clampedZ]
}

/**
 * Check if camera position is valid (not too close to walls)
 * Walls are positioned at x=±100 and z=±100 with thickness of 1 unit
 * Inner edge of walls: x=±99.5, z=±99.5
 */
export function checkCameraCollision(cameraPos, playerPos) {
  const [camX, camY, camZ] = cameraPos
  const WALL_THICKNESS = 1 // Wall thickness
  const CAMERA_BUFFER = 0.5 // Buffer to prevent camera from going through walls
  
  // Wall positions (center of walls)
  const WALL_POS_X = 100 // East and West walls
  const WALL_POS_Z = 100 // North and South walls
  
  // Inner edge of walls (facing inward)
  const INNER_EDGE_X = WALL_POS_X - WALL_THICKNESS / 2 // 99.5
  const INNER_EDGE_Z = WALL_POS_Z - WALL_THICKNESS / 2 // 99.5
  
  // Clamp camera X position to stay inside walls with buffer
  let clampedX = camX
  if (camX < -INNER_EDGE_X + CAMERA_BUFFER) {
    clampedX = -INNER_EDGE_X + CAMERA_BUFFER // West wall inner edge + buffer
  } else if (camX > INNER_EDGE_X - CAMERA_BUFFER) {
    clampedX = INNER_EDGE_X - CAMERA_BUFFER // East wall inner edge - buffer
  }

  // Clamp camera Z position to stay inside walls with buffer
  let clampedZ = camZ
  if (camZ < -INNER_EDGE_Z + CAMERA_BUFFER) {
    clampedZ = -INNER_EDGE_Z + CAMERA_BUFFER // South wall inner edge + buffer
  } else if (camZ > INNER_EDGE_Z - CAMERA_BUFFER) {
    clampedZ = INNER_EDGE_Z - CAMERA_BUFFER // North wall inner edge - buffer
  }

  return [clampedX, camY, clampedZ]
}

/**
 * Get the correct Y position based on floor (always 0 for single floor)
 */
export function getFloorY(floor) {
  return 0 // Single floor only
}

/**
 * Check if position is on stairs (always false for single floor)
 */
export function isOnStairs(x, z, y, floor) {
  return false // No stairs in single floor mode
}

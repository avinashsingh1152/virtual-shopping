import { create } from 'zustand'

export const usePlayerStore = create((set) => ({
  position: [0, 0, 0],
  rotation: 0, // Y-axis rotation (horizontal/yaw)
  pitch: 0, // X-axis rotation (vertical/pitch) - for looking up/down
  velocity: [0, 0, 0],
  isJumping: false,
  isInsideShop: false,
  currentShop: null,
  currentFloor: 0, // Current floor (0 = ground, 1 = first, 2 = second)
  cameraMode: 'first-person', // 'first-person' or 'third-person'
  setPosition: (pos) => set({ position: pos }),
  setRotation: (rot) => set({ rotation: rot }),
  setPitch: (pitch) => set({ pitch: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)) }), // Limit pitch to -90 to 90 degrees
  setVelocity: (vel) => set({ velocity: vel }),
  setIsJumping: (jumping) => set({ isJumping: jumping }),
  setIsInsideShop: (inside, shopName = null) => set({ isInsideShop: inside, currentShop: shopName }),
  setCurrentFloor: (floor) => set({ currentFloor: floor }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () => set((state) => {
    // Cycle through: first-person -> third-person -> first-person
    const modes = ['first-person', 'third-person']
    const currentIndex = modes.indexOf(state.cameraMode)
    const nextIndex = (currentIndex + 1) % modes.length
    return { cameraMode: modes[nextIndex] }
  }),
}))

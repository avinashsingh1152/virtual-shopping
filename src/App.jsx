import React, { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import VirtualMall from './components/VirtualMall'
import { TVControlsOverlay, getTVScreenState } from './components/TVScreen'
import GlobalControls from './components/GlobalControls'
import { GLBModelsOverlay } from './components/GLBModelsOverlay'
import { useRoomStore } from './stores/roomStore'

function AppContent() {
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId)
  const [tvState, setTvState] = useState({
    isNear: false,
    audioEnabled: false,
    videoEnabled: false,
    userCount: 0,
    users: [],
    onEnableAudio: null,
    onEnableVideo: null,
    connectionStatus: 'disconnected',
    roomId: null,
    socket: null,
    remoteStreamsCount: 0,
    peerConnectionsCount: 0,
    displayStream: null,
  })
  
  // Make cursor visible in the virtual world
  useEffect(() => {
    // Show cursor by default
    document.body.style.cursor = 'default'
    
    // Prevent cursor from being hidden
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.style.cursor = 'default'
    }
    
    // Initialize current user ID (in a real app, this would come from authentication)
    // For now, generate a unique ID or use a stored one
    const storedUserId = localStorage.getItem('userId') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('userId', storedUserId)
    setCurrentUserId(storedUserId)
  }, [setCurrentUserId])
  
  // Update TV state for overlay
  useEffect(() => {
    const interval = setInterval(() => {
      const state = getTVScreenState()
      setTvState(state)
    }, 100) // Update every 100ms
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 50 }}
        shadows
        gl={{ antialias: true }}
        style={{ cursor: 'default' }}
      >
        <Suspense fallback={null}>
          <VirtualMall />
        </Suspense>
      </Canvas>
      <Loader />
      <GlobalControls />
      <GLBModelsOverlay />
      <TVControlsOverlay
        isNear={tvState.isNear}
        audioEnabled={tvState.audioEnabled}
        videoEnabled={tvState.videoEnabled}
        onEnableAudio={tvState.onEnableAudio}
        onEnableVideo={tvState.onEnableVideo}
        userCount={tvState.userCount}
        users={tvState.users || []}
        connectionStatus={tvState.connectionStatus}
        roomId={tvState.roomId}
        socket={tvState.socket}
        remoteStreamsCount={tvState.remoteStreamsCount}
        peerConnectionsCount={tvState.peerConnectionsCount}
        displayStream={tvState.displayStream}
      />
    </>
  )
}

function App() {
  return <AppContent />
}

export default App

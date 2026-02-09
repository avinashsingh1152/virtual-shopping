import React, { useState, useEffect } from 'react'
import { GLB_FILES } from './FloorGLBModels'

// Map GLB file paths to display names
const GLB_FILE_NAMES = {
  '/glb/Avocado.glb': 'Avocado',
  '/glb/BoomBox.glb': 'BoomBox',
  '/glb/ChronographWatch.glb': 'Chronograph Watch',
  '/glb/DamagedHelmet.glb': 'Damaged Helmet',
  '/glb/Duck.glb': 'Duck',
  '/glb/IridescenceLamp.glb': 'Iridescence Lamp',
  '/glb/MaterialsVariantsShoe.glb': 'Materials Variants Shoe',
  '/glb/RobotExpressive.glb': 'Robot Expressive',
  '/glb/SheenChair.glb': 'Sheen Chair',
  '/glb/Stork.glb': 'Stork',
}

// Convert GLB_FILES array to objects with name and path
const GLB_FILES_WITH_NAMES = GLB_FILES.map(path => ({
  name: GLB_FILE_NAMES[path] || path.split('/').pop().replace('.glb', ''),
  path: path,
}))

export function GLBModelsOverlay() {
  const [loadedModels, setLoadedModels] = useState(new Set())
  const [isVisible, setIsVisible] = useState(true)

  // Check which models are loaded by testing if they can be accessed
  useEffect(() => {
    const checkModels = async () => {
      const loaded = new Set()
      
      for (const model of GLB_FILES_WITH_NAMES) {
        try {
          const response = await fetch(model.path, { method: 'HEAD' })
          if (response.ok) {
            loaded.add(model.path)
          }
        } catch (error) {
          console.warn(`Failed to check ${model.name}:`, error)
        }
      }
      
      setLoadedModels(loaded)
    }
    
    checkModels()
    // Re-check periodically
    const interval = setInterval(checkModels, 2000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 1000,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        📦 Show GLB Models ({GLB_FILES_WITH_NAMES.length})
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: '15px',
      borderRadius: '10px',
      color: 'white',
      zIndex: 1000,
      minWidth: '280px',
      maxHeight: '500px',
      overflowY: 'auto',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #444',
        paddingBottom: '8px'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          📦 GLB Models ({GLB_FILES_WITH_NAMES.length})
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 5px',
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '10px' }}>
        All models displayed on floor in grid layout
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {GLB_FILES_WITH_NAMES.map((model, index) => {
          const isLoaded = loadedModels.has(model.path)
          return (
            <div 
              key={model.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                backgroundColor: isLoaded ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                borderRadius: '5px',
                fontSize: '13px',
                border: `1px solid ${isLoaded ? '#4CAF50' : '#FF9800'}`,
              }}
            >
              {/* Status indicator */}
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isLoaded ? '#4CAF50' : '#FF9800',
                flexShrink: 0
              }} />
              
              {/* Model name */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>
                  {model.name}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                  {model.path}
                </div>
              </div>
              
              {/* Status badge */}
              <div style={{
                fontSize: '10px',
                backgroundColor: isLoaded ? '#4CAF50' : '#FF9800',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontWeight: 'bold'
              }}>
                {isLoaded ? '✓ Loaded' : '⏳ Loading'}
              </div>
            </div>
          )
        })}
      </div>
      
      <div style={{ 
        marginTop: '10px', 
        paddingTop: '10px', 
        borderTop: '1px solid #444',
        fontSize: '11px',
        opacity: 0.7,
        textAlign: 'center'
      }}>
        Models arranged in 3-column grid on floor
      </div>
    </div>
  )
}

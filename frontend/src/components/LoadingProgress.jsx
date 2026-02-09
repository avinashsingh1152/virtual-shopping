import React, { useEffect, useState } from 'react'
import { Html, useProgress } from '@react-three/drei'

export default function LoadingProgress() {
  const { progress, active } = useProgress()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!active && progress === 100) {
      const timer = setTimeout(() => setVisible(false), 500)
      return () => clearTimeout(timer)
    }
    setVisible(active || progress < 100)
  }, [active, progress])

  if (!visible) return null

  return (
    <Html center>
      <div
        style={{
          width: '300px',
          height: '20px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
        Loading {Math.round(progress)}%
      </div>
    </Html>
  )
}

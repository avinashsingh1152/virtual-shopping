import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ShopZoneUI() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '30px 50px',
        borderRadius: '15px',
        border: '2px solid #4facfe',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease-in',
      }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translate(-50%, -60%);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%);
            }
          }
        `}
      </style>
      <h2
        style={{
          margin: '0 0 10px 0',
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Welcome to the Electronics Zone
      </h2>
      <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
        Explore our latest tech products!
      </p>
    </div>,
    document.body
  )
}

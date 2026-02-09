import React from 'react'
import { Html } from '@react-three/drei'

export default function ProductDisplay({ position, product, shopName }) {
  if (!product) return null

  return (
    <group position={position}>
      {/* 3D Product Box */}
      <mesh castShadow>
        <boxGeometry args={[0.6, 1, 0.6]} />
        <meshStandardMaterial 
          color={product.color}
          emissive={product.color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* HTML Overlay for Product Info */}
      <Html
        position={[0, 0.8, 0]}
        center
        distanceFactor={5}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '2px solid #4facfe',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            minWidth: '120px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {product.name}
          </div>
          <div style={{ color: '#4facfe', fontSize: '14px' }}>
            {product.price}
          </div>
        </div>
      </Html>
    </group>
  )
}

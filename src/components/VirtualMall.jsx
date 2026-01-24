import React, { Suspense, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, useTexture, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import Player from './Player'
import Companion from './Companion'
import CompanionAI from './CompanionAI'
import TVScreen from './TVScreen'
import UserVideoGrid from './UserVideoGrid'
import FloorGLBModels from './FloorGLBModels'
import { usePlayerStore } from '../stores/playerStore'
import { checkCameraCollision } from '../utils/collision'
import { fetchCategories, fetchRoomsByCategory, fetchProducts } from '../services/api'

// Wall image constants
const WALL_IMAGES = {
  north: 'http://localhost:3001/api/products/files/northwall.avif',
  south: 'http://localhost:3001/api/products/files/file/southwall.jpg',
  east: 'http://localhost:3001/api/products/files/file/eastwall.avif',
  west: 'http://localhost:3001/api/products/files/westwall.webp',
}

export default function VirtualMall() {
  const playerPosition = usePlayerStore((state) => state.position)
  
  // State for categories and rooms from API
  const [categories, setCategories] = useState([])
  const [roomsByCategory, setRoomsByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  // State for generated images
  const [productImagesByCategory, setProductImagesByCategory] = useState({})
  // State for products loaded from Products API
  const [products, setProducts] = useState([])
  
  // Calculate total product slots available
  // 4 walls * 23 racks per wall (excluding corners) * 3 shelves per rack = 276 total slots
  const RACKS_PER_WALL = 25
  const ACTIVE_RACKS_PER_WALL = 23 // Excluding corner racks (first and last)
  const SHELVES_PER_RACK = 3
  const TOTAL_WALLS = 4
  const TOTAL_PRODUCT_SLOTS = TOTAL_WALLS * ACTIVE_RACKS_PER_WALL * SHELVES_PER_RACK // 276 total slots
  
  // Fetch categories, rooms, and products on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Fetch all categories - same way as curl: GET http://localhost:3004/api/rooms
        const categoriesData = await fetchCategories()
        const categoriesList = categoriesData.categories || []
        setCategories(categoriesList)
        
        // Fetch rooms for each category - using only the FIRST room from each category
        // API: GET http://localhost:3004/api/rooms/<category>
        const roomsData = {}
        
        for (const category of categoriesList) {
          const roomsResponse = await fetchRoomsByCategory(category)
          const allRooms = roomsResponse.rooms || []
          
          // Store all rooms for the category
          roomsData[category] = allRooms
        }
        
        setRoomsByCategory(roomsData)
        
        // Fetch products from Products API
        try {
          const productsData = await fetchProducts({
            page: 1,
            limit: TOTAL_PRODUCT_SLOTS, // Only fetch as many as we can display
            sortBy: 'price',
            order: 'desc'
          })
          
          // Use products array from response, or empty array if not available
          const fetchedProducts = productsData.products || productsData.data || []
          
          // Normalize products to ensure they have required fields
          const normalizedProducts = fetchedProducts.map((product, index) => ({
            id: product.id || product._id || `product-${index}`,
            name: product.name || product.title || 'Product',
            category: product.category || product.categoryName || 'General',
            imageUrl: product.imageUrl || product.image || product.thumbnail || null,
            modelUrl: product.modelUrl || product.model || null,
            price: product.price || 0,
            description: product.description || '',
            ...product // Include all other fields
          }))
          
          // Limit to available slots (remove extra products)
          const limitedProducts = normalizedProducts.slice(0, TOTAL_PRODUCT_SLOTS)
          
          setProducts(limitedProducts)
          console.log(`Loaded ${limitedProducts.length} products from API (max ${TOTAL_PRODUCT_SLOTS} slots available)`)
        } catch (error) {
          console.error('Error fetching products from API:', error)
          // Continue with empty products array, will use fallback
        }
        
      } catch (error) {
        console.error('Error loading categories and rooms:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  
  // Helper function to get product image URL (handles API product structure)
  const getProductImageUrl = (product) => {
    if (!product) return null
    // Priority: 1. product.imageUrl, 2. product.image, 3. generated category image, 4. fallbackImageUrl
    if (product.imageUrl) {
      return product.imageUrl
    }
    if (product.image) {
      // Handle relative paths - convert to full URL if needed
      if (product.image.startsWith('http')) {
        return product.image
      }
      // Assume it's a path relative to API base
      const PRODUCTS_API_BASE_URL = import.meta.env.VITE_PRODUCTS_API_BASE_URL || 'http://localhost:3006'
      return `${PRODUCTS_API_BASE_URL}${product.image.startsWith('/') ? '' : '/'}${product.image}`
    }
    if (product.category && productImagesByCategory[product.category]) {
      return productImagesByCategory[product.category]
    }
    return product.fallbackImageUrl || product.thumbnail || null
  }
  
  // Fallback products if Gemini API fails or no products loaded
  const fallbackProducts = [
    {
      id: 'product-fallback-1',
      category: 'Electronics',
      fallbackImageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      modelUrl: null,
    },
    {
      id: 'product-fallback-2',
      category: 'Fashion',
      fallbackImageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      modelUrl: null,
    },
  ]
  
  // Use products from API, limit to available slots, or fallback if empty
  // Only use products that fit in the available slots
  const displayProducts = products.length > 0 
    ? products.slice(0, TOTAL_PRODUCT_SLOTS) // Limit to available slots
    : fallbackProducts

  // Helper function to get product for a specific slot across all walls
  // wallIndex: 0=north, 1=south, 2=east, 3=west
  // rackIndex: 0-24 (but we skip 0 and 24, so effective 1-23)
  // shelfIndex: 0=bottom, 1=middle, 2=top
  const getProductForSlot = (wallIndex, rackIndex, shelfIndex) => {
    if (displayProducts.length === 0) return null
    
    // Calculate global slot index
    // Each wall has 23 active racks * 3 shelves = 69 slots
    const slotsPerWall = ACTIVE_RACKS_PER_WALL * SHELVES_PER_RACK
    const wallOffset = wallIndex * slotsPerWall
    const rackOffset = (rackIndex - 1) * SHELVES_PER_RACK // -1 because we skip rack 0
    const globalSlotIndex = wallOffset + rackOffset + shelfIndex
    
    // Use product at this index, cycling if needed
    return displayProducts[globalSlotIndex % displayProducts.length]
  }
  
  // State to track which products are clicked (showing 3D model)
  const [clickedProducts, setClickedProducts] = React.useState(new Set())
  
  const handleProductClick = (productId) => {
    setClickedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId) // Toggle off
      } else {
        newSet.add(productId) // Toggle on
      }
      return newSet
    })
  }

  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        color="#ffffff"
      />

      {/* Premium Tiled Floor */}
      <Suspense fallback={
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
      }>
        <TiledFloor />
      </Suspense>

      {/* GLB Models on Floor - All models from public/glb folder */}
      <Suspense fallback={null}>
        <FloorGLBModels />
      </Suspense>

      {/* Border Walls - All Four Sides */}
      {/* Wall height is 5x man height: 1.9m (man) * 5 = 9.5m */}
      {/* Wall center at Y = 9.5 / 2 = 4.75 */}
      {/* North Wall (positive Z) - With Premium Tile Image */}
      <Suspense fallback={
        <mesh position={[0, 4.75, -100]} castShadow receiveShadow>
          <boxGeometry args={[200, 9.5, 1]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      }>
        <WallWithTexture 
          position={[0, 4.75, -100]} 
          rotation={[0, 0, 0]}
          width={200}
          height={9.5}
          depth={1}
          imageUrl={WALL_IMAGES.north}
        />
      </Suspense>
      
      {/* TV Screen on North Wall - Moved forward to avoid wall clipping - Connected to Socket.IO */}
      <Suspense fallback={null}>
        <TVScreen 
          position={[0, 3, -95]} 
          rotation={[0, 0, 0]}
        />
      </Suspense>
      
      {/* User Video Grid - Google Meet style display of all users */}
      <Suspense fallback={null}>
        <UserVideoGrid 
          position={[0, 8, -92]} 
          rotation={[0, 0, 0]}
        />
      </Suspense>
      
      {/* North Wall Racks - Multiple shelves for products - Cover entire wall */}
      {Array.from({ length: 25 }, (_, i) => {
        // Skip corner racks (first and last) to avoid overlap with side walls
        if (i === 0 || i === 24) return null
        
        
        // Cover entire 200 unit wall from -100 to +100, spacing racks evenly
        // 25 racks with 24 intervals: spacing = 200 / 24 = 8.333...
        const rackX = -100 + (i * (200 / 24)) // 25 racks evenly spaced, covers full 200 units
        const rackZ = -99.0 // In front of North wall (negative Z, facing south)
        // Select product for each shelf using global slot index
        const productBottom = getProductForSlot(0, i, 0) // North wall (0), rack i, bottom shelf (0)
        const productMiddle = getProductForSlot(0, i, 1) // North wall (0), rack i, middle shelf (1)
        const productTop = getProductForSlot(0, i, 2) // North wall (0), rack i, top shelf (2)
        
        if (!productBottom || !productMiddle || !productTop) return null
        
        const productIdBottom = `${productBottom.id}-north-${i}-bottom`
        const productIdMiddle = `${productMiddle.id}-north-${i}-middle`
        const productIdTop = `${productTop.id}-north-${i}-top`
        return (
          <React.Fragment key={`north-rack-${i}`}>
            {/* Bottom shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 1.2, rackZ]} 
                rotation={[0, 0, 0]}
                width={8}
                product={productBottom}
                productIndex={i * 3}
                productId={productIdBottom}
                isClicked={clickedProducts.has(productIdBottom)}
                onProductClick={() => handleProductClick(productIdBottom)}
                imageUrl={getProductImageUrl(productBottom)}
              />
            </Suspense>
            {/* Middle shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 3.5, rackZ]} 
                rotation={[0, 0, 0]}
                width={8}
                product={productMiddle}
                productIndex={i * 3 + 1}
                productId={productIdMiddle}
                isClicked={clickedProducts.has(productIdMiddle)}
                onProductClick={() => handleProductClick(productIdMiddle)}
                imageUrl={getProductImageUrl(productMiddle)}
              />
            </Suspense>
            {/* Top shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 6.0, rackZ]} 
                rotation={[0, 0, 0]}
                width={8}
                product={productTop}
                productIndex={i * 3 + 2}
                productId={productIdTop}
                isClicked={clickedProducts.has(productIdTop)}
                onProductClick={() => handleProductClick(productIdTop)}
                imageUrl={getProductImageUrl(productTop)}
              />
            </Suspense>
          </React.Fragment>
        )
      })}

      {/* South Wall (negative Z) - With Premium Tile Image */}
      <Suspense fallback={
        <mesh position={[0, 4.75, 100]} castShadow receiveShadow>
          <boxGeometry args={[200, 9.5, 1]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      }>
        <WallWithTexture 
          position={[0, 4.75, 100]} 
          rotation={[0, Math.PI, 0]}
          width={200}
          height={9.5}
          depth={1}
          imageUrl={WALL_IMAGES.south}
        />
      </Suspense>
      
      {/* South Wall Racks - Multiple shelves for products - Cover entire wall */}
      {Array.from({ length: 25 }, (_, i) => {
        // Skip corner racks (first and last) to avoid overlap with side walls
        if (i === 0 || i === 24) return null
        
        
        // Cover entire 200 unit wall from -100 to +100, spacing racks evenly
        // 25 racks with 24 intervals: spacing = 200 / 24 = 8.333...
        const rackX = -100 + (i * (200 / 24)) // 25 racks evenly spaced, covers full 200 units
        const rackZ = 99.0 // In front of South wall (positive Z, facing north)
        // Select product for each shelf using global slot index
        const productBottom = getProductForSlot(1, i, 0) // South wall (1), rack i, bottom shelf (0)
        const productMiddle = getProductForSlot(1, i, 1) // South wall (1), rack i, middle shelf (1)
        const productTop = getProductForSlot(1, i, 2) // South wall (1), rack i, top shelf (2)
        
        if (!productBottom || !productMiddle || !productTop) return null
        
        const productIdBottom = `${productBottom.id}-south-${i}-bottom`
        const productIdMiddle = `${productMiddle.id}-south-${i}-middle`
        const productIdTop = `${productTop.id}-south-${i}-top`
        return (
          <React.Fragment key={`south-rack-${i}`}>
            {/* Bottom shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 1.2, rackZ]} 
                rotation={[0, Math.PI, 0]} // Face inward (north)
                width={8}
                product={productBottom}
                productIndex={i * 3}
                productId={productIdBottom}
                isClicked={clickedProducts.has(productIdBottom)}
                onProductClick={() => handleProductClick(productIdBottom)}
                imageUrl={getProductImageUrl(productBottom)}
              />
            </Suspense>
            {/* Middle shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 3.5, rackZ]} 
                rotation={[0, Math.PI, 0]} // Face inward (north)
                width={8}
                product={productMiddle}
                productIndex={i * 3 + 1}
                productId={productIdMiddle}
                isClicked={clickedProducts.has(productIdMiddle)}
                onProductClick={() => handleProductClick(productIdMiddle)}
                imageUrl={getProductImageUrl(productMiddle)}
              />
            </Suspense>
            {/* Top shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 6.0, rackZ]} 
                rotation={[0, Math.PI, 0]} // Face inward (north)
                width={8}
                product={productTop}
                productIndex={i * 3 + 2}
                productId={productIdTop}
                isClicked={clickedProducts.has(productIdTop)}
                onProductClick={() => handleProductClick(productIdTop)}
                imageUrl={getProductImageUrl(productTop)}
              />
            </Suspense>
          </React.Fragment>
        )
      })}

      {/* East Wall (positive X) - With Premium Tile Image */}
      <Suspense fallback={
        <mesh position={[-100, 4.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 9.5, 200]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      }>
        <WallWithTexture 
          position={[-100, 4.75, 0]} 
          rotation={[0, -Math.PI / 2, 0]}
          width={200}
          height={9.5}
          depth={1}
          imageUrl={WALL_IMAGES.east}
        />
      </Suspense>
      {/* East Wall Racks - Multiple shelves for products - Cover entire wall */}
      {Array.from({ length: 25 }, (_, i) => {
        // Skip corner racks (first and last) to avoid overlap with side walls
        if (i === 0 || i === 24) return null
        
        // Cover entire 200 unit wall from -100 to +100, spacing racks evenly
        // 25 racks with 24 intervals: spacing = 200 / 24 = 8.333...
        const rackZ = -100 + (i * (200 / 24)) // 25 racks evenly spaced, covers full 200 units
        const rackX = 99.0 // In front of East wall (positive X, facing west toward center)
        // Select product for each shelf using global slot index
        const productBottom = getProductForSlot(2, i, 0) // East wall (2), rack i, bottom shelf (0)
        const productMiddle = getProductForSlot(2, i, 1) // East wall (2), rack i, middle shelf (1)
        const productTop = getProductForSlot(2, i, 2) // East wall (2), rack i, top shelf (2)
        
        if (!productBottom || !productMiddle || !productTop) return null
        
        const productIdBottom = `${productBottom.id}-east-${i}-bottom`
        const productIdMiddle = `${productMiddle.id}-east-${i}-middle`
        const productIdTop = `${productTop.id}-east-${i}-top`
        return (
          <React.Fragment key={`east-rack-${i}`}>
            {/* Bottom shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 1.2, rackZ]} 
                rotation={[0, -Math.PI / 2, 0]} // Face inward (west toward center)
                width={8}
                product={productBottom}
                productIndex={i * 3}
                productId={productIdBottom}
                isClicked={clickedProducts.has(productIdBottom)}
                onProductClick={() => handleProductClick(productIdBottom)}
                imageUrl={getProductImageUrl(productBottom)}
              />
            </Suspense>
            {/* Middle shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 3.5, rackZ]} 
                rotation={[0, -Math.PI / 2, 0]} // Face inward (west toward center)
                width={8}
                product={productMiddle}
                productIndex={i * 3 + 1}
                productId={productIdMiddle}
                isClicked={clickedProducts.has(productIdMiddle)}
                onProductClick={() => handleProductClick(productIdMiddle)}
                imageUrl={getProductImageUrl(productMiddle)}
              />
            </Suspense>
            {/* Top shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 6.0, rackZ]} 
                rotation={[0, -Math.PI / 2, 0]} // Face inward (west toward center)
                width={8}
                product={productTop}
                productIndex={i * 3 + 2}
                productId={productIdTop}
                isClicked={clickedProducts.has(productIdTop)}
                onProductClick={() => handleProductClick(productIdTop)}
                imageUrl={getProductImageUrl(productTop)}
              />
            </Suspense>
          </React.Fragment>
        )
      })}

      {/* West Wall (negative X) - With Premium Tile Image */}
      <Suspense fallback={
        <mesh position={[100, 4.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 9.5, 200]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      }>
        <WallWithTexture 
          position={[100, 4.75, 0]} 
          rotation={[0, Math.PI / 2, 0]}
          width={200}
          height={9.5}
          depth={1}
          imageUrl={WALL_IMAGES.west}
        />
      </Suspense>
      
      {/* West Wall Racks - Multiple shelves for products - Cover entire wall */}
      {Array.from({ length: 25 }, (_, i) => {
        // Skip corner racks (first and last) to avoid overlap with side walls
        if (i === 0 || i === 24) return null
        
        // Cover entire 200 unit wall from -100 to +100, spacing racks evenly
        // 25 racks with 24 intervals: spacing = 200 / 24 = 8.333...
        const rackZ = -100 + (i * (200 / 24)) // 25 racks evenly spaced, covers full 200 units
        const rackX = -99.0 // In front of West wall (negative X, facing east)
        // Select product for each shelf using global slot index
        const productBottom = getProductForSlot(3, i, 0) // West wall (3), rack i, bottom shelf (0)
        const productMiddle = getProductForSlot(3, i, 1) // West wall (3), rack i, middle shelf (1)
        const productTop = getProductForSlot(3, i, 2) // West wall (3), rack i, top shelf (2)
        
        if (!productBottom || !productMiddle || !productTop) return null
        
        const productIdBottom = `${productBottom.id}-west-${i}-bottom`
        const productIdMiddle = `${productMiddle.id}-west-${i}-middle`
        const productIdTop = `${productTop.id}-west-${i}-top`
        return (
          <React.Fragment key={`west-rack-${i}`}>
            {/* Bottom shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 1.2, rackZ]} 
                rotation={[0, Math.PI / 2, 0]} // Face inward (east)
                width={8}
                product={productBottom}
                productIndex={i * 3}
                productId={productIdBottom}
                isClicked={clickedProducts.has(productIdBottom)}
                onProductClick={() => handleProductClick(productIdBottom)}
                imageUrl={getProductImageUrl(productBottom)}
              />
            </Suspense>
            {/* Middle shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 3.5, rackZ]} 
                rotation={[0, Math.PI / 2, 0]} // Face inward (east)
                width={8}
                product={productMiddle}
                productIndex={i * 3 + 1}
                productId={productIdMiddle}
                isClicked={clickedProducts.has(productIdMiddle)}
                onProductClick={() => handleProductClick(productIdMiddle)}
                imageUrl={getProductImageUrl(productMiddle)}
              />
            </Suspense>
            {/* Top shelf */}
            <Suspense fallback={null}>
              <WallRack 
                position={[rackX, 6.0, rackZ]} 
                rotation={[0, Math.PI / 2, 0]} // Face inward (east)
                width={8}
                product={productTop}
                productIndex={i * 3 + 2}
                productId={productIdTop}
                isClicked={clickedProducts.has(productIdTop)}
                onProductClick={() => handleProductClick(productIdTop)}
                imageUrl={getProductImageUrl(productTop)}
              />
            </Suspense>
          </React.Fragment>
        )
      })}

      {/* Corner Covers - Prevent user from entering corners */}
      {/* North-East corner (positive X, positive Z) */}
      <mesh position={[100, 1.0, 100]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          color="#6B6B6B" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* North-West corner (negative X, positive Z) */}
      <mesh position={[-100, 1.0, 100]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          color="#6B6B6B" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* South-East corner (positive X, negative Z) */}
      <mesh position={[100, 1.0, -100]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          color="#6B6B6B" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* South-West corner (negative X, negative Z) */}
      <mesh position={[-100, 1.0, -100]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          color="#6B6B6B" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Player */}
      <Suspense fallback={null}>
        <Player />
      </Suspense>

      {/* Companion - Follows the player */}
      <Suspense fallback={null}>
        <Companion />
      </Suspense>

      {/* Companion AI - Handles voice interaction with NPC */}
      <CompanionAI />

      {/* Camera System */}
      <CameraSystem target={playerPosition} />
    </>
  )
}

// Floor Texture Component - Inner component that uses useTexture hook
function FloorTextureContent() {
  const tileTextureUrl = 'https://as2.ftcdn.net/jpg/09/43/90/51/1000_F_943905125_lQrJHC8GGZkJtkMFfuqGQI8zXMudSQdu.jpg'
  
  // useTexture must be called unconditionally (it's a hook)
  const tileTexture = useTexture(tileTextureUrl)
  
  // Configure texture to tile/repeat seamlessly
  tileTexture.wrapS = THREE.RepeatWrapping
  tileTexture.wrapT = THREE.RepeatWrapping
  // Repeat texture 20 times across 200 units (10 units per tile = good scale)
  // This makes each tile approximately 10x10 units, which looks premium
  tileTexture.repeat.set(20, 20)
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial 
        map={tileTexture}
        color="#ffffff"
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  )
}

// Premium Tiled Floor Component - Wrapped in Suspense
function TiledFloor() {
  return (
    <Suspense fallback={
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    }>
      <FloorTextureContent />
    </Suspense>
  )
}

// Wall Texture Component - Inner component that uses useTexture hook
function WallTextureContent({ position, rotation, width, height, depth, imageUrl }) {
  const [textureError, setTextureError] = React.useState(false)
  const [texture, setTexture] = React.useState(null)
  
  // Create gradient material for fallback
  const gradientMaterial = React.useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    // Create gradient from top to bottom
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#e8e8e8') // Light gray at top
    gradient.addColorStop(1, '#d0d0d0') // Slightly darker gray at bottom
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
    
    const gradientTexture = new THREE.CanvasTexture(canvas)
    gradientTexture.wrapS = THREE.RepeatWrapping
    gradientTexture.wrapT = THREE.RepeatWrapping
    gradientTexture.repeat.set(10, height / 5)
    
    return gradientTexture
  }, [height])
  
  React.useEffect(() => {
    if (!imageUrl) {
      setTextureError(true)
      setTexture(null)
      return
    }
    
    // Try to load texture manually to handle errors gracefully
    const loader = new THREE.TextureLoader()
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping
        loadedTexture.wrapT = THREE.RepeatWrapping
        loadedTexture.repeat.set(10, height / 5)
        setTexture(loadedTexture)
        setTextureError(false)
      },
      undefined,
      (error) => {
        console.error('Error loading wall texture:', error)
        setTextureError(true)
        setTexture(null)
      }
    )
  }, [imageUrl, height])
  
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial 
        map={textureError || !texture ? gradientMaterial : texture}
        color="#d0d0d0"
        roughness={0.6}
        metalness={0.05}
      />
    </mesh>
  )
}

// Wall Component with Texture - Wrapped in Suspense
function WallWithTexture({ position, rotation, width, height, depth, imageUrl }) {
  // Create gradient material for fallback
  const gradientMaterial = React.useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    // Create gradient from top to bottom
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#e8e8e8') // Light gray at top
    gradient.addColorStop(1, '#d0d0d0') // Slightly darker gray at bottom
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
    
    const gradientTexture = new THREE.CanvasTexture(canvas)
    gradientTexture.wrapS = THREE.RepeatWrapping
    gradientTexture.wrapT = THREE.RepeatWrapping
    gradientTexture.repeat.set(10, height / 5)
    
    return gradientTexture
  }, [height])
  
  return (
    <Suspense fallback={
      <mesh position={position} rotation={rotation} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          map={gradientMaterial}
          color="#d0d0d0"
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>
    }>
      <WallTextureContent
        position={position}
        rotation={rotation}
        width={width}
        height={height}
        depth={depth}
        imageUrl={imageUrl}
      />
    </Suspense>
  )
}

// 3D Product Model Loader - Loads GLTF/GLB models
// Note: This component should only be rendered when modelUrl is valid (checked in ProductModel3D)
function ProductModelLoader({ modelUrl, productIndex }) {
  // useGLTF hook - will throw error if URL is invalid, caught by Suspense
  const { scene } = useGLTF(modelUrl)
  
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
  
  if (scene) {
    // Calculate bounding box to scale model appropriately
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z)
    const scale = maxSize > 0 ? 0.8 / maxSize : 1 // Scale to fit within 0.8 units
    
    return <primitive object={scene.clone()} scale={scale} />
  }
  
  return null
}

// 3D Product Model Component - Loads and displays 3D GLTF/GLB models
function ProductModel3D({ position, wallRotation, modelUrl, productIndex = 0 }) {
  // Products should face toward the center of the room
  let productRotation = [0, 0, 0]
  if (wallRotation && Array.isArray(wallRotation)) {
    const yRotation = wallRotation[1] || 0
    productRotation = [0, yRotation + Math.PI / 2, 0]
  }
  
  // Fallback to simple 3D shapes if no URL or URL is null
  // These shapes work without external loading
  const fallbackShape = (
    <>
      {productIndex % 3 === 0 ? (
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#4a90e2" roughness={0.5} metalness={0.3} />
        </mesh>
      ) : productIndex % 3 === 1 ? (
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#e24a4a" roughness={0.5} metalness={0.3} />
        </mesh>
      ) : (
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.4, 1, 32]} />
          <meshStandardMaterial color="#4ae24a" roughness={0.5} metalness={0.3} />
        </mesh>
      )}
    </>
  )
  
  // Only try to load 3D model if URL is provided and valid
  if (!modelUrl || modelUrl === null || modelUrl === '') {
    return (
      <group position={position} rotation={productRotation}>
        {fallbackShape}
      </group>
    )
  }
  
  // Try to load 3D model, with fallback
  return (
    <group position={position} rotation={productRotation}>
      <Suspense fallback={fallbackShape}>
        <ProductModelLoader modelUrl={modelUrl} productIndex={productIndex} />
      </Suspense>
    </group>
  )
}

// Default fallback image URL - using a reliable placeholder service
const DEFAULT_PRODUCT_IMAGE = 'https://via.placeholder.com/500x500/cccccc/666666?text=Product'

// Product Image Display Component - Shows 2D product image (initial view)
// Product Image Display with Error Handling
function ProductImageDisplayWrapper({ position, wallRotation, imageUrl, width = 1.5, height = 1.5, onClick }) {
  const [texture, setTexture] = React.useState(null)
  const [hasError, setHasError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Load texture manually with error handling
  React.useEffect(() => {
    if (!imageUrl) {
      setHasError(true)
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setHasError(false)
    
    const loader = new THREE.TextureLoader()
    loader.load(
      imageUrl,
      (loadedTexture) => {
        setTexture(loadedTexture)
        setIsLoading(false)
        setHasError(false)
      },
      undefined,
      (error) => {
        console.warn('Failed to load product image, using default:', imageUrl, error)
        // Try to load default image
        loader.load(
          DEFAULT_PRODUCT_IMAGE,
          (defaultTexture) => {
            setTexture(defaultTexture)
            setIsLoading(false)
            setHasError(false)
          },
          undefined,
          (defaultError) => {
            console.error('Failed to load default image:', defaultError)
            setHasError(true)
            setIsLoading(false)
          }
        )
      }
    )
    
    // Cleanup
    return () => {
      if (texture) {
        texture.dispose()
      }
    }
  }, [imageUrl])
  
  // Products should face toward the center of the room
  let productRotation = [0, Math.PI, 0] // Default: face south/east/west (width-wise display)
  if (wallRotation && Array.isArray(wallRotation)) {
    const yRotation = wallRotation[1] || 0
    // All walls should display width-wise (along X-axis), not depth-wise (along Z-axis)
    if (Math.abs(yRotation) < 0.1) {
      // North wall - face south (width-wise display)
      productRotation = [0, Math.PI, 0]
    } else if (Math.abs(yRotation - Math.PI / 2) < 0.1) {
      // West wall - face east (width-wise display)
      productRotation = [0, Math.PI, 0]
    } else if (Math.abs(yRotation - Math.PI) < 0.1 || Math.abs(yRotation + Math.PI) < 0.1) {
      // South wall - face north (width-wise display)
      productRotation = [0, 0, 0]
    } else if (Math.abs(yRotation + Math.PI / 2) < 0.1) {
      // East wall - face west (width-wise display)
      productRotation = [0, Math.PI, 0]
    } else {
      // Fallback: use wall rotation + Math.PI/2
      productRotation = [0, yRotation + Math.PI / 2, 0]
    }
  }
  
  // Show loading or error state
  if (isLoading) {
    return (
      <mesh position={position} rotation={productRotation} castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    )
  }
  
  if (hasError && !texture) {
    return (
      <mesh position={position} rotation={productRotation} castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial 
          color="#888888"
          emissive="#444444"
          emissiveIntensity={0.3}
        />
      </mesh>
    )
  }
  
  return (
    <mesh 
      position={position} 
      rotation={productRotation} 
      castShadow
      onClick={(e) => {
        e.stopPropagation()
        if (onClick) onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'default'
      }}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial 
        map={texture}
        color="#ffffff"
        transparent={true}
        roughness={0.3}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Product Display Component - Shows image initially, 3D model after click
function ProductDisplay({ position, wallRotation, product, productIndex = 0, isClicked = false, onClick, imageUrl }) {
  // Check if product exists
  if (!product) {
    return (
      <mesh position={position} castShadow>
        <boxGeometry args={[1.2, 1.2, 0.1]} />
        <meshStandardMaterial color="#ff0000" /> {/* Red placeholder for missing product */}
      </mesh>
    )
  }
  
  // Show 3D model if clicked and model URL exists, otherwise show image
  const show3D = isClicked && product.modelUrl
  
  if (show3D) {
    return (
      <Suspense fallback={
        <group position={position} rotation={wallRotation ? [0, wallRotation[1] + Math.PI / 2, 0] : [0, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
        </group>
      }>
        <ProductModel3D 
          position={position}
          wallRotation={wallRotation}
          modelUrl={product.modelUrl}
          productIndex={productIndex}
        />
      </Suspense>
    )
  }
  
  // Use provided imageUrl or fallback to product.imageUrl or product.fallbackImageUrl
  const finalImageUrl = imageUrl || product.imageUrl || product.fallbackImageUrl
  
  // Show image initially - wrap in ErrorBoundary equivalent (Suspense)
  if (!finalImageUrl) {
    return (
      <mesh position={position} castShadow>
        <boxGeometry args={[1.2, 1.2, 0.1]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.3} /> {/* Orange placeholder for missing image */}
      </mesh>
    )
  }
  
  // ProductImageDisplayWrapper already has Suspense, so no need to wrap again
  return (
    <ProductImageDisplayWrapper
      position={position}
      wallRotation={wallRotation}
      imageUrl={finalImageUrl}
      onClick={onClick}
    />
  )
}

// Wall Rack Component - Shelf for displaying products (simple rectangular shape)
// Single rack below the product (image or 3D model)
function WallRack({ position, rotation, width = 10, depth = 1.2, height = 0.15, product, productIndex = 0, productId, isClicked = false, onProductClick, imageUrl }) {
  const productHeight = 1.5 // Height of product display
  const gap = 0.2 // Gap between rack and product
  const collisionBlockHeight = 2.0 // Height of collision blocks to prevent entry
  const collisionBlockDepth = 0.3 // Depth of collision blocks
  
  return (
    <group position={position} rotation={rotation}>
      {/* Single rack - below the product - increased depth for better visibility */}
      <mesh position={[0, -productHeight / 2 - gap - height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color="#8B7355" 
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* Collision blocks - prevent user from entering rack area */}
      {/* Front collision block (facing away from wall) */}
      <mesh 
        position={[0, collisionBlockHeight / 2, depth / 2 + collisionBlockDepth / 2]} 
        visible={false} // Invisible but still has collision
      >
        <boxGeometry args={[width + 0.2, collisionBlockHeight, collisionBlockDepth]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
      
      {/* Left side collision block */}
      <mesh 
        position={[-width / 2 - collisionBlockDepth / 2, collisionBlockHeight / 2, 0]} 
        visible={false}
      >
        <boxGeometry args={[collisionBlockDepth, collisionBlockHeight, depth + 0.2]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
      
      {/* Right side collision block */}
      <mesh 
        position={[width / 2 + collisionBlockDepth / 2, collisionBlockHeight / 2, 0]} 
        visible={false}
      >
        <boxGeometry args={[collisionBlockDepth, collisionBlockHeight, depth + 0.2]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
      
      {/* Product display - above the rack, centered in depth */}
      {/* Shows image initially, 3D model after click */}
      {product ? (
        <ProductDisplay
          position={[0, 0, 0]} // Centered (x=0, y=0, z=0) - in the center of rack depth
          wallRotation={rotation}
          product={product}
          productIndex={productIndex}
          isClicked={isClicked}
          onClick={onProductClick}
          imageUrl={imageUrl}
        />
      ) : (
        // Fallback if product is missing
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.2, 1.2, 0.1]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} /> {/* Red placeholder - visible */}
        </mesh>
      )}
    </group>
  )
}

// Loading overlay component (outside Canvas)
export function LoadingOverlay() {
  return null
}

function CameraSystem({ target }) {
  const cameraRef = React.useRef()
  const cameraMode = usePlayerStore((state) => state.cameraMode)
  // Don't subscribe to rotation/pitch here - get them in useFrame to avoid unnecessary re-renders

  // Handle camera mode toggle with 'V' key
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      // Only toggle if V key is pressed and not in an input field
      if (e.key.toLowerCase() === 'v' && e.target === document.body) {
        e.preventDefault()
        usePlayerStore.getState().toggleCameraMode()
      }
    }

    window.addEventListener('keydown', handleKeyPress, true) // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyPress, true)
  }, [])

  useFrame(() => {
    if (!cameraRef.current) return

    const camera = cameraRef.current

    // Get current player state once per frame
    const currentState = usePlayerStore.getState()
    const currentPlayerRotation = currentState.rotation
    const currentPlayerPitch = currentState.pitch

    // Update FOV based on camera mode
    // First-person: slightly wider FOV for more natural adult perspective
    if (cameraMode === 'first-person' && camera.fov !== 80) {
      camera.fov = 80  // Increased from 75 for more natural field of view
      camera.updateProjectionMatrix()
    } else if (cameraMode === 'third-person' && camera.fov !== 60) {
      camera.fov = 60
      camera.updateProjectionMatrix()
    }

    if (cameraMode === 'first-person') {
      // First-person view: camera at adult's eye level
      const eyeHeight = 1.85 // Eye level height (approximately 6' person)
      
      // Camera position is at player position + eye height
      const targetPos = [
        target[0],
        target[1] + eyeHeight,
        target[2],
      ]

      // Check camera collision with walls to prevent seeing through
      const [clampedX, clampedY, clampedZ] = checkCameraCollision(targetPos, target)
      
      // Set camera position directly (no lerp for first-person to avoid lag)
      camera.position.set(clampedX, clampedY, clampedZ)

      // Set camera rotation directly to match player rotation and pitch
      // Use YXZ order: Y (horizontal/yaw) first, then X (vertical/pitch)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = currentPlayerRotation // Horizontal rotation (yaw)
      camera.rotation.x = currentPlayerPitch // Vertical rotation (pitch) - allows looking up/down
      camera.rotation.z = 0 // No roll
    } else {
      // Third-person view: camera behind player
      // Camera height similar to first-person, just slightly higher for better view
      const isInsideShop = currentState.isInsideShop
      const offsetDistance = isInsideShop ? 12 : 15  // Distance behind player
      const offsetHeight = 2.2  // Similar to first-person (1.85) but slightly higher for third-person view
      const lookAtHeight = 1.85  // Look at player's eye level (same as first-person)

      // Calculate camera position based on player rotation
      const offsetX = Math.sin(currentPlayerRotation) * offsetDistance
      const offsetZ = Math.cos(currentPlayerRotation) * offsetDistance

      const targetPos = [
        target[0] - offsetX,
        target[1] + offsetHeight,
        target[2] - offsetZ,
      ]

      // Smooth camera position with better interpolation
      const currentPos = camera.position
      let newX = currentPos.x + (targetPos[0] - currentPos.x) * 0.15
      let newY = currentPos.y + (targetPos[1] - currentPos.y) * 0.15
      let newZ = currentPos.z + (targetPos[2] - currentPos.z) * 0.15
      
      // Check camera collision with walls to prevent seeing through
      const [clampedX, clampedY, clampedZ] = checkCameraCollision([newX, newY, newZ], target)
      camera.position.set(clampedX, clampedY, clampedZ)

      // Look at player position with pitch consideration
      // Apply pitch offset to look at height
      const pitchOffset = Math.sin(currentPlayerPitch) * 2 // Adjust look height based on pitch
      const lookAtTarget = [
        target[0],
        target[1] + lookAtHeight + pitchOffset,
        target[2],
      ]

      camera.lookAt(lookAtTarget[0], lookAtTarget[1], lookAtTarget[2])
      
      // Also apply pitch to camera rotation for third-person
      camera.rotation.order = 'YXZ'
      camera.rotation.y = currentPlayerRotation
      camera.rotation.x = currentPlayerPitch * 0.5 // Reduce pitch effect in third-person for better view
      camera.rotation.z = 0
    }
  })

  {/* Wall collision removed - empty space */}

  // Set FOV based on camera mode and update it dynamically
  React.useEffect(() => {
    if (cameraRef.current) {
      if (cameraMode === 'first-person') {
        cameraRef.current.fov = 80  // Wider FOV for more natural adult perspective
      } else {
        // Third-person view
        cameraRef.current.fov = 60
      }
      cameraRef.current.updateProjectionMatrix()
    }
  }, [cameraMode])
  
  // Set initial position based on camera mode
  const initialPos = cameraMode === 'first-person' 
    ? [0, 1.85, 0]  // Eye height (same as first-person camera)
    : [0, 2.2, 15]  // Similar height to first-person, just slightly higher for third-person view

  // Set initial FOV
  const initialFov = cameraMode === 'first-person' ? 80 : 60

  // Initialize camera rotation and position for first-person (only on mount, not on every change)
  React.useEffect(() => {
    // Only initialize once on mount, not on every camera mode change
    if (cameraRef.current && cameraMode === 'first-person') {
      // Use a small delay to ensure player position is set
      const initTimer = setTimeout(() => {
        if (cameraRef.current) {
          const playerRotation = usePlayerStore.getState().rotation
          const playerPitch = usePlayerStore.getState().pitch
          const playerPosition = usePlayerStore.getState().position
          cameraRef.current.rotation.order = 'YXZ'
          cameraRef.current.rotation.y = playerRotation
          cameraRef.current.rotation.x = playerPitch
          // Set initial eye height to increased level (1.85m)
          cameraRef.current.position.set(playerPosition[0], playerPosition[1] + 1.85, playerPosition[2])
        }
      }, 100)
      
      return () => clearTimeout(initTimer)
    }
    // Only run on mount and camera mode change, not on every floor change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMode])

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={initialFov}
      position={initialPos}
      near={0.1}
      far={1000}
    />
  )
}

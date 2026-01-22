# Virtual Mall - 3D Interactive Experience

A 3D virtual mall built with React, Three.js, and @react-three/fiber featuring a controllable avatar using Ready Player Me SDK.

## Features

- 🏢 **20x20 Grid Floor** - Modern retail aesthetic with glossy white floor and soft ambient lighting
- 🎮 **Controllable Player** - WASD movement controls and Space to jump
- 📹 **Third-Person Camera** - Smoothly follows the player
- 🏪 **Shop Zones** - Interactive zones that trigger UI overlays when entered
- ⏳ **Loading Progress** - Suspense boundaries with progress bar for 3D assets

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Controls

- **W** - Move forward
- **S** - Move backward
- **A** - Strafe left
- **D** - Strafe right
- **Space** - Jump

## Ready Player Me Integration

To use a Ready Player Me avatar:

1. Create an avatar at [Ready Player Me](https://readyplayer.me/)
2. Get your avatar GLB/GLTF URL from the Ready Player Me dashboard or API
3. Update the `avatarUrl` variable in `src/components/Player.jsx`:
   ```jsx
   const avatarUrl = "https://models.readyplayer.me/YOUR_AVATAR_ID.glb"
   ```
4. The component will automatically load and display your avatar using `@react-three/drei`'s `useGLTF` hook

Currently, a placeholder avatar is used if no URL is provided. The placeholder shows a simple blue body with a pink head for testing purposes.

## Project Structure

```
src/
  components/
    VirtualMall.jsx    # Main scene component
    Floor.jsx          # 20x20 grid floor
    Player.jsx          # Player with controls
    ShopZone.jsx       # Interactive zone trigger
    ShopZoneUI.jsx     # UI overlay component
    LoadingProgress.jsx # Loading progress bar
  stores/
    playerStore.js     # Zustand store for player state
  App.jsx              # Root component
  main.jsx             # Entry point
```

## Technologies

- React 18
- Three.js
- @react-three/fiber
- @react-three/drei
- Zustand (state management)
- Vite (build tool)
# virtual-shopping

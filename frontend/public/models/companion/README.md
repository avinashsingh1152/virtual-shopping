# Companion Avatar Models

Place your companion avatar 3D model files in this folder.

## Supported Formats
- `.glb` (recommended - binary GLTF)
- `.gltf` (text-based GLTF)

## Free Avatar Sources

### 1. Ready Player Me (Recommended)
- Website: https://readyplayer.me/
- Create a free avatar
- Get the GLB URL from dashboard
- Update `companionModelUrl` in `src/components/Companion.jsx`

### 2. VRoid Hub
- Website: https://hub.vroid.com/
- Free anime-style avatars
- Download as VRM format, convert to GLB using Blender

### 3. Mixamo
- Website: https://www.mixamo.com/
- Free 3D characters with animations
- Download as FBX, convert to GLB

### 4. Open Source Avatars
- GitHub: https://github.com/ToxSam/open-source-avatars
- 300+ free avatars in VRM format
- Convert VRM to GLB if needed

### 5. TurboSquid (Free Section)
- Website: https://www.turbosquid.com/
- Search for "free avatar" or "free character"
- Many free models available

## Usage

1. **Download or create an avatar** from one of the sources above
2. **Convert to GLB format** if needed (use Blender or online converters)
3. **Place the file** in this folder: `public/models/companion/companion.glb`
4. **Update the code** in `src/components/Companion.jsx`:
   ```javascript
   const companionModelUrl = '/models/companion/companion.glb'
   ```

## Example Structure
```
public/
  models/
    companion/
      companion.glb
      avatar.glb
      ...
```

## Current Setup

The companion currently uses a simple fallback avatar (red character) if no model URL is provided. This works immediately without any setup!

To use a custom 3D model, just add the model file and update the URL in the code.

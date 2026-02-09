# How to Get a Free Avatar for Your Companion

## Quick Method 1: Ready Player Me (Easiest - 5 minutes)

1. **Go to**: https://readyplayer.me/
2. **Click "Create Avatar"**
3. **Choose**:
   - Take a selfie (quickest)
   - Or use their avatar builder
4. **Customize** your avatar (clothes, hair, etc.)
5. **Download** or **Copy the GLB URL**
6. **Update** `src/components/Companion.jsx`:
   ```javascript
   const companionModelUrl = 'YOUR_READY_PLAYER_ME_URL_HERE'
   ```

## Quick Method 2: Mixamo (Free 3D Characters)

1. **Go to**: https://www.mixamo.com/
2. **Sign in** with Adobe account (free)
3. **Browse** characters → Select one
4. **Download** as **FBX** format
5. **Convert to GLB**:
   - Use Blender: Import FBX → Export as GLTF 2.0 → Choose GLB
   - Or use online converter: https://products.aspose.app/3d/conversion
6. **Place file** in: `/public/models/companion/companion.glb`
7. **Update** `src/components/Companion.jsx`:
   ```javascript
   const companionModelUrl = '/models/companion/companion.glb'
   ```

## Quick Method 3: Download Free Avatar Models

### CGTrader (Free Section)
1. Go to: https://www.cgtrader.com/free-3d-models/character
2. Search for "avatar" or "character"
3. Filter by "Free" and "GLTF" or "GLB" format
4. Download and place in `/public/models/companion/`

### Free3D
1. Go to: https://free3d.com/3d-models/avatar
2. Download a free avatar
3. Convert to GLB if needed
4. Place in `/public/models/companion/`

### Sketchfab (Free Models)
1. Go to: https://sketchfab.com/3d-models?features=downloadable&q=avatar
2. Filter by "Free Download"
3. Download GLB format
4. Place in `/public/models/companion/`

## Recommended: Ready Player Me

**Why Ready Player Me?**
- ✅ Completely free
- ✅ No conversion needed (direct GLB URL)
- ✅ Works immediately
- ✅ Professional quality
- ✅ Customizable
- ✅ No file hosting needed (they host it)

**Steps:**
1. Visit https://readyplayer.me/
2. Create avatar (2-5 minutes)
3. Copy the GLB URL from dashboard
4. Paste in `Companion.jsx`:
   ```javascript
   const companionModelUrl = 'https://models.readyplayer.me/YOUR_AVATAR_ID.glb'
   ```

That's it! Your companion will use the 3D avatar instead of the simple red character.

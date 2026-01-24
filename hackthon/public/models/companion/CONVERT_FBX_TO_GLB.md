# How to Convert FBX to GLB for Your Companion

## You Downloaded: `55-rp_nathan_animated_003_walking_fbx.zip`

### Step 1: Extract the ZIP File
1. Extract the downloaded ZIP file
2. You'll find a `.fbx` file inside

### Step 2: Convert FBX to GLB

## Option A: Using Blender (Free, Recommended)

1. **Download Blender** (if you don't have it):
   - Go to: https://www.blender.org/download/
   - Download and install (free)

2. **Open Blender**

3. **Import FBX**:
   - File → Import → FBX (.fbx)
   - Select your `.fbx` file
   - Click "Import FBX"

4. **Export as GLB**:
   - File → Export → glTF 2.0 (.glb/.gltf)
   - Choose location: `/public/models/companion/`
   - Name it: `companion.glb`
   - Click "Export glTF 2.0"

5. **Done!** Your file is now at: `/public/models/companion/companion.glb`

## Option B: Online Converter (No Software Needed)

1. **Go to online converter**:
   - https://products.aspose.app/3d/conversion/fbx-to-gltf
   - Or: https://www.meshconvert.com/

2. **Upload your `.fbx` file**

3. **Select output format**: GLB

4. **Download the converted file**

5. **Place it in**: `/public/models/companion/companion.glb`

## Step 3: Update Your Code

After converting and placing the file, update `src/components/Companion.jsx`:

```javascript
const companionModelUrl = '/models/companion/companion.glb'
```

## Quick Summary:
1. ✅ Download: `55-rp_nathan_animated_003_walking_fbx.zip`
2. ✅ Extract the `.fbx` file
3. ✅ Convert to `.glb` using Blender or online converter
4. ✅ Place in `/public/models/companion/companion.glb`
5. ✅ Update code: `companionModelUrl = '/models/companion/companion.glb'`

Your companion will now use the 3D avatar model!

# 3D Product Models Folder

Place your 3D product models in this folder.

## Supported File Formats

### ✅ Recommended Formats (Direct Support)
- **`.glb`** ⭐ **RECOMMENDED** - Binary GLTF format
  - Single file (includes textures and geometry)
  - Fast loading
  - Best for web applications
  - Example: `headphones.glb`

- **`.gltf`** - Text-based GLTF format
  - May require separate texture files
  - Human-readable JSON
  - Example: `watch.gltf`

### ⚠️ Other Formats (Need Conversion)
These formats are **NOT directly supported** and need to be converted to GLTF/GLB:

- **`.fbx`** - Autodesk FBX format (needs conversion)
- **`.obj`** - Wavefront OBJ format (needs conversion)
- **`.dae`** - Collada format (needs conversion)
- **`.blend`** - Blender format (needs conversion)
- **`.3ds`** - 3D Studio format (needs conversion)
- **`.max`** - 3ds Max format (needs conversion)
- **`.ma/.mb`** - Maya format (needs conversion)

**Note**: "dbx" is not a standard 3D model format. If you meant "fbx", that needs conversion.

## How to Convert Formats

### Online Converters:
1. **glTF-Pipeline**: https://github.com/CesiumGS/gltf-pipeline
2. **Blender** (Free): Import your model → Export as GLTF/GLB
3. **Online Converters**: 
   - https://products.aspose.app/3d/conversion
   - https://www.meshconvert.com/

### Using Blender (Recommended):
1. Open Blender (free software)
2. File → Import → Select your format (FBX, OBJ, etc.)
3. File → Export → glTF 2.0
4. Choose `.glb` format for single file

## Usage
1. Download 3D models from:
   - Poly Haven: https://polyhaven.com/models (Free GLTF/GLB)
   - Sketchfab: https://sketchfab.com/3d-models?features=downloadable
   - Free3D: https://free3d.com/
   - TurboSquid: https://www.turbosquid.com/

2. **If you have GLTF/GLB**: Place directly in this folder

3. **If you have other formats**: Convert to GLTF/GLB first, then place in this folder

4. Reference them in your code using:
   `/models/products/your-model.glb`

## Example Structure
```
public/
  models/
    products/
      headphones.glb      ✅ Ready to use
      watch.glb          ✅ Ready to use
      shoes.glb          ✅ Ready to use
      sunglasses.fbx     ❌ Needs conversion to .glb
      smartphone.obj     ❌ Needs conversion to .glb
      ...
```

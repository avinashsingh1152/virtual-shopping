# Product 3D Models Usage Guide

## How It Works

1. **Initial Display**: Products show as 2D images on the racks
2. **Click Interaction**: When you click on a product image, it switches to show the 3D model
3. **Toggle**: Click again to switch back to the image view

## Adding 3D Models

### Step 1: Download 3D Models
Download **GLTF/GLB format** models from:
- **Poly Haven**: https://polyhaven.com/models (Free, CC0, GLTF/GLB)
- **Sketchfab**: https://sketchfab.com/3d-models?features=downloadable (Free and paid)
- **Free3D**: https://free3d.com/ (Free and paid)
- **TurboSquid**: https://www.turbosquid.com/ (Paid, high quality)

**Important**: This project only supports **`.glb`** and **`.gltf`** formats directly.

### Step 2: Convert Other Formats (If Needed)
If you have models in other formats (FBX, OBJ, DAE, etc.), you need to convert them:

**Option A: Use Blender (Free)**
1. Download Blender: https://www.blender.org/
2. Import your model: File → Import → (Select format)
3. Export as GLTF: File → Export → glTF 2.0
4. Choose `.glb` format (single file)

**Option B: Online Converters**
- https://products.aspose.app/3d/conversion
- https://www.meshconvert.com/

### Step 3: Place Models in Folder
Place your `.glb` or `.gltf` files in:
```
public/models/products/
```

**Note**: If you have `.fbx` files (not "dbx"), convert them to `.glb` first.

### Step 3: Update Product Configuration
Edit `src/components/VirtualMall.jsx` and update the `products` array:

```javascript
const products = [
  {
    id: 'product-1',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', // Product image
    modelUrl: '/models/products/headphones.glb', // Path to your 3D model
  },
  // ... more products
]
```

## File Structure Example

```
public/
  models/
    products/
      headphones.glb
      watch.glb
      shoes.glb
      sunglasses.glb
      smartphone.glb
      laptop.glb
```

## Tips

- **GLB format is recommended** (binary, single file, faster loading)
- **Keep file sizes reasonable** (< 5MB per model for web)
- **Test models** before adding to production
- **Optimize models** using tools like glTF-Pipeline if needed

## Current Product Images

The system currently uses Unsplash images as placeholders. Replace these with your actual product images or update the `imageUrl` in the products array.

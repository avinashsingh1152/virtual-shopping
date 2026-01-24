# Product Image Generator Script

Automated script that generates 3D product images every minute using Nano Banana API.

## Features

- ✅ Runs every 60 seconds automatically
- ✅ Generates 3D product images without background
- ✅ Saves images to `public/product-images/` folder
- ✅ Prevents duplicate generation (one per category per minute)
- ✅ Handles errors gracefully
- ✅ Supports multiple product categories

## Configuration

The script uses environment variables from `.env`:

```env
GENVOY_BASE_URL=https://genvoy.flipkart.net
GEMINI_IMAGE_MODEL_NAME=gemini-2.5-flash-image
GEMINI_IMAGE_SUBSCRIPTION_KEY=751d07a2ee51425385d1b8523166e90b
```

## Running the Script

### Option 1: Using npm script
```bash
cd api_backend
npm run generate-images
```

### Option 2: Direct execution
```bash
cd api_backend
node src/scripts/generateProductImages.js
```

### Option 3: Development mode (auto-restart on changes)
```bash
cd api_backend
npm run generate-images:dev
```

## How It Works

1. **Every minute**, the script:
   - Picks a random product category
   - Generates a 3D product image using Nano Banana API
   - Saves the image to `public/product-images/` folder
   - Logs the result

2. **Image Generation**:
   - Uses Nano Banana (Gemini 2.5 Flash Image) model
   - Generates 3D product images with transparent/white background
   - Saves as PNG files with naming: `{category}_3d_{timestamp}.png`

3. **Duplicate Prevention**:
   - Tracks generated images per category per minute
   - Prevents generating the same category multiple times in the same minute

## Product Categories

The script randomly selects from these categories:
- Electronics
- Clothing
- Home & Kitchen
- Sports
- Books
- Toys
- Beauty
- Automotive
- Furniture
- Gaming

## Output

Images are saved to:
```
api_backend/public/product-images/
```

Example filenames:
- `electronics_3d_1705123456789.png`
- `clothing_3d_1705123517890.png`
- `sports_3d_1705123578901.png`

## Stopping the Script

Press `Ctrl+C` to stop the script gracefully.

## Logs

The script provides detailed logging:
- 🚀 Startup information
- 🎨 Image generation progress
- ✅ Success messages
- ❌ Error messages
- ⏭️ Skip messages (duplicates)

## Troubleshooting

1. **No images generated**: Check API credentials in `.env`
2. **Connection errors**: Verify `GENVOY_BASE_URL` is correct
3. **Permission errors**: Ensure write access to `public/product-images/` folder
4. **Timeout errors**: API might be slow; script will retry next minute

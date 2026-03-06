# Category Images Setup Guide

## Overview
The category screen uses local images stored in the app's assets folder for fast loading and offline support.

## Image Requirements

### Location
Place all category images in: `customer/assets/categories/`

### File Names (Required)
1. `fruits-vegetables.png`
2. `dairy-bakery.png`
3. `staples.png`
4. `snacks-beverages.png`
5. `packaged-food.png`
6. `personal-care.png`
7. `household.png`
8. `meat-fish-eggs.png`
9. `frozen-instant.png`
10. `baby-care.png`
11. `pet-care.png`

### Image Specifications
- **Format**: PNG or JPG
- **Dimensions**: 400x400px (square)
- **Size**: Keep under 100KB per image for optimal performance
- **Style**: Product photos with clean backgrounds (white or transparent)

## How to Add Images

### Option 1: Download from Free Stock Sites
1. Visit [Unsplash](https://unsplash.com) or [Pexels](https://pexels.com)
2. Search for relevant category images:
   - "fresh vegetables basket"
   - "dairy products milk"
   - "rice grains staples"
   - "snacks chips beverages"
   - etc.
3. Download and resize to 400x400px
4. Rename according to the list above
5. Place in `customer/assets/categories/`

### Option 2: Use Your Own Product Photos
1. Take or source photos of representative products
2. Crop to square (1:1 aspect ratio)
3. Resize to 400x400px
4. Optimize file size
5. Save with correct filenames

### Option 3: Use AI-Generated Images
1. Use tools like DALL-E, Midjourney, or Stable Diffusion
2. Prompt examples:
   - "Fresh vegetables and fruits in a basket, product photography, white background"
   - "Dairy products milk and cheese, clean product shot"
3. Download and prepare as above

## Quick Setup Script

You can use this bash script to create placeholder images:

```bash
# Create the categories folder
mkdir -p customer/assets/categories

# Download sample images (requires curl)
cd customer/assets/categories

# Example using placeholder service (replace with actual images)
curl -o fruits-vegetables.png "https://via.placeholder.com/400x400/10B981/ffffff?text=Fruits+%26+Veg"
curl -o dairy-bakery.png "https://via.placeholder.com/400x400/F59E0B/ffffff?text=Dairy+%26+Bakery"
curl -o staples.png "https://via.placeholder.com/400x400/8B5CF6/ffffff?text=Staples"
curl -o snacks-beverages.png "https://via.placeholder.com/400x400/EF4444/ffffff?text=Snacks"
curl -o packaged-food.png "https://via.placeholder.com/400x400/3B82F6/ffffff?text=Packaged+Food"
curl -o personal-care.png "https://via.placeholder.com/400x400/EC4899/ffffff?text=Personal+Care"
curl -o household.png "https://via.placeholder.com/400x400/14B8A6/ffffff?text=Household"
curl -o meat-fish-eggs.png "https://via.placeholder.com/400x400/DC2626/ffffff?text=Meat+%26+Eggs"
curl -o frozen-instant.png "https://via.placeholder.com/400x400/06B6D4/ffffff?text=Frozen"
curl -o baby-care.png "https://via.placeholder.com/400x400/F472B6/ffffff?text=Baby+Care"
curl -o pet-care.png "https://via.placeholder.com/400x400/F97316/ffffff?text=Pet+Care"
```

## Fallback Behavior

If an image is missing, the app will show:
- A colored background (category-specific color)
- A fallback emoji icon (📦)

This ensures the app doesn't crash if images aren't added yet.

## Testing

After adding images:
1. Restart the Expo development server
2. Navigate to the Categories tab
3. Verify all images load correctly
4. Check image quality and alignment

## Optimization Tips

1. **Compress images**: Use tools like TinyPNG or ImageOptim
2. **Use WebP format**: Better compression than PNG/JPG (if supported)
3. **Lazy loading**: Images are loaded on-demand by React Native
4. **Cache**: Images are automatically cached by the app

## Updating Images

To update a category image:
1. Replace the file in `customer/assets/categories/`
2. Keep the same filename
3. Restart the app to see changes

## Alternative: Use Remote URLs

If you prefer to use remote URLs instead of local images, modify the code in `customer/src/screens/Home/CategoriesScreen.tsx`:

```typescript
// Change from:
const CATEGORY_IMAGES: Record<string, any> = {
  "Fruits & Vegetables": require("../../../assets/categories/fruits-vegetables.png"),
  // ...
};

// To:
const CATEGORY_IMAGES: Record<string, string> = {
  "Fruits & Vegetables": "https://your-cdn.com/fruits-vegetables.png",
  // ...
};

// And update the Image component:
<Image
  source={{ uri: imageSource }}  // Instead of source={imageSource}
  style={styles.categoryImage}
  resizeMode="cover"
/>
```

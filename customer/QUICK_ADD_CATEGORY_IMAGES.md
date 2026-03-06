# Quick Guide: Add Category Images

## 3 Easy Options

### Option 1: Auto-Download (Fastest)
Run this command to automatically download sample images:
```bash
node scripts/download-category-images.js
```

### Option 2: Manual Download
1. Go to [Unsplash](https://unsplash.com) or [Pexels](https://pexels.com)
2. Search and download images for each category
3. Resize to 400x400px (use any image editor)
4. Save with these exact names in `customer/assets/categories/`:
   - fruits-vegetables.png
   - dairy-bakery.png
   - staples.png
   - snacks-beverages.png
   - packaged-food.png
   - personal-care.png
   - household.png
   - meat-fish-eggs.png
   - frozen-instant.png
   - baby-care.png
   - pet-care.png

### Option 3: Use Your Own Photos
1. Take photos of products from each category
2. Crop to square (1:1 ratio)
3. Resize to 400x400px
4. Save with the filenames above

## What Happens Without Images?

The app will still work! It shows:
- Colored background (each category has its own color)
- Fallback emoji icon

## After Adding Images

1. Restart your Expo dev server
2. Navigate to Categories tab
3. Images should load instantly

## Need Help?

See `CATEGORY_IMAGES_SETUP.md` for detailed instructions.

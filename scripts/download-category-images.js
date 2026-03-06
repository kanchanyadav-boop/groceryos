#!/usr/bin/env node

/**
 * Script to download sample category images from Unsplash
 * Run: node scripts/download-category-images.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'customer', 'assets', 'categories');

// Unsplash image IDs for each category (free to use)
const CATEGORY_IMAGES = {
  'fruits-vegetables': 'photo-1610348725531-843dff563e2c', // Fresh vegetables
  'dairy-bakery': 'photo-1628088062854-d1870b4553da', // Dairy products
  'staples': 'photo-1586201375761-83865001e31c', // Rice and grains
  'snacks-beverages': 'photo-1599490659213-e2b9527bd087', // Snacks
  'packaged-food': 'photo-1588964895597-cfccd6e2dbf9', // Canned food
  'personal-care': 'photo-1556228578-0d85b1a4d571', // Personal care products
  'household': 'photo-1563453392212-326f5e854473', // Cleaning supplies
  'meat-fish-eggs': 'photo-1587486937820-4d8e6c3e8b6f', // Eggs
  'frozen-instant': 'photo-1571091718767-18b5b1457add', // Frozen food
  'baby-care': 'photo-1515488042361-ee00e0ddd4e4', // Baby products
  'pet-care': 'photo-1450778869180-41d0601e046e', // Pet food
};

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created directory: ${OUTPUT_DIR}`);
}

function downloadImage(filename, photoId) {
  return new Promise((resolve, reject) => {
    const url = `https://images.unsplash.com/${photoId}?w=400&h=400&fit=crop&q=80`;
    const filepath = path.join(OUTPUT_DIR, `${filename}.jpg`);

    console.log(`Downloading ${filename}...`);

    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✓ Downloaded: ${filename}.jpg`);
          resolve();
        });
      } else {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('Starting category image downloads...\n');

  try {
    for (const [filename, photoId] of Object.entries(CATEGORY_IMAGES)) {
      await downloadImage(filename, photoId);
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✓ All images downloaded successfully!');
    console.log(`\nImages saved to: ${OUTPUT_DIR}`);
    console.log('\nNote: Images are in JPG format. Update the code if needed:');
    console.log('Change .png to .jpg in CategoriesScreen.tsx');
  } catch (error) {
    console.error('\n✗ Error downloading images:', error.message);
    console.log('\nAlternative: Manually download images from:');
    console.log('https://unsplash.com/s/photos/grocery-categories');
  }
}

downloadAll();

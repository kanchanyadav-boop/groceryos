# Sample Products Import Guide

This guide will help you import 100+ sample products with images into your Firebase database for testing.

## Prerequisites

1. **Node.js** installed on your system
2. **Firebase Service Account Key** (serviceAccountKey.json)
3. **Internet connection** (to fetch product data from Open Food Facts API)

## Setup Steps

### Step 1: Install Dependencies

```bash
cd scripts
npm install firebase-admin node-fetch@2
```

### Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `groceryos-61a05`
3. Click ⚙️ Settings → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Save the file as `serviceAccountKey.json` in the project root

### Step 3: Run the Import Script

```bash
# From project root
node scripts/import-sample-products.js
```

## What This Script Does

### Products Imported (100+ items across 11 categories):

1. **Fruits & Vegetables** (5 products)
   - Packaged juices and ketchups (fresh produce doesn't have barcodes)

2. **Dairy & Bakery** (10 products)
   - Amul Milk, Butter, Cheese
   - Mother Dairy products

3. **Staples** (10 products)
   - India Gate Rice varieties
   - Tata Sampann Dals
   - Aashirvaad Atta

4. **Oil, Ghee & Masala** (10 products)
   - Fortune, Sundrop oils
   - MDH, Everest masalas

5. **Beverages** (10 products)
   - Tata Tea, Bru Coffee
   - Coca-Cola, Pepsi, Sprite

6. **Snacks & Branded Foods** (10 products)
   - Parle-G, Britannia biscuits
   - Maggi Noodles, Lays chips

7. **Meat, Fish & Eggs** (5 products)
   - Venky's, Godrej frozen items

8. **Cleaning & Household** (10 products)
   - Vim, Harpic, Surf Excel
   - Ariel, Tide detergents

9. **Personal Care** (10 products)
   - Colgate, Pepsodent toothpaste
   - Lux, Dove, Dettol soaps
   - Pantene, Clinic Plus shampoos

10. **Baby Care** (10 products)
    - Johnson's Baby products
    - Pampers, Huggies diapers

11. **Breakfast & Sauces** (10 products)
    - Kissan Jam & Ketchup
    - Kellogg's cereals, Quaker Oats

### Features:

- ✅ Fetches product details from Open Food Facts API
- ✅ Downloads product images automatically
- ✅ Assigns realistic prices based on category
- ✅ Creates inventory records with random stock (10-60 units)
- ✅ Organizes products by category
- ✅ Shows detailed progress during import
- ✅ Handles errors gracefully
- ✅ Skips existing products

## Expected Output

```
🚀 Starting product import...

📦 Categories: 11
📦 Total products: 100

📂 Category: Dairy & Bakery (10 products)
────────────────────────────────────────────────────────────
  🔍 [1/10] Fetching: 8901063111417...
  ✅ [1/10] Amul Taaza Toned Milk (₹45)
  🔍 [2/10] Fetching: 8901063111424...
  ✅ [2/10] Amul Gold Full Cream Milk (₹52)
  ...

📊 IMPORT SUMMARY
════════════════════════════════════════════════════════════
✅ Success: 95
⏭️  Skipped: 0
❌ Failed: 5
📦 Total: 100

📂 Category Breakdown:
  Dairy & Bakery: ✅10 ⏭️0 ❌0
  Staples: ✅10 ⏭️0 ❌0
  Beverages: ✅9 ⏭️0 ❌1
  ...

✨ Import complete!
```

## Time Required

- **Estimated time**: 2-3 minutes
- **Rate limit**: 1 request per second (to respect API limits)
- **Total requests**: ~100 API calls

## After Import

### 1. Verify in Firebase Console

1. Go to Firestore Database
2. Check `products` collection (should have ~100 documents)
3. Check `inventory` collection (should have ~100 documents)

### 2. View in Admin Panel

1. Open admin panel: https://groceryos-61a05.web.app
2. Go to "Products" page
3. You should see all imported products with images

### 3. Test in Customer App

1. Open customer app
2. Browse products by category
3. All products should be visible with images and prices

## Troubleshooting

### Error: "Cannot find module 'firebase-admin'"

```bash
cd scripts
npm install firebase-admin node-fetch@2
```

### Error: "serviceAccountKey.json not found"

- Download the service account key from Firebase Console
- Place it in the project root directory

### Error: "Permission denied"

- Check that your service account has Firestore write permissions
- Go to Firebase Console → IAM & Admin → Grant "Cloud Datastore User" role

### Some Products Failed to Import

- This is normal - some barcodes may not exist in the Open Food Facts database
- The script will continue and import available products
- You can manually add missing products later

## Customization

### To Import Different Products:

Edit `scripts/import-sample-products.js` and modify the `PRODUCTS_BY_CATEGORY` object:

```javascript
"Dairy & Bakery": [
  '8901063111417', // Add your barcode here
  '8901063111424',
  // ... more barcodes
],
```

### To Change Price Ranges:

Modify the `priceRanges` object in the `generatePrice` function:

```javascript
const priceRanges = {
  "Dairy & Bakery": { min: 20, max: 150 },
  // Adjust min/max values
};
```

### To Change Stock Quantities:

Modify the inventory creation:

```javascript
quantity: Math.floor(Math.random() * 50) + 10, // Change range here
```

## Next Steps

1. ✅ Run the import script
2. ✅ Verify products in admin panel
3. ✅ Test customer app
4. ✅ Adjust prices if needed in SKU Management
5. ✅ Add more products using Barcode Import feature
6. ✅ Update inventory quantities as needed

## Support

If you encounter issues:
1. Check the console output for specific errors
2. Verify Firebase credentials
3. Check internet connection
4. Try importing in smaller batches

---

**Note**: This script is for testing purposes. For production, use the Barcode Import feature in the admin panel to add products one by one or in small batches.

// scripts/import-sample-products-web.js
// Import sample products using Firebase Web SDK (no service account needed)

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fetch = require('node-fetch');

// Firebase config from .env.uat
const firebaseConfig = {
  apiKey: "AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY",
  authDomain: "groceryos-61a05.firebaseapp.com",
  projectId: "groceryos-61a05",
  storageBucket: "groceryos-61a05.firebasestorage.app",
  messagingSenderId: "146621027744",
  appId: "1:146621027744:web:cdf43e18455fd8ecf0c0c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// You need to provide admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@groceryos.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Organized by category
const PRODUCTS_BY_CATEGORY = {
  "Fruits & Vegetables": [
    { barcode: '8901491101073', name: 'Del Monte Tomato Ketchup', category: 'Fruits & Vegetables' },
    { barcode: '8901491101080', name: 'Kissan Fresh Tomato Ketchup', category: 'Fruits & Vegetables' },
    { barcode: '8901491101097', name: 'Real Fruit Juice Mixed', category: 'Fruits & Vegetables' },
    { barcode: '8901491101103', name: 'Tropicana Orange Juice', category: 'Fruits & Vegetables' },
    { barcode: '8901491101110', name: 'Paper Boat Aam Panna', category: 'Fruits & Vegetables' },
  ],
  
  "Dairy & Bakery": [
    '8901063111417', '8901063111424', '8901063111431', '8901063111448',
    '8901063310070', '8901063310087', '8901063310094', '8901725111014',
    '8901725111021', '8901725111038',
  ],
  
  "Staples": [
    '8901491101042', '8901491101059', '8901491101066', '8901491506526',
    '8901491506533', '8901491506540', '8901491506557', '8901491506564',
    '8901491506571', '8901491506588',
  ],
  
  "Oil, Ghee & Masala": [
    '8901491506595', '8901491506601', '8901491506618', '8901491506625',
    '8901058843415', '8901058843422', '8901058843439', '8901058843446',
    '8901058843453', '8901058843460',
  ],
  
  "Beverages": [
    '8901491101127', '8901491101134', '8901491101141', '8901491101158',
    '8901491101165', '5449000000996', '5449000054227', '8901719101014',
    '8901719101021', '8901719101038',
  ],
  
  "Snacks & Branded Foods": [
    '8901030895326', '8901030895333', '8901030895340', '8901030541506',
    '8901030541513', '8901030541520', '8901058843514', '8901058843521',
    '8901491101172', '8901491101189',
  ],
  
  "Meat, Fish & Eggs": [
    { barcode: '8901491101196', name: 'Venky\'s Chicken Sausages', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101202', name: 'Venky\'s Chicken Salami', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101219', name: 'Sumeru Frozen Chicken', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101226', name: 'Godrej Yummiez Chicken Nuggets', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101233', name: 'ITC Master Chef Chicken Seekh', category: 'Meat, Fish & Eggs' },
  ],
  
  "Cleaning & Household": [
    '8901030895548', '8901030895555', '8901030895562', '8901030895579',
    '8901030895586', '8901030895593', '8901030895609', '8901030895616',
    '8901030895623', '8901030895630',
  ],
  
  "Personal Care": [
    '8901030895371', '8901030895388', '8901030895395', '8901030895401',
    '8901030895425', '8901030895432', '8901030895449', '8901030895456',
    '8901030895470', '8901030895487',
  ],
  
  "Baby Care": [
    '8901030895647', '8901030895654', '8901030895661', '8901030895678',
    '8901030895685',
    { barcode: '8901491101240', name: 'Pampers Baby Diapers', category: 'Baby Care' },
    { barcode: '8901491101257', name: 'Huggies Wonder Pants', category: 'Baby Care' },
    { barcode: '8901491101264', name: 'Mamy Poko Pants', category: 'Baby Care' },
    { barcode: '8901491101271', name: 'Himalaya Baby Cream', category: 'Baby Care' },
    { barcode: '8901491101288', name: 'Chicco Baby Wipes', category: 'Baby Care' },
  ],
  
  "Breakfast & Sauces": [
    '8901058843569', '8901058843576', '8901058843583', '8901058843590',
    '8901058843606', '8901491101295', '8901491101301', '8901491101318',
    '8901491101325', '8901491101332',
  ],
};

const mapCategory = (categories) => {
  if (!categories) return "Groceries";
  const cat = categories.toLowerCase();
  
  if (cat.includes("dairy") || cat.includes("milk")) return "Dairy & Bakery";
  if (cat.includes("fruit") || cat.includes("vegetable")) return "Fruits & Vegetables";
  if (cat.includes("beverage") || cat.includes("drink")) return "Beverages";
  if (cat.includes("snack") || cat.includes("biscuit")) return "Snacks & Branded Foods";
  if (cat.includes("meat") || cat.includes("chicken")) return "Meat, Fish & Eggs";
  if (cat.includes("rice") || cat.includes("dal")) return "Staples";
  if (cat.includes("oil") || cat.includes("spice")) return "Oil, Ghee & Masala";
  if (cat.includes("clean") || cat.includes("detergent")) return "Cleaning & Household";
  if (cat.includes("personal") || cat.includes("care")) return "Personal Care";
  if (cat.includes("baby")) return "Baby Care";
  
  return "Groceries";
};

async function fetchProduct(item) {
  const barcode = typeof item === 'string' ? item : item.barcode;
  const forcedCategory = typeof item === 'object' ? item.category : null;
  const forcedName = typeof item === 'object' ? item.name : null;
  
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.product && data.product.product_name) {
      return {
        barcode,
        name: forcedName || data.product.product_name,
        brand: data.product.brands || "",
        category: forcedCategory || mapCategory(data.product.categories),
        imageUrl: data.product.image_url || "",
        quantity: data.product.quantity || "",
        description: data.product.ingredients_text || "",
      };
    } else if (forcedName && forcedCategory) {
      return {
        barcode, name: forcedName, brand: "", category: forcedCategory,
        imageUrl: "", quantity: "", description: "",
      };
    }
    return null;
  } catch (error) {
    if (forcedName && forcedCategory) {
      return {
        barcode, name: forcedName, brand: "", category: forcedCategory,
        imageUrl: "", quantity: "", description: "",
      };
    }
    return null;
  }
}

function generatePrice(category) {
  const priceRanges = {
    "Dairy & Bakery": { min: 20, max: 150 },
    "Fruits & Vegetables": { min: 30, max: 200 },
    "Beverages": { min: 20, max: 100 },
    "Snacks & Branded Foods": { min: 10, max: 80 },
    "Meat, Fish & Eggs": { min: 100, max: 500 },
    "Staples": { min: 50, max: 300 },
    "Oil, Ghee & Masala": { min: 40, max: 250 },
    "Cleaning & Household": { min: 30, max: 200 },
    "Personal Care": { min: 25, max: 150 },
    "Baby Care": { min: 50, max: 300 },
    "Breakfast & Sauces": { min: 40, max: 180 },
  };
  
  const range = priceRanges[category] || { min: 30, max: 150 };
  const price = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const mrp = Math.floor(price * 1.2);
  
  return { price, mrp };
}

async function importProducts() {
  console.log('🔐 Signing in to Firebase...');
  
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Signed in successfully!\n');
  } catch (error) {
    console.error('❌ Failed to sign in:', error.message);
    console.log('\n💡 Please provide admin credentials:');
    console.log('   Set environment variables:');
    console.log('   ADMIN_EMAIL=your-admin@email.com');
    console.log('   ADMIN_PASSWORD=your-password');
    process.exit(1);
  }
  
  console.log('🚀 Starting product import...\n');
  console.log('📦 Categories:', Object.keys(PRODUCTS_BY_CATEGORY).length);
  console.log('📦 Total products:', Object.values(PRODUCTS_BY_CATEGORY).flat().length);
  console.log('');
  
  let success = 0, failed = 0, skipped = 0;
  const categoryStats = {};
  
  for (const [categoryName, products] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    console.log(`\n📂 Category: ${categoryName} (${products.length} products)`);
    console.log('─'.repeat(60));
    
    categoryStats[categoryName] = { success: 0, failed: 0, skipped: 0 };
    
    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      const barcode = typeof item === 'string' ? item : item.barcode;
      
      try {
        const existingDoc = await getDoc(doc(db, 'products', barcode));
        if (existingDoc.exists()) {
          console.log(`  ⏭️  [${i + 1}/${products.length}] Skipped: ${barcode} (exists)`);
          skipped++;
          categoryStats[categoryName].skipped++;
          continue;
        }
        
        console.log(`  🔍 [${i + 1}/${products.length}] Fetching: ${barcode}...`);
        const productData = await fetchProduct(item);
        
        if (!productData) {
          console.log(`  ❌ [${i + 1}/${products.length}] Failed: ${barcode} (not found)`);
          failed++;
          categoryStats[categoryName].failed++;
          continue;
        }
        
        const { price, mrp } = generatePrice(productData.category);
        const slug = productData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        
        await setDoc(doc(db, 'products', barcode), {
          name: productData.name, slug, category: productData.category, subcategory: "",
          price, mrp, unit: "pcs",
          description: productData.description || `${productData.brand} ${productData.name}`,
          brand: productData.brand, gstRate: 5, barcode, tags: [],
          imageUrls: productData.imageUrl ? [productData.imageUrl] : [],
          inStock: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        
        await setDoc(doc(db, 'inventory', barcode), {
          skuId: barcode,
          quantity: Math.floor(Math.random() * 50) + 10,
          reserved: 0,
          available: Math.floor(Math.random() * 50) + 10,
          lowStockThreshold: 10,
          updatedBy: "sample-import-script",
          updatedAt: serverTimestamp(),
        });
        
        console.log(`  ✅ [${i + 1}/${products.length}] ${productData.name} (₹${price})`);
        success++;
        categoryStats[categoryName].success++;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ [${i + 1}/${products.length}] Error: ${barcode} - ${error.message}`);
        failed++;
        categoryStats[categoryName].failed++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${success}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total: ${Object.values(PRODUCTS_BY_CATEGORY).flat().length}`);
  
  console.log('\n📂 Category Breakdown:');
  for (const [cat, stats] of Object.entries(categoryStats)) {
    console.log(`  ${cat}: ✅${stats.success} ⏭️${stats.skipped} ❌${stats.failed}`);
  }
  
  console.log('\n✨ Import complete!');
  process.exit(0);
}

importProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

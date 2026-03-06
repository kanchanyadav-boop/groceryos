// scripts/import-products-with-images.js
// Import products from Open Food Facts that have images

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, serverTimestamp } = require('firebase/firestore');

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY",
  authDomain: "groceryos-61a05.firebaseapp.com",
  projectId: "groceryos-61a05",
  storageBucket: "groceryos-61a05.firebasestorage.app",
  messagingSenderId: "146621027744",
  appId: "1:146621027744:web:cdf43e18455fd8ecf0c0c5",
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@groceryos.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Anil@123';

// Search queries for different categories
const SEARCH_QUERIES = {
  "Fruits & Vegetables": ["apple", "banana", "tomato", "potato", "onion", "carrot"],
  "Dairy & Bakery": ["milk", "cheese", "yogurt", "bread", "butter", "paneer"],
  "Beverages": ["juice", "cola", "water", "tea", "coffee"],
  "Snacks & Branded Foods": ["chips", "biscuits", "cookies", "namkeen", "chocolate"],
  "Staples": ["rice", "wheat", "dal", "flour", "sugar", "salt"],
  "Oil, Ghee & Masala": ["oil", "ghee", "masala", "spices", "turmeric"],
  "Cleaning & Household": ["detergent", "soap", "shampoo", "cleaner"],
  "Personal Care": ["toothpaste", "cream", "lotion", "deodorant"],
  "Baby Care": ["diapers", "baby food", "baby oil", "wipes"],
  "Breakfast & Sauces": ["ketchup", "sauce", "jam", "honey", "cereal"],
};

async function searchProducts(query, category, limit = 10) {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,image_url,quantity,ingredients_text`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return [];
    }
    
    // Filter products that have images
    return data.products
      .filter(p => p.image_url && p.product_name)
      .map(p => ({
        barcode: p.code,
        name: p.product_name,
        brand: p.brands || "",
        category: category,
        imageUrl: p.image_url,
        quantity: p.quantity || "",
        description: p.ingredients_text || "",
      }));
  } catch (error) {
    console.error(`Error searching for ${query}:`, error.message);
    return [];
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
    process.exit(1);
  }
  
  console.log('🚀 Starting product import with images...\n');
  console.log('📦 Searching Open Food Facts database...\n');

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  for (const [category, queries] of Object.entries(SEARCH_QUERIES)) {
    console.log(`\n📂 Category: ${category}`);
    console.log('─'.repeat(60));
    
    let categorySuccess = 0;
    
    for (const query of queries) {
      console.log(`  🔍 Searching: "${query}"...`);
      
      const products = await searchProducts(query, category, 5);
      
      if (products.length === 0) {
        console.log(`  ⚠️  No products with images found for "${query}"`);
        continue;
      }
      
      console.log(`  ✅ Found ${products.length} products with images`);
      
      for (const product of products) {
        try {
          // Check if already exists
          const existingDoc = await getDoc(doc(db, 'products', product.barcode));
          if (existingDoc.exists()) {
            console.log(`     ⏭️  Skipped: ${product.name} (exists)`);
            totalSkipped++;
            continue;
          }
          
          const { price, mrp } = generatePrice(category);
          const slug = product.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          
          // Create product
          await setDoc(doc(db, 'products', product.barcode), {
            name: product.name,
            slug,
            category: product.category,
            subcategory: "",
            price,
            mrp,
            unit: "pcs",
            description: product.description || `${product.brand} ${product.name}`,
            brand: product.brand,
            gstRate: 5,
            barcode: product.barcode,
            tags: [],
            imageUrls: [product.imageUrl],
            inStock: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
          // Create inventory
          await setDoc(doc(db, 'inventory', product.barcode), {
            skuId: product.barcode,
            quantity: Math.floor(Math.random() * 50) + 10,
            reserved: 0,
            available: Math.floor(Math.random() * 50) + 10,
            lowStockThreshold: 10,
            updatedBy: "image-import-script",
            updatedAt: serverTimestamp(),
          });
          
          console.log(`     ✅ Imported: ${product.name} (₹${price})`);
          categorySuccess++;
          totalSuccess++;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.log(`     ❌ Failed: ${product.name} - ${error.message}`);
          totalFailed++;
        }
      }
      
      // Delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`  📊 Category total: ${categorySuccess} products imported`);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Final Summary:');
  console.log('═'.repeat(60));
  console.log(`✅ Success: ${totalSuccess}`);
  console.log(`⏭️  Skipped: ${totalSkipped}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📦 Total: ${totalSuccess + totalSkipped + totalFailed}`);
  console.log('\n✨ Import complete!');
}

importProducts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

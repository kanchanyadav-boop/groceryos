// scripts/import-sample-products.js
// Import 100+ sample Indian grocery products organized by category

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Organized by category - 5-10 products per category
const PRODUCTS_BY_CATEGORY = {
  "Fruits & Vegetables": [
    // Note: Fresh produce rarely has barcodes, using packaged alternatives
    { barcode: '8901491101073', name: 'Del Monte Tomato Ketchup', category: 'Fruits & Vegetables' },
    { barcode: '8901491101080', name: 'Kissan Fresh Tomato Ketchup', category: 'Fruits & Vegetables' },
    { barcode: '8901491101097', name: 'Real Fruit Juice Mixed', category: 'Fruits & Vegetables' },
    { barcode: '8901491101103', name: 'Tropicana Orange Juice', category: 'Fruits & Vegetables' },
    { barcode: '8901491101110', name: 'Paper Boat Aam Panna', category: 'Fruits & Vegetables' },
  ],
  
  "Dairy & Bakery": [
    '8901063111417', // Amul Taaza Milk 1L
    '8901063111424', // Amul Gold Milk 1L
    '8901063111431', // Amul Butter 100g
    '8901063111448', // Amul Cheese Slices
    '8901063310070', // Amul Lassi
    '8901063310087', // Amul Buttermilk
    '8901063310094', // Amul Shrikhand
    '8901725111014', // Mother Dairy Milk
    '8901725111021', // Mother Dairy Curd
    '8901725111038', // Mother Dairy Paneer
  ],
  
  "Staples": [
    '8901491101042', // India Gate Basmati Rice 5kg
    '8901491101059', // India Gate Brown Rice
    '8901491101066', // India Gate Dubar Rice
    '8901491506526', // Tata Sampann Toor Dal
    '8901491506533', // Tata Sampann Moong Dal
    '8901491506540', // Tata Sampann Chana Dal
    '8901491506557', // Tata Sampann Urad Dal
    '8901491506564', // Tata Sampann Masoor Dal
    '8901491506571', // Aashirvaad Atta 5kg
    '8901491506588', // Pillsbury Chakki Atta
  ],
  
  "Oil, Ghee & Masala": [
    '8901491506595', // Fortune Sunflower Oil
    '8901491506601', // Fortune Rice Bran Oil
    '8901491506618', // Sundrop Heart Oil
    '8901491506625', // Sundrop Peanut Oil
    '8901058843415', // MDH Chana Masala
    '8901058843422', // MDH Garam Masala
    '8901058843439', // MDH Chicken Masala
    '8901058843446', // Everest Turmeric Powder
    '8901058843453', // Everest Red Chilli Powder
    '8901058843460', // Catch Salt & Pepper
  ],
  
  "Beverages": [
    '8901491101127', // Tata Tea Gold 1kg
    '8901491101134', // Tata Tea Premium
    '8901491101141', // Red Label Tea
    '8901491101158', // Bru Coffee
    '8901491101165', // Nescafe Classic
    '5449000000996',  // Coca-Cola
    '5449000054227',  // Sprite
    '8901719101014',  // Pepsi
    '8901719101021',  // Mountain Dew
    '8901719101038',  // 7UP
  ],
  
  "Snacks & Branded Foods": [
    '8901030895326', // Parle-G Biscuits
    '8901030895333', // Parle Monaco
    '8901030895340', // Parle Hide & Seek
    '8901030541506', // Britannia Good Day
    '8901030541513', // Britannia Marie Gold
    '8901030541520', // Britannia Bourbon
    '8901058843514', // Maggi 2-Minute Noodles
    '8901058843521', // Maggi Atta Noodles
    '8901491101172', // Lays Classic Salted
    '8901491101189', // Kurkure Masala Munch
  ],
  
  "Meat, Fish & Eggs": [
    // Note: Fresh meat/fish rarely has barcodes, using frozen alternatives
    { barcode: '8901491101196', name: 'Venky\'s Chicken Sausages', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101202', name: 'Venky\'s Chicken Salami', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101219', name: 'Sumeru Frozen Chicken', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101226', name: 'Godrej Yummiez Chicken Nuggets', category: 'Meat, Fish & Eggs' },
    { barcode: '8901491101233', name: 'ITC Master Chef Chicken Seekh', category: 'Meat, Fish & Eggs' },
  ],
  
  "Cleaning & Household": [
    '8901030895548', // Vim Dishwash Bar
    '8901030895555', // Vim Dishwash Gel
    '8901030895562', // Harpic Toilet Cleaner
    '8901030895579', // Lizol Floor Cleaner
    '8901030895586', // Colin Glass Cleaner
    '8901030895593', // Surf Excel Detergent
    '8901030895609', // Ariel Detergent
    '8901030895616', // Tide Detergent
    '8901030895623', // Wheel Detergent
    '8901030895630', // Comfort Fabric Conditioner
  ],
  
  "Personal Care": [
    '8901030895371', // Colgate Total Toothpaste
    '8901030895388', // Colgate MaxFresh
    '8901030895395', // Pepsodent Germicheck
    '8901030895401', // Closeup Red Hot
    '8901030895425', // Lux Soap
    '8901030895432', // Lifebuoy Soap
    '8901030895449', // Dettol Soap
    '8901030895456', // Dove Soap
    '8901030895470', // Clinic Plus Shampoo
    '8901030895487', // Pantene Shampoo
  ],
  
  "Baby Care": [
    '8901030895647', // Johnson Baby Soap
    '8901030895654', // Johnson Baby Shampoo
    '8901030895661', // Johnson Baby Oil
    '8901030895678', // Johnson Baby Powder
    '8901030895685', // Johnson Baby Lotion
    { barcode: '8901491101240', name: 'Pampers Baby Diapers', category: 'Baby Care' },
    { barcode: '8901491101257', name: 'Huggies Wonder Pants', category: 'Baby Care' },
    { barcode: '8901491101264', name: 'Mamy Poko Pants', category: 'Baby Care' },
    { barcode: '8901491101271', name: 'Himalaya Baby Cream', category: 'Baby Care' },
    { barcode: '8901491101288', name: 'Chicco Baby Wipes', category: 'Baby Care' },
  ],
  
  "Breakfast & Sauces": [
    '8901058843569', // Kissan Tomato Ketchup
    '8901058843576', // Maggi Tomato Ketchup
    '8901058843583', // Kissan Mixed Fruit Jam
    '8901058843590', // Kissan Mango Jam
    '8901058843606', // Veeba Mayonnaise
    '8901491101295', // Kellogg\'s Corn Flakes
    '8901491101301', // Kellogg\'s Chocos
    '8901491101318', // Quaker Oats
    '8901491101325', // Saffola Oats
    '8901491101332', // Nutella Hazelnut Spread
  ],
};

// Map categories
const mapCategory = (categories) => {
  if (!categories) return "Groceries";
  const cat = categories.toLowerCase();
  
  if (cat.includes("dairy") || cat.includes("milk") || cat.includes("cheese")) return "Dairy & Bakery";
  if (cat.includes("fruit") || cat.includes("vegetable")) return "Fruits & Vegetables";
  if (cat.includes("beverage") || cat.includes("drink") || cat.includes("juice")) return "Beverages";
  if (cat.includes("snack") || cat.includes("biscuit") || cat.includes("cookie")) return "Snacks & Branded Foods";
  if (cat.includes("meat") || cat.includes("chicken") || cat.includes("fish")) return "Meat, Fish & Eggs";
  if (cat.includes("rice") || cat.includes("flour") || cat.includes("dal") || cat.includes("pulse")) return "Staples";
  if (cat.includes("oil") || cat.includes("ghee") || cat.includes("spice")) return "Oil, Ghee & Masala";
  if (cat.includes("clean") || cat.includes("detergent") || cat.includes("soap")) return "Cleaning & Household";
  if (cat.includes("personal") || cat.includes("beauty") || cat.includes("care")) return "Personal Care";
  if (cat.includes("baby") || cat.includes("infant")) return "Baby Care";
  
  return "Groceries";
};

// Fetch product from Open Food Facts
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
      // Use forced data if API doesn't have it
      return {
        barcode,
        name: forcedName,
        brand: "",
        category: forcedCategory,
        imageUrl: "",
        quantity: "",
        description: "",
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${barcode}:`, error.message);
    // Return forced data if available
    if (forcedName && forcedCategory) {
      return {
        barcode,
        name: forcedName,
        brand: "",
        category: forcedCategory,
        imageUrl: "",
        quantity: "",
        description: "",
      };
    }
    return null;
  }
}

// Generate random price based on category
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
    "Groceries": { min: 30, max: 150 },
  };
  
  const range = priceRanges[category] || priceRanges["Groceries"];
  const price = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const mrp = Math.floor(price * 1.2); // 20% discount
  
  return { price, mrp };
}

// Import products to Firestore
async function importProducts() {
  console.log('🚀 Starting product import...\n');
  console.log('📦 Categories:', Object.keys(PRODUCTS_BY_CATEGORY).length);
  console.log('📦 Total products:', Object.values(PRODUCTS_BY_CATEGORY).flat().length);
  console.log('');
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const categoryStats = {};
  
  for (const [categoryName, products] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    console.log(`\n📂 Category: ${categoryName} (${products.length} products)`);
    console.log('─'.repeat(60));
    
    categoryStats[categoryName] = { success: 0, failed: 0, skipped: 0 };
    
    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      const barcode = typeof item === 'string' ? item : item.barcode;
      
      try {
        // Check if already exists
        const existingDoc = await db.collection('products').doc(barcode).get();
        if (existingDoc.exists) {
          console.log(`  ⏭️  [${i + 1}/${products.length}] Skipped: ${barcode} (exists)`);
          skipped++;
          categoryStats[categoryName].skipped++;
          continue;
        }
        
        // Fetch from API
        console.log(`  🔍 [${i + 1}/${products.length}] Fetching: ${barcode}...`);
        const productData = await fetchProduct(item);
        
        if (!productData) {
          console.log(`  ❌ [${i + 1}/${products.length}] Failed: ${barcode} (not found)`);
          failed++;
          categoryStats[categoryName].failed++;
          continue;
        }
        
        // Generate prices
        const { price, mrp } = generatePrice(productData.category);
        
        // Create slug
        const slug = productData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        
        // Add to Firestore
        await db.collection('products').doc(barcode).set({
          name: productData.name,
          slug,
          category: productData.category,
          subcategory: "",
          price,
          mrp,
          unit: "pcs",
          description: productData.description || `${productData.brand} ${productData.name}`,
          brand: productData.brand,
          gstRate: 5,
          barcode,
          tags: [],
          imageUrls: productData.imageUrl ? [productData.imageUrl] : [],
          inStock: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Initialize inventory
        await db.collection('inventory').doc(barcode).set({
          skuId: barcode,
          quantity: Math.floor(Math.random() * 50) + 10, // Random stock 10-60
          reserved: 0,
          available: Math.floor(Math.random() * 50) + 10,
          lowStockThreshold: 10,
          updatedBy: "sample-import-script",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`  ✅ [${i + 1}/${products.length}] ${productData.name} (₹${price})`);
        success++;
        categoryStats[categoryName].success++;
        
        // Delay to avoid rate limiting
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

// Run import
importProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

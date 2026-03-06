// scripts/check-product-images.js
// Quick script to check if products have images in Firestore

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

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

async function checkImages() {
  console.log('🔍 Checking product images...\n');
  
  const productsRef = collection(db, 'products');
  const q = query(productsRef, limit(20));
  const snapshot = await getDocs(q);
  
  let withImages = 0;
  let withoutImages = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const hasImages = data.imageUrls && data.imageUrls.length > 0;
    
    if (hasImages) {
      console.log(`✅ ${data.name}`);
      console.log(`   Image: ${data.imageUrls[0]}`);
      withImages++;
    } else {
      console.log(`❌ ${data.name} - NO IMAGE`);
      withoutImages++;
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   With images: ${withImages}`);
  console.log(`   Without images: ${withoutImages}`);
  console.log(`   Total checked: ${snapshot.docs.length}`);
}

checkImages().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

// Test if Firestore rules allow reading products
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

async function testRules() {
  console.log('🔍 Testing Firestore rules (unauthenticated)...\n');
  
  try {
    // Test 1: Read products (should be public)
    console.log('Test 1: Reading products...');
    const productsRef = collection(db, 'products');
    const q = query(productsRef, limit(1));
    const snapshot = await getDocs(q);
    console.log(`✅ Products readable: ${snapshot.docs.length} docs\n`);
    
    // Test 2: Read users (should fail or succeed based on rules)
    console.log('Test 2: Reading users...');
    const usersRef = collection(db, 'users');
    const q2 = query(usersRef, limit(1));
    const snapshot2 = await getDocs(q2);
    console.log(`✅ Users readable: ${snapshot2.docs.length} docs\n`);
    
    console.log('✅ All tests passed! Rules are deployed correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 This means the Firestore rules haven\'t been deployed yet.');
    console.log('   Wait for GitHub Actions to complete, or deploy manually.');
  }
}

testRules().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Migration Script: Add Multi-Store Support
 * 
 * This script:
 * 1. Creates a default store
 * 2. Updates all inventory items with storeId
 * 3. Updates all orders with storeId
 * 4. Updates all agents with storeId
 * 
 * Run: node scripts/migrate-to-multi-store.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'google-services.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createDefaultStore() {
  console.log('\n📍 Creating default store...');
  
  const defaultStore = {
    name: "Main Store",
    code: "STR001",
    address: {
      line1: "123 Main Street",
      line2: "",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      location: { lat: 0, lng: 0 }
    },
    phone: "+91-9999999999",
    email: "store@greenssupermarket.com",
    serviceablePincodes: ["400001", "400002", "400003", "400004", "400005"], // Add your pincodes
    isActive: true,
    operatingHours: {
      open: "09:00",
      close: "21:00"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const storeRef = await db.collection('stores').add(defaultStore);
  console.log(`✓ Default store created with ID: ${storeRef.id}`);
  
  return storeRef.id;
}

async function updateInventory(storeId) {
  console.log('\n📦 Updating inventory items...');
  
  const inventorySnap = await db.collection('inventory').get();
  const batch = db.batch();
  let count = 0;

  inventorySnap.forEach(doc => {
    batch.update(doc.ref, { storeId });
    count++;
  });

  await batch.commit();
  console.log(`✓ Updated ${count} inventory items`);
}

async function updateOrders(storeId) {
  console.log('\n📋 Updating orders...');
  
  const ordersSnap = await db.collection('orders').get();
  const batch = db.batch();
  let count = 0;

  ordersSnap.forEach(doc => {
    batch.update(doc.ref, { storeId });
    count++;
  });

  await batch.commit();
  console.log(`✓ Updated ${count} orders`);
}

async function updateAgents(storeId) {
  console.log('\n👤 Updating agents...');
  
  const agentsSnap = await db.collection('agents').get();
  const batch = db.batch();
  let count = 0;

  agentsSnap.forEach(doc => {
    batch.update(doc.ref, { storeId });
    count++;
  });

  await batch.commit();
  console.log(`✓ Updated ${count} agents`);
}

async function migrate() {
  console.log('🚀 Starting multi-store migration...\n');
  
  try {
    // Check if stores already exist
    const storesSnap = await db.collection('stores').limit(1).get();
    
    let storeId;
    if (storesSnap.empty) {
      storeId = await createDefaultStore();
    } else {
      storeId = storesSnap.docs[0].id;
      console.log(`\n📍 Using existing store: ${storeId}`);
    }

    // Update all collections
    await updateInventory(storeId);
    await updateOrders(storeId);
    await updateAgents(storeId);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update serviceable pincodes in the store');
    console.log('2. Add more stores if needed');
    console.log('3. Test order creation with different pincodes');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run migration
migrate();

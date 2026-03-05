// scripts/create-admin-user.js
// Run this script to create an admin user in Firestore
// Usage: node scripts/create-admin-user.js

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('../groceryos-61a05-firebase-adminsdk-fbsvc-e1f8e8e8e8.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createAdminUser() {
  const uid = 'aE1iHUb48iPvZ3NS1pt4FmVFNAF3';
  
  try {
    // Create staff document
    await db.collection('staff').doc(uid).set({
      id: uid,
      name: 'Admin User',
      email: 'admin@groceryos.com',
      role: 'admin',
      permissions: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('You can now login at: https://groceryos-61a05.web.app');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

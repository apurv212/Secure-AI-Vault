require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase (reuse existing initialization)
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: 'googleapis.com'
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
} catch (e) {
  // Already initialized
}

const { encryptCardData } = require('./utils/encryption');

async function testUpdate() {
  const db = admin.firestore();
  
  // Test data from user
  const testData = {
    cardNumber: '3581357854128781',
    cvv: '239',
    expiryDate: '01/29',
    cardName: 'LEAGUE',
    bank: 'Kotak Mahindra',
    cardHolderName: 'APURV SHASHWAT',
    type: 'debit'
  };
  
  try {
    console.log('1. Encrypting data...');
    const encrypted = encryptCardData(testData);
    console.log('✅ Encryption successful');
    
    console.log('2. Testing Firestore update...');
    // Use a test document
    const testDocRef = db.collection('cards').doc('test-update-doc');
    
    await testDocRef.set({
      ...encrypted,
      userId: 'test-user',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Firestore set successful');
    
    // Try update
    await testDocRef.update({
      ...encrypted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Firestore update successful');
    
    // Clean up
    await testDocRef.delete();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testUpdate();

// =============================
// Firebase Configuration
// =============================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, push, onValue, update, remove, query, orderByChild } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-dlPoUqEjwgJgDnVP6zeB0n4PEFtuoY0",
  authDomain: "sdoinqms.firebaseapp.com",
  databaseURL: "https://sdoinqms-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sdoinqms",
  storageBucket: "sdoinqms.firebasestorage.app",
  messagingSenderId: "86692942325",
  appId: "1:86692942325:web:0b7ba2f5385ff72e4dd0bc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Export for use in other scripts
export { database, ref, set, push, onValue, update, remove, query, orderByChild };


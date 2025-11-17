// =============================
// Firebase Configuration
// =============================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, push, onValue, update, remove, query, orderByChild } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmKiGvyq6H0Ym5BHXaOXePfgs5X_RF51A",
  authDomain: "sdoinqms-1c17d.firebaseapp.com",
  databaseURL: "https://sdoinqms-1c17d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sdoinqms-1c17d",
  storageBucket: "sdoinqms-1c17d.firebasestorage.app",
  messagingSenderId: "750619920034",
  appId: "1:750619920034:web:c84ceb2e5771f6d7e4b9fb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Export for use in other scripts
export { database, ref, set, push, onValue, update, remove, query, orderByChild };


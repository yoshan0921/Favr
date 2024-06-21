import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
//importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA98KYP3hvGX8q7uk1WNdEStxMo1S85HmA",
  authDomain: "integrated-project-pwa.firebaseapp.com",
  projectId: "integrated-project-pwa",
  storageBucket: "integrated-project-pwa.appspot.com",
  messagingSenderId: "773054560330",
  appId: "1:773054560330:web:49b001fd6ab030f08c4eb3",
  measurementId: "G-BWXW6C61EP",
};

// Initialize Firebase
export const firebase = initializeApp(firebaseConfig);
export const auth = getAuth(firebase);
export const firestore = getFirestore(firebase);
export const storage = getStorage(firebase);
export const messaging = getMessaging(firebase);
export const database = getDatabase(firebase);

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5xE-Bmu8LiDJlJFOHvXNLjOXVAmRdHpo",
  authDomain: "school-lost-and-found-dde60.firebaseapp.com",
  projectId: "school-lost-and-found-dde60",
  storageBucket: "school-lost-and-found-dde60.firebasestorage.app",
  messagingSenderId: "345161855212",
  appId: "1:345161855212:web:02d1656771329ce15bb5c9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

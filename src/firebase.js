import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getFunctions } from "firebase/functions" // <--- ADD THIS

// REPLACE THIS WITH YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyDRZl9AL0aEciLJPDBOzmWVkJnw59-l0xk",
  authDomain: "dogmapbuilder.firebaseapp.com",
  projectId: "dogmapbuilder",
  storageBucket: "dogmapbuilder.firebasestorage.app",
  messagingSenderId: "45229518982",
  appId: "1:45229518982:web:6e708b1b2d7ef64a766107",
  measurementId: "G-YGJDHJDVGJ"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
// Explicitly tell the SDK which region your backend lives in
const functions = getFunctions(app, 'us-central1')
const googleProvider = new GoogleAuthProvider()

export { auth, db, functions, googleProvider }
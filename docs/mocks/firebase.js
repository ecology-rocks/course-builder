// docs/mocks/firebase.js

// 1. Mock the specific objects your app uses
export const db = { type: 'mock-db' }
export const auth = { type: 'mock-auth', currentUser: null }
export const storage = { type: 'mock-storage' }

// 2. Mock the LIBRARY functions (firebase/auth, firebase/firestore)
// We return simple promises or no-ops so nothing crashes.

// --- Auth Mocks ---
export const getAuth = () => auth
export const onAuthStateChanged = (auth, callback) => {
  // Immediately say "No user is logged in"
  callback(null)
  return () => {} // Return a dummy unsubscribe function
}

// --- Firestore Mocks ---
export const getFirestore = () => db
export const doc = () => 'mock-doc-ref'
export const collection = () => 'mock-collection-ref'
export const query = () => 'mock-query'
export const where = () => 'mock-where'

// Return a Promise that resolves to specific dummy data for "getDoc"
export const getDoc = async () => ({
  exists: () => true,
  data: () => ({ some: 'mock-data' })
})

// Return a void Promise for "setDoc/updateDoc"
export const setDoc = async () => {}
export const updateDoc = async () => {}

console.log('⚠️ FULL Firebase Mock Loaded ⚠️')
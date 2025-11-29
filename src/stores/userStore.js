import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail 
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase' // Make sure you import db



export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const tier = ref('free')
  const isAuthReady = ref(false)
  const authError = ref(null) // To display errors like "Wrong password"

// Load user profile from Firestore (where we store their subscription status)
  async function loadUserProfile(uid) {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      tier.value = docSnap.data().tier || 'free'
    } else {
      // Create default profile for new user
      await setDoc(docRef, { tier: 'free', email: user.value.email })
      tier.value = 'free'
    }
  }

  // Hook into auth state change
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (u) {
      await loadUserProfile(u.uid)
    } else {
      tier.value = 'free'
    }
  })

  async function resetPassword(email) {
    authError.value = null
    try {
      await sendPasswordResetEmail(auth, email)
      alert("Password reset email sent! Check your inbox.")
    } catch (e) {
      console.error(e)
      authError.value = formatError(e.code)
    }
  }

function can(action) {
    if (tier.value === 'club') return true // Club can do everything
    
    if (action === 'save_cloud' || action === 'export_json') {
      return tier.value === 'solo' || tier.value === 'club'
    }
    
    if (action === 'mark_hides') {
      return tier.value === 'solo' || tier.value === 'club'
    }
    
    return true // Everyone can do basic stuff
  }

  async function register(email, password) {
    authError.value = null
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      // Auto-logs in after creation
    } catch (e) {
      console.error(e)
      authError.value = formatError(e.code)
    }
  }

  async function login(email, password) {
    authError.value = null
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      console.error(e)
      authError.value = formatError(e.code)
    }
  }

  async function logout() {
    authError.value = null
    await signOut(auth)
    user.value = null
  }

  // Helper to make Firebase error codes readable
  function formatError(code) {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email already in use.'
      case 'auth/invalid-email': return 'Invalid email address.'
      case 'auth/weak-password': return 'Password should be at least 6 characters.'
      case 'auth/user-not-found': return 'User not found.'
      case 'auth/wrong-password': return 'Incorrect password.'
      default: return 'Login failed. Please try again.'
    }
  }

  return { user, tier, can, isAuthReady, authError, register, resetPassword, login, logout }
})
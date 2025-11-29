import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, db } from '../firebase' // Ensure db is imported
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isAuthReady = ref(false)
  const authError = ref(null)
  
  // Profile Data
  const tier = ref('free') 
  const judgeName = ref('') 

  // 1. LOAD PROFILE
  async function loadUserProfile(uid) {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      tier.value = data.tier || 'free'
      judgeName.value = data.judgeName || user.value.displayName || user.value.email
    } else {
      // Create default profile for new user
      await setDoc(docRef, { 
        tier: 'free', 
        email: user.value.email,
        judgeName: user.value.displayName || '' 
      })
      tier.value = 'free'
      judgeName.value = user.value.displayName || ''
    }
  }

  // 2. UPDATE JUDGE NAME
  async function updateJudgeName(newName) {
    if (!user.value) return
    try {
      const docRef = doc(db, "users", user.value.uid)
      // Merge: true ensures we don't wipe out the 'tier' field
      await setDoc(docRef, { judgeName: newName }, { merge: true })
      
      // Update local state immediately so UI updates
      judgeName.value = newName
    } catch (e) {
      console.error("Failed to update name", e)
      alert("Could not update profile in database.")
    }
  }

  // 3. AUTH LISTENERS
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (u) {
      await loadUserProfile(u.uid)
    } else {
      tier.value = 'free'
      judgeName.value = ''
    }
    isAuthReady.value = true
  })

  // 4. AUTH ACTIONS
  async function register(email, password) {
    authError.value = null
    try {
      await createUserWithEmailAndPassword(auth, email, password)
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
    tier.value = 'free'
    judgeName.value = ''
  }

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

  // 5. PERMISSIONS
  function can(action) {
    const currentTier = tier.value.trim().toLowerCase()
    
    if (currentTier === 'club') return true 
    
    if (action === 'save_cloud' || action === 'export_json' || action === 'mark_hides') {
      return currentTier === 'solo' || currentTier === 'club'
    }
    
    return true
  }

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

  return { 
    user, 
    isAuthReady, 
    authError, 
    tier, 
    judgeName, // <--- EXPORTED STATE
    loadUserProfile,
    updateJudgeName, // <--- EXPORTED ACTION
    register, 
    login, 
    logout, 
    resetPassword,
    can
  }
})
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

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isAuthReady = ref(false)
  const authError = ref(null) // To display errors like "Wrong password"

  // Monitor login state
  onAuthStateChanged(auth, (u) => {
    user.value = u
    isAuthReady.value = true
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

  return { user, isAuthReady, authError, register, resetPassword, login, logout }
})
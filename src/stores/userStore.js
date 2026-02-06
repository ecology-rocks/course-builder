import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth, db } from '@/firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const user = ref(null)
  const userProfile = ref(null)
  const loading = ref(true)
  const authError = ref(null)
  const justRegistered = ref(false) // <--- NEW FLAG

  // --- GETTERS ---
  const judgeName = computed(() => userProfile.value?.judgeName || user.value?.displayName || '')
  
  const isPro = computed(() => {
    if (!userProfile.value) return false
    return ['pro', 'founder', 'club'].includes(userProfile.value.tier)
  })

  const tier = computed(() => userProfile.value?.tier || 'free')

  // --- ACTIONS ---

  function init() {
    loading.value = true
    onAuthStateChanged(auth, async (currentUser) => {
      user.value = currentUser
      if (currentUser) {
        await fetchUserProfile(currentUser.uid)
      } else {
        userProfile.value = null
      }
      loading.value = false
    })
  }

  async function fetchUserProfile(uid) {
    try {
      const docRef = doc(db, 'users', uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        userProfile.value = docSnap.data()
      } else {
        console.warn("User document not found, treating as free tier.")
        userProfile.value = { tier: 'free' } 
      }
    } catch (e) {
      console.error("Error fetching user profile:", e)
      userProfile.value = { tier: 'free' }
    }
  }

  async function login(email, password) {
    loading.value = true
    authError.value = null
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (error) {
      handleAuthError(error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(email, password, sportType = 'barnhunt', name = '') {
    loading.value = true
    authError.value = null
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const uid = userCredential.user.uid

      await setDoc(doc(db, 'users', uid), {
        email: email,
        tier: 'free', 
        primarySport: sportType,
        createdAt: new Date().toISOString(),
        judgeName: name 
      })

      justRegistered.value = true // <--- SET FLAG
      return true
    } catch (error) {
      handleAuthError(error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await signOut(auth)
    user.value = null
    userProfile.value = null
    justRegistered.value = false
  }

  async function resetPassword(email) {
    loading.value = true
    authError.value = null
    try {
      await sendPasswordResetEmail(auth, email)
      alert("Password reset email sent! Check your inbox.")
      return true
    } catch (error) {
      handleAuthError(error)
      return false
    } finally {
      loading.value = false
    }
  }

  function handleAuthError(error) {
    console.error(error)
    switch (error.code) {
      case 'auth/invalid-email':
        authError.value = "Invalid email address."
        break
      case 'auth/user-disabled':
        authError.value = "This account has been disabled."
        break
      case 'auth/user-not-found':
        authError.value = "No account found with this email."
        break
      case 'auth/wrong-password':
        authError.value = "Incorrect password."
        break
      case 'auth/email-already-in-use':
        authError.value = "Email is already in use."
        break
      case 'auth/weak-password':
        authError.value = "Password is too weak."
        break
      default:
        authError.value = "An error occurred. Please try again."
    }
  }

init()

  return {
    user,
    loading,
    authError,
    justRegistered, // <--- EXPORT
    isPro,
    tier,
    judgeName,
    init,
    login,
    register,
    logout,
    resetPassword,
    fetchUserProfile
  }
})
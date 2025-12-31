import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, db, storage } from '../firebase' // <--- Added storage here
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore'
import { 
  ref as storageRef, // <--- Aliased 'ref' to 'storageRef' to avoid conflict with Vue's ref
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isAuthReady = ref(false)
  const authError = ref(null)
  
  // Profile Data
  const tier = ref('free') 
  const judgeName = ref('') 
  const allowedSports = ref([])
  const clubLogoUrl = ref(null) // <--- NEW: Logo URL
  const clubName = ref('') // <--- NEW
  // Club Data (If user is a Club)
  const sponsoredEmails = ref([]) 
  const seatLimit = ref(4)

  // Sponsorship Data (If user is a Sponsored Judge)
  const sponsoringClubName = ref(null)

  // 1. LOAD PROFILE
  async function loadUserProfile(uid) {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      tier.value = data.tier || 'free'
      judgeName.value = data.judgeName || user.value.displayName || user.value.email
      allowedSports.value = data.allowedSports || ['barnhunt']
      clubLogoUrl.value = data.clubLogoUrl || null
      clubName.value = data.clubName || '' // <--- NEW
      
      // If I am a CLUB, load my roster
if (tier.value === 'club') {
        sponsoredEmails.value = data.sponsoredEmails || []
        // Load custom limit from DB, or default to 5
        seatLimit.value = data.seatLimit || 5
      }

      // If I am FREE, check if a Club sponsors me
      if (tier.value === 'free') {
        await checkSponsorship(user.value.email)
      }

    } else {
      // Create default profile
      await setDoc(docRef, { 
        tier: 'free', 
        email: user.value.email,
        judgeName: user.value.displayName || '',
        allowedSports: ['barnhunt']
      })
      tier.value = 'free'
      judgeName.value = user.value.displayName || ''
      allowedSports.value = ['barnhunt']
    }
  }

  // --- SPONSORSHIP LOGIC ---

async function updateClubName(newName) {
    if (!user.value) return
    try {
      const docRef = doc(db, "users", user.value.uid)
      await setDoc(docRef, { clubName: newName }, { merge: true })
      clubName.value = newName
    } catch (e) {
      console.error("Failed to update club name", e)
      alert("Could not save club name.")
    }
  }

  async function checkSponsorship(myEmail) {
    try {
      const usersRef = collection(db, "users")
      const q = query(
        usersRef, 
        where("tier", "==", "club"),
        where("sponsoredEmails", "array-contains", myEmail)
      )
      
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const sponsorDoc = snapshot.docs[0].data()
        tier.value = 'pro' 
        sponsoringClubName.value = sponsorDoc.judgeName || "A Club"
        allowedSports.value = ['barnhunt', 'agility', 'scentwork']
      }
    } catch (e) {
      console.error("Sponsorship check failed", e)
    }
  }

  async function addSponsoredJudge(targetEmail) {
    if (tier.value !== 'club') return
    if (sponsoredEmails.value.length >= seatLimit.value) {
      alert(`You have used all ${seatLimit.value} seats. Please contact support to add more.`)
      return
    }
    try {
      const docRef = doc(db, "users", user.value.uid)
      await updateDoc(docRef, {
        sponsoredEmails: arrayUnion(targetEmail)
      })
      sponsoredEmails.value.push(targetEmail)
    } catch (e) {
      console.error(e)
      alert("Failed to add judge.")
    }
  }

  async function removeSponsoredJudge(targetEmail) {
    if (tier.value !== 'club') return
    try {
      const docRef = doc(db, "users", user.value.uid)
      await updateDoc(docRef, {
        sponsoredEmails: arrayRemove(targetEmail)
      })
      sponsoredEmails.value = sponsoredEmails.value.filter(e => e !== targetEmail)
    } catch (e) {
      console.error(e)
      alert("Failed to remove judge.")
    }
  }

  // 2. PROFILE ACTIONS
  async function updateJudgeName(newName) {
    if (!user.value) return
    try {
      const docRef = doc(db, "users", user.value.uid)
      await setDoc(docRef, { judgeName: newName }, { merge: true })
      judgeName.value = newName
    } catch (e) {
      console.error("Failed to update name", e)
      alert("Could not update profile in database.")
    }
  }

  // --- NEW: UPLOAD LOGO ---
  async function uploadLogo(file) {
    if (!user.value) return
    
    try {
      // 1. Create a reference (logos/USER_ID)
      // Uses the 'storageRef' we imported at the top
      const fileRef = storageRef(storage, `logos/${user.value.uid}`)
      
      // 2. Upload
      await uploadBytes(fileRef, file)
      
      // 3. Get URL
      const url = await getDownloadURL(fileRef)
      
      // 4. Save to Firestore
      const docRef = doc(db, "users", user.value.uid)
      await updateDoc(docRef, { clubLogoUrl: url })
      
      // 5. Update Local State
      clubLogoUrl.value = url
      return url
    } catch (e) {
      console.error("Upload failed", e)
      alert("Failed to upload logo.")
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
      allowedSports.value = []
      sponsoredEmails.value = []
      sponsoringClubName.value = null
      clubLogoUrl.value = null
    }
    isAuthReady.value = true
  })

  // 4. AUTH ACTIONS
  async function register(email, password, primarySport = 'barnhunt') {
    authError.value = null
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password)
      
      // Create Profile Immediately with selected sport
      const docRef = doc(db, "users", res.user.uid)
      await setDoc(docRef, { 
        tier: 'free', 
        email: email,
        judgeName: '',
        allowedSports: [primarySport],
        createdAt: new Date()
      })
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
  function canAccessSport(sport) {
    const t = tier.value
    if (t === 'pro' || t === 'club') return true
    return allowedSports.value.includes(sport)
  }

  function can(action) {
    const t = tier.value
    if (t === 'club' || t === 'pro') return true 
    if (action === 'save_cloud' || action === 'export_json' || action === 'mark_hides') {
      return t === 'solo'
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
    judgeName, 
    allowedSports, 
    clubLogoUrl, // <--- Exported
    sponsoredEmails, 
    sponsoringClubName, 
    loadUserProfile,
    updateJudgeName,
    uploadLogo, // <--- Exported
    register, 
    login, 
    logout, 
    resetPassword,
    can,
    canAccessSport,
    addSponsoredJudge,
    removeSponsoredJudge,
    clubName,
    updateClubName,
    seatLimit,
  }
})
<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import { functions, auth } from '../firebase' 
import { httpsCallable } from 'firebase/functions'

const userStore = useUserStore()
const router = useRouter()

const newName = ref('')

// --- STRIPE CONFIGURATION ---
const PRICE_ID_SOLO = import.meta.env.VITE_STRIPE_PRICE_SOLO
const PRICE_ID_CLUB = import.meta.env.VITE_STRIPE_PRICE_CLUB

onMounted(() => {
  if (userStore.user) {
    newName.value = userStore.judgeName
  } else {
    router.push('/') 
  }
})

async function handleUpdateProfile() {
  if (newName.value && newName.value.trim() !== "") {
    await userStore.updateJudgeName(newName.value.trim())
    alert("Profile updated!")
  }
}

async function handlePasswordReset() {
  if (confirm(`Send a password reset email to ${userStore.user.email}?`)) {
    await userStore.resetPassword(userStore.user.email)
  }
}

// --- PAYMENT LOGIC ---
async function handleUpgrade(targetTier) {
  // 1. Safety Check
  if (!auth.currentUser) {
    alert("You appear to be logged out. Please refresh the page and login.")
    return
  }

  // 2. Select Price ID based on button clicked
  let priceId = null
  if (targetTier === 'solo') priceId = PRICE_ID_SOLO
  if (targetTier === 'club') priceId = PRICE_ID_CLUB

  if (!priceId) return alert("Invalid tier selection.")

  // 3. FORCE TOKEN REFRESH (Fixes "Unauthenticated" errors)
  try {
    await auth.currentUser.getIdToken(true)
  } catch (e) {
    console.error("Token refresh failed", e)
    alert("Authentication error. Please login again.")
    return
  }

  try {
    // 4. Call Backend
    const createSession = httpsCallable(functions, 'createCheckoutSession')
    
    const response = await createSession({
      priceId: priceId,
      tierName: targetTier, // 'solo' or 'club'
      successUrl: window.location.origin + '/dashboard', 
      cancelUrl: window.location.origin + '/settings'    
    })

    // 5. Redirect to Stripe
    if (response.data.url) {
      window.location.href = response.data.url
    }
  } catch (e) {
    console.error("Payment Error:", e)
    alert(`Failed to start payment: ${e.message}`)
  }
}

async function handlePortal() {
  alert("Customer Portal coming soon! Please contact support to cancel or change plans.")
}
</script>

<template>
  <div class="settings-page">
    
    <nav class="navbar">
      <div class="logo" @click="router.push('/dashboard')">
        🐾 K9CourseBuilder.com
      </div>
      <button @click="router.push('/dashboard')" class="btn-text">← Back to Dashboard</button>
    </nav>

    <div class="container">
      <h1>Account Settings</h1>

      <section class="card highlight-card">
        <div class="card-header">
          <h2>Subscription</h2>
          <span class="badge" :class="userStore.tier">{{ userStore.tier.toUpperCase() }}</span>
        </div>
        <div class="card-body">
          <div v-if="userStore.tier === 'free'">
            <p>You are currently on the <strong>Free</strong> plan. Upgrade to unlock Cloud Saves, Sharing, and JSON Export.</p>
            
            <div class="pricing-buttons">
              <button 
                class="btn-primary" 
                @click="handleUpgrade('solo')"
              >
                Upgrade to Solo ($8/mo)
              </button>
              
              <button 
                class="btn-club" 
                @click="handleUpgrade('club')"
              >
                Upgrade to Club ($49/mo)
              </button>
            </div>
          </div>

          <div v-else>
            <p>
              You are a <strong>{{ userStore.tier === 'solo' ? 'Solo Judge' : 'Club' }}</strong> member. Thank you for your support!
            </p>
            <button class="btn-outline" @click="handlePortal">Manage Billing</button>
          </div>
          
        </div>
      </section>

      <section class="card">
        <h2>Judge Profile</h2>
        <p class="hint">This name will appear on all your printed maps.</p>
        
        <div class="form-group">
          <label>Judge Name:</label>
          <div class="input-row">
            <input v-model="newName" type="text" />
            <button @click="handleUpdateProfile">Save</button>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Security</h2>
        <div class="form-group">
          <label>Email Address:</label>
          <input :value="userStore.user?.email" disabled class="disabled-input" />
          <small>To change your email, please contact support.</small>
        </div>
        
        <div class="form-group" style="margin-top: 20px;">
          <label>Password:</label>
          <button @click="handlePasswordReset" class="btn-outline">Send Password Reset Email</button>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.settings-page { max-width: 800px; margin: 0 auto; padding-bottom: 50px; }

/* NAV */
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #eee; margin-bottom: 30px; background: white; }
.logo { font-weight: 800; font-size: 1.2rem; color: #2c3e50; cursor: pointer; }
.btn-text { background: none; border: none; color: #666; cursor: pointer; font-weight: bold; }
.btn-text:hover { text-decoration: underline; color: #333; }

/* CONTAINER & CARDS */
.container { padding: 0 20px; }
.card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 25px; margin-bottom: 20px; }
.card h2 { margin-top: 0; font-size: 1.2rem; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
.hint { color: #666; font-size: 0.9em; margin-bottom: 15px; }

/* HIGHLIGHT CARD (Subscription) */
.highlight-card { border-color: #4CAF50; border-width: 2px; }
.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
.card-header h2 { border: none; margin: 0; padding: 0; }
.badge { background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; }
.badge.pro, .badge.solo { background: #ffd700; color: #000; }
.badge.club { background: #9c27b0; color: white; }

/* PRICING BUTTONS */
.pricing-buttons { display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; }

/* FORMS */
.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 5px; color: #444; }
.input-row { display: flex; gap: 10px; }
.input-row input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
.input-row button { padding: 8px 20px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; }
.disabled-input { width: 100%; padding: 8px; border: 1px solid #eee; background: #f9f9f9; color: #888; border-radius: 4px; }

/* BUTTONS */
.btn-primary { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:hover { background-color: #43a047; }
.btn-club { background-color: #9c27b0; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-club:hover { background-color: #7b1fa2; }

.btn-outline { background: white; border: 2px solid #ccc; color: #333; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-outline:hover { border-color: #333; }
</style>
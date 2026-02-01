<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from 'stores/userStore'
import { useRouter } from 'vue-router'
import { functions, auth } from '@/firebase'
import { httpsCallable } from 'firebase/functions'

const userStore = useUserStore()
const router = useRouter()

const newName = ref('')
const newJudgeEmail = ref('') // Input for the email to add
const localClubName = ref('')
// --- STRIPE CONFIGURATION ---
const PRICE_ID_SOLO = import.meta.env.VITE_STRIPE_PRICE_SOLO
const PRICE_ID_PRO = import.meta.env.VITE_STRIPE_PRICE_PRO
const PRICE_ID_CLUB = import.meta.env.VITE_STRIPE_PRICE_CLUB
const PRICE_ID_FOUNDER = import.meta.env.VITE_STRIPE_PRICE_FOUNDER

// In <script setup>
async function handleLogoUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // Basic validation
  if (file.size > 1024 * 1024) { // 1MB limit
    return alert("File is too large. Please use an image under 1MB.")
  }

  await userStore.uploadLogo(file)
}

onMounted(() => {
  if (userStore.clubName) {
    localClubName.value = userStore.clubName
  }
  if (userStore.user) {
    newName.value = userStore.judgeName
  } else {
    router.push('/')
  }
})

async function saveClubName() {
  await userStore.updateClubName(localClubName.value)
  alert("Club Name Saved!")
}

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
async function handleUpgrade() {
  if (!auth.currentUser) return alert("Please login again.")
  if (!PRICE_ID_FOUNDER) return alert("System Error: Founder Price ID missing.")

  try {
    const createSession = httpsCallable(functions, 'createCheckoutSession')
    const response = await createSession({
      priceId: PRICE_ID_FOUNDER,
      tierName: 'pro', // We map Founder -> Pro internally
      successUrl: window.location.origin + '/dashboard',
      cancelUrl: window.location.origin + '/settings'
    })
    if (response.data.url) window.location.href = response.data.url
  } catch (e) {
    console.error("Payment Error:", e)
    alert(`Payment failed: ${e.message}`)
  }
}

// Inside <script setup> in Settings.vue

async function handleManageBilling() {
  try {
    const createPortal = httpsCallable(functions, 'createPortalSession')
    const response = await createPortal({ returnUrl: window.location.href })
    if (response.data.url) window.location.href = response.data.url
  } catch (e) {
    alert("Could not open billing portal.")
  }
}

async function handleAddJudge() {
  if (!newJudgeEmail.value || !newJudgeEmail.value.includes('@')) {
    return alert("Please enter a valid email.")
  }
  await userStore.addSponsoredJudge(newJudgeEmail.value.trim())
  newJudgeEmail.value = '' // Clear input
}

async function handleRemoveJudge(email) {
  if (confirm(`Remove access for ${email}?`)) {
    await userStore.removeSponsoredJudge(email)
  }
}
</script>

<template>
  <div class="settings-page">
    <nav class="navbar">
      <div class="logo" @click="router.push('/dashboard')">🐾 K9CourseBuilder</div>
      <button @click="router.push('/dashboard')" class="btn-text">← Back</button>
    </nav>

    <div class="container">
      <h1>Settings</h1>

      <section class="card highlight-card">
        <div class="card-header">
          <h2>License Status</h2>
          <span class="badge" :class="userStore.tier">{{ userStore.tier.toUpperCase() }}</span>
        </div>
        
        <div class="card-body">
          <div v-if="userStore.isPro">
            <div v-if="userStore.sponsoringClubName" class="sponsor-msg">
              🎉 <strong>Pro Access Active</strong> (Beta Program via {{ userStore.sponsoringClubName }})
            </div>
            <div v-else class="founder-msg">
              👑 <strong>Founder's License Active</strong><br>
              Thank you for supporting early development.
            </div>
            <button class="btn-outline" @click="handleManageBilling">Manage Subscription</button>
          </div>

          <div v-else>
            <p>Upgrade to the <strong>Founder's Tier</strong> to unlock:</p>
            <ul class="feature-list">
              <li>✅ Clean PDF Exports (No Watermark)</li>
              <li>✅ Cloud Saving & Sync</li>
              <li>✅ Support Future Development</li>
              <li>✨ <strong>Bonus:</strong> Offline Desktop App (Coming Late 2026)</li>
            </ul>

            <div class="founder-offer">
              <div class="offer-header">EARLY ADOPTER SPECIAL</div>
              <div class="price">$59<span>/year</span></div>
              <p class="lock-in">Lock in this price forever.</p>
              <button class="btn-primary full-width" @click="handleUpgrade">
                Upgrade to Founder's Tier
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="userStore.tier === 'club'" class="card admin-card">
        <div class="card-header">
          <h2>👑 Beta Admin / Club Roster</h2>
          <span class="badge club">{{ userStore.sponsoredEmails.length }} / {{ userStore.seatLimit }} Seats</span>
        </div>

        <p class="hint">Add Beta Testers here. They get instant Pro access.</p>

        <div class="roster-add-row">
          <input v-model="newJudgeEmail" placeholder="tester@example.com" @keyup.enter="handleAddJudge" />
          <button @click="handleAddJudge" class="btn-primary">Add</button>
        </div>

        <ul class="roster-list">
          <li v-for="email in userStore.sponsoredEmails" :key="email">
            <span>👤 {{ email }}</span>
            <button @click="handleRemoveJudge(email)" class="btn-xs delete">Remove</button>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>Judge Profile</h2>
        <div class="form-group">
          <label>Judge Name (Appears on Maps):</label>
          <div class="input-row">
            <input v-model="newName" type="text" />
            <button @click="handleUpdateProfile">Save</button>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Security</h2>
        <div class="form-group">
          <label>Email:</label>
          <input :value="userStore.user?.email" disabled class="disabled-input" />
        </div>
        <button @click="handlePasswordReset" class="btn-outline">Reset Password</button>
      </section>

    </div>
  </div>
</template>
<style scoped>
.settings-page { max-width: 800px; margin: 0 auto; padding-bottom: 50px; }
.navbar { display: flex; justify-content: space-between; padding: 15px 20px; background: white; border-bottom: 1px solid #eee; margin-bottom: 30px; }
.logo { font-weight: 800; cursor: pointer; color: #2c3e50; }
.btn-text { background: none; border: none; cursor: pointer; font-weight: bold; color: #666; }

.container { padding: 0 20px; }
.card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 25px; margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
.card h2 { margin: 0; font-size: 1.2rem; }

.highlight-card { border: 2px solid #4CAF50; }
.badge { background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; }
.badge.free { background: #e0e0e0; color: #555; }
.badge.pro { background: #FFD700; color: #000; }
.badge.club { background: #9c27b0; color: white; }

/* Founder Offer Styles */
.founder-offer { background: #f1f8e9; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #c5e1a5; margin-top: 20px; }
.offer-header { color: #2e7d32; font-weight: 800; letter-spacing: 1px; font-size: 0.9rem; margin-bottom: 10px; }
.price { font-size: 2.5rem; font-weight: 900; color: #2c3e50; }
.price span { font-size: 1rem; color: #666; font-weight: normal; }
.lock-in { color: #555; font-style: italic; margin-bottom: 15px; }
.feature-list { list-style: none; padding: 0; margin-bottom: 20px; }
.feature-list li { margin-bottom: 8px; }
.full-width { width: 100%; padding: 12px; font-size: 1.1rem; }

/* Admin Card */
.admin-card { border-color: #9c27b0; background: #fafafa; }
.roster-add-row { display: flex; gap: 10px; margin-bottom: 15px; }
.roster-add-row input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.roster-list li { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; background: white; margin-bottom: 4px; }

/* Buttons & Inputs */
.btn-primary { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:hover { background: #43a047; }
.btn-outline { background: white; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-xs.delete { background: white; color: #d32f2f; border: 1px solid #ffcdd2; padding: 2px 8px; border-radius: 4px; cursor: pointer; }

.input-row { display: flex; gap: 10px; }
.input-row input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.disabled-input { width: 100%; padding: 8px; background: #f5f5f5; border: 1px solid #eee; color: #777; }
.sponsor-msg { background: #e3f2fd; color: #1565c0; padding: 10px; border-radius: 4px; }
</style>
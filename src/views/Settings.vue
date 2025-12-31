<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import { functions, auth } from '../firebase'
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
async function handleUpgrade(targetTier) {
  // 1. Safety Check
  if (!auth.currentUser) {
    alert("You appear to be logged out. Please refresh the page and login.")
    return
  }

  // 2. Select Price ID based on button clicked
  let priceId = null
  if (targetTier === 'solo') priceId = PRICE_ID_SOLO
  if (targetTier === 'pro') priceId = PRICE_ID_PRO
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

// Inside <script setup> in Settings.vue

async function handleManageBilling() {
  if (!userStore.user) return

  // 1. Loading State (Optional: add a loading ref)
  // isLoading.value = true

  try {
    const createPortal = httpsCallable(functions, 'createPortalSession')

    // 2. Call Backend
    const response = await createPortal({
      returnUrl: window.location.href // Come back to this exact page
    })

    // 3. Redirect
    if (response.data.url) {
      window.location.href = response.data.url
    }
  } catch (e) {
    console.error(e)
    alert("Could not open billing portal. Please contact support.")
  } finally {
    // isLoading.value = false
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
          <div v-if="userStore.sponsoringClubName" class="sponsor-msg">
            🎉 You have <strong>Pro Access</strong> courtesy of <strong>{{ userStore.sponsoringClubName }}</strong>.
          </div>

          <div v-if="userStore.tier === 'free'">
            <p>Upgrade to unlock Cloud Saves, Sharing, and Export.</p>

            <div class="pricing-grid">
              <div class="plan-col">
                <h3>Solo</h3>
                <div class="price">$6<span>/mo</span></div>
                <p class="desc">Single Sport (Barn Hunt)</p>
                <button class="btn-primary" @click="handleUpgrade('solo')">Go Solo</button>
              </div>

              <div class="plan-col best-value">
                <div class="badge-pop">BEST VALUE</div>
                <h3>Pro</h3>
                <div class="price">$10<span>/mo</span></div>
                <p class="desc">All Sports + Power Tools</p>
                <button class="btn-primary" @click="handleUpgrade('pro')">Go Pro</button>
              </div>

              <div class="plan-col">
                <h3>Club</h3>
                <div class="price">$29<span>/mo</span></div>
                <p class="desc">5 Pro Seats for Judges</p>
                <button class="btn-club" @click="handleUpgrade('club')">Go Club</button>
              </div>
            </div>
          </div>

          <div v-else>
            <p v-if="userStore.tier === 'solo'">
              You are on the <strong>Solo</strong> plan (Barn Hunt). <br>
              <a href="#" @click.prevent="handleUpgrade('pro')">Upgrade to Pro ($10/mo)</a> for all sports.
            </p>
            <p v-else>
              You are a <strong>{{ userStore.tier.toUpperCase() }}</strong> member.
            </p>
            <button class="btn-outline" @click="handleManageBilling">Manage Billing</button>
          </div>

        </div>
      </section>
      <section v-if="userStore.tier === 'club'" class="card">
        <h2>Club Branding</h2>
        <p class="hint">Customize your printouts with your Club Name and Logo.</p>

        <div class="form-row">
          <label>Official Club Name:</label>
          <div class="input-group">
            <input v-model="localClubName" placeholder="e.g. Ohio Dog Club" />
            <button @click="saveClubName" class="btn-primary small">Save</button>
          </div>
        </div>
        <div class="logo-upload-area">
          <div class="logo-preview">
            <img v-if="userStore.clubLogoUrl" :src="userStore.clubLogoUrl" alt="Club Logo" />
            <div v-else class="placeholder">No Logo</div>
          </div>

          <div class="upload-controls">
            <input type="file" accept="image/png, image/jpeg" @change="handleLogoUpload" />
            <small>Recommended: Transparent PNG, 300px wide.</small>
          </div>
        </div>
      </section>
      <section v-if="userStore.tier === 'club'" class="card">
        <div class="card-header">
          <h2>Club Roster</h2>
          <span class="badge" :class="userStore.sponsoredEmails.length >= userStore.seatLimit ? 'solo' : 'club'">
            {{ userStore.sponsoredEmails.length }} / {{ userStore.seatLimit }} Seats Used
          </span>
        </div>

        <p class="hint">
          Add email addresses of judges you want to sponsor. They will get <strong>Pro</strong> access instantly when
          they log in.
        </p>

        <div class="roster-add-row">
          <input v-model="newJudgeEmail" placeholder="judge@example.com" @keyup.enter="handleAddJudge"
            :disabled="userStore.sponsoredEmails.length >= userStore.seatLimit" />
          <button @click="handleAddJudge" class="btn-primary"
            :disabled="userStore.sponsoredEmails.length >= userStore.seatLimit"
            :style="userStore.sponsoredEmails.length >= userStore.seatLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}">
            {{ userStore.sponsoredEmails.length >= userStore.seatLimit ? 'Full' : 'Add Judge' }}
          </button>
        </div>

        <p v-if="userStore.sponsoredEmails.length >= userStore.seatLimit"
          style="font-size: 0.8rem; color: #d32f2f; margin-top: -10px; margin-bottom: 15px;">
          Need more seats? <a href="mailto:support@k9coursebuilder.com?subject=Add%20Seats"
            style="color: #d32f2f; font-weight: bold;">Contact us</a> to expand your club roster.
        </p>

        <ul class="roster-list">
          <li v-for="email in userStore.sponsoredEmails" :key="email">
            <span>👤 {{ email }}</span>
            <button @click="handleRemoveJudge(email)" class="btn-xs delete">Remove</button>
          </li>
        </ul>

        <div v-if="userStore.sponsoredEmails.length === 0" class="empty-roster">
          No judges added yet. You have {{ userStore.seatLimit }} seats available.
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
.settings-page {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 50px;
}

/* NAV */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 30px;
  background: white;
}

.logo {
  font-weight: 800;
  font-size: 1.2rem;
  color: #2c3e50;
  cursor: pointer;
}

.btn-text {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-weight: bold;
}

.btn-text:hover {
  text-decoration: underline;
  color: #333;
}

/* CONTAINER & CARDS */
.container {
  padding: 0 20px;
}

.card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 20px;
}

.card h2 {
  margin-top: 0;
  font-size: 1.2rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.hint {
  color: #666;
  font-size: 0.9em;
  margin-bottom: 15px;
}

/* HIGHLIGHT CARD (Subscription) */
.highlight-card {
  border-color: #4CAF50;
  border-width: 2px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.card-header h2 {
  border: none;
  margin: 0;
  padding: 0;
}

.badge {
  background: #eee;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.8em;
}

.badge.pro,
.badge.solo {
  background: #ffd700;
  color: #000;
}

.badge.club {
  background: #9c27b0;
  color: white;
}

/* PRICING BUTTONS */
.pricing-buttons {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

/* FORMS */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  color: #444;
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-row input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.input-row button {
  padding: 8px 20px;
  background: #2c3e50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.disabled-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #eee;
  background: #f9f9f9;
  color: #888;
  border-radius: 4px;
}

/* BUTTONS */
.btn-primary {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary:hover {
  background-color: #43a047;
}

.btn-club {
  background-color: #9c27b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-club:hover {
  background-color: #7b1fa2;
}

.btn-outline {
  background: white;
  border: 2px solid #ccc;
  color: #333;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-outline:hover {
  border-color: #333;
}

/* NEW PRICING GRID */
.pricing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
  margin-top: 20px;
}

.plan-col {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  position: relative;
}

.plan-col h3 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

.plan-col .price {
  font-size: 1.4rem;
  font-weight: 800;
  color: #2c3e50;
  margin-bottom: 5px;
}

.plan-col .price span {
  font-size: 0.8rem;
  font-weight: normal;
  color: #666;
}

.plan-col .desc {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 15px;
  min-height: 40px;
}

/* Min-height aligns buttons */
.plan-col button {
  width: 100%;
}

/* HIGHLIGHT PRO */
.best-value {
  border: 2px solid #4CAF50;
  background: #f1f8e9;
}

.badge-pop {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #4CAF50;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
}

@media (max-width: 600px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }
}

.roster-add-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.roster-add-row input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.roster-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.roster-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 5px;
}

.roster-list li:last-child {
  border-bottom: none;
}

.empty-roster {
  text-align: center;
  color: #999;
  padding: 20px;
  font-style: italic;
  border: 2px dashed #eee;
  border-radius: 8px;
}

.sponsor-msg {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  border: 1px solid #c8e6c9;
}

.btn-xs.delete {
  background: white;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-xs.delete:hover {
  background: #ffebee;
}

.logo-upload-area {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-top: 15px;
}

.logo-preview {
  width: 100px;
  height: 100px;
  border: 1px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-preview .placeholder {
  color: #999;
  font-size: 0.8rem;
}

.upload-controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row {
  margin-bottom: 20px;
}

.form-row label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.input-group {
  display: flex;
  gap: 10px;
}

.input-group input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn-primary.small {
  padding: 0 20px;
}
</style>
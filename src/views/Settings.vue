<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const newName = ref('')

onMounted(() => {
  if (userStore.user) {
    newName.value = userStore.judgeName
  } else {
    router.push('/') // Kick out if not logged in
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
          <p v-if="userStore.tier === 'free'">
            You are currently on the <strong>Free</strong> plan. Upgrade to save maps to the cloud.
          </p>
          <p v-else>
            You are a <strong>{{ userStore.tier === 'solo' ? 'Solo Judge' : 'Club' }}</strong> member. Thank you for your support!
          </p>
          
          <button class="btn-primary" disabled title="Coming Soon with Stripe">Manage Billing (Coming Soon)</button>
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

/* FORMS */
.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 5px; color: #444; }
.input-row { display: flex; gap: 10px; }
.input-row input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
.input-row button { padding: 8px 20px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; }
.disabled-input { width: 100%; padding: 8px; border: 1px solid #eee; background: #f9f9f9; color: #888; border-radius: 4px; }

/* BUTTONS */
.btn-primary { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:disabled { background-color: #ccc; cursor: not-allowed; }
.btn-outline { background: white; border: 2px solid #ccc; color: #333; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-outline:hover { border-color: #333; }
</style>
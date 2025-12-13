<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
const email = ref('')
const password = ref('')
const registerSport = ref('barnhunt')
const isRegistering = ref(false)

// Optional: emit success if the parent needs to react (like closing a modal)
const emit = defineEmits(['success'])

async function handleSubmit() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  
  let success = false
  if (isRegistering.value) {
    success = await userStore.register(email.value, password.value, registerSport.value)
  } else {
    success = await userStore.login(email.value, password.value)
  }

  if (success) emit('success')
}
</script>

<template>
  <div class="auth-card">
    <h2>{{ isRegistering ? 'Create Account' : 'Welcome Back' }}</h2>
    <p>{{ isRegistering ? 'Start building your maps today' : 'Login to access your maps' }}</p>
    
    <div class="form-group">
      <input v-model="email" type="email" placeholder="Email Address" />
      <input v-model="password" type="password" placeholder="Password" />
    </div>

    <div v-if="isRegistering">
      <div class="sport-select-label">Choose your Primary Sport:</div>
      <div class="sport-selector">
        <label :class="{ active: registerSport === 'barnhunt' }">
          <input type="radio" v-model="registerSport" value="barnhunt">
          📦 Barn Hunt
        </label>
        <label :class="{ active: registerSport === 'agility' }">
          <input type="radio" v-model="registerSport" value="agility">
          🐕 Agility
        </label>
      </div>
    </div>

    <div class="auth-actions">
      <button v-if="!isRegistering" @click="handleSubmit" class="btn-primary">Login</button>
      <button v-else @click="handleSubmit" class="btn-secondary">Register New Account</button>
    </div>

    <div class="auth-toggle">
      <span v-if="!isRegistering">
        New here? <a href="#" @click.prevent="isRegistering = true">Create an Account</a>
      </span>
      <span v-else>
        Already have an account? <a href="#" @click.prevent="isRegistering = false">Back to Login</a>
      </span>
    </div>

    <div v-if="userStore.authError" class="error">{{ userStore.authError }}</div>
  </div>
</template>

<style scoped>
.auth-card { 
  background: white; 
  padding: 40px; 
  border-radius: 8px; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
  width: 100%; 
  max-width: 400px; 
  text-align: center; 
}

.form-group { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
.form-group input { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }

.auth-actions { display: flex; flex-direction: column; gap: 10px; }
.btn-primary { background: #2c3e50; color: white; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-secondary { background: #4CAF50; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }

.error { color: red; margin-top: 10px; font-size: 0.9em; }

.auth-toggle { margin-top: 15px; font-size: 0.9em; }
.auth-toggle a { color: #2196f3; cursor: pointer; text-decoration: none; }
.auth-toggle a:hover { text-decoration: underline; }

/* SPORT SELECTOR STYLES */
.sport-select-label { font-size: 0.85em; color: #666; margin-top: 15px; margin-bottom: 5px; text-align: left; }
.sport-selector { display: flex; gap: 10px; margin-bottom: 20px; }
.sport-selector label { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-size: 0.9em; cursor: pointer; background: #fafafa; transition: all 0.2s; }
.sport-selector label:hover { background: #f0f0f0; }
.sport-selector label.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; box-shadow: 0 2px 5px rgba(33, 150, 243, 0.2); }
.sport-selector input { display: none; }
</style>
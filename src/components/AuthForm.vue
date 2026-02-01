<script setup>
import { ref } from 'vue'
import { useUserStore } from 'stores/userStore'

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
    <h3>{{ isRegistering ? 'Register' : 'Log In' }}</h3>
    
    <form @submit.prevent="handleSubmit" class="form-group">
      <input 
        v-model="email" 
        type="email" 
        placeholder="Email" 
        required
        autocomplete="username"
      />
      <input 
        v-model="password" 
        type="password" 
        placeholder="Password" 
        required
        autocomplete="current-password"
      />

      <div class="auth-actions">
        <button type="submit" class="btn-primary" :disabled="userStore.loading">
          {{ isRegistering ? 'Sign Up' : 'Log In' }}
        </button>
      </div>
    </form>

    <div class="auth-toggle">
      <p>
        {{ isRegistering ? 'Already have an account?' : 'Need an account?' }}
        <a @click="isRegistering = !isRegistering">
          {{ isRegistering ? 'Log In' : 'Sign Up' }}
        </a>
      </p>
    </div>

    <p v-if="userStore.error" class="error">{{ userStore.error }}</p>
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
  margin: 0 auto;
}

.form-group { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
.form-group input { padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }

.auth-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.btn-primary { background: #2c3e50; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 1rem; }
.btn-primary:hover { background: #34495e; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.error { color: #d32f2f; margin-top: 15px; font-size: 0.9em; font-weight: 500; }

.auth-toggle { margin-top: 15px; font-size: 0.9em; color: #666; }
.auth-toggle a { color: #2196f3; cursor: pointer; font-weight: bold; }
.auth-toggle a:hover { text-decoration: underline; }

/* SPORT SELECTOR STYLES */
.sport-select-label { font-size: 0.85em; color: #666; margin-top: 10px; margin-bottom: 8px; text-align: left; }
.sport-selector { display: flex; gap: 10px; margin-bottom: 10px; }
.sport-selector label { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-size: 0.9em; cursor: pointer; background: #fafafa; transition: all 0.2s; }
.sport-selector label:hover { background: #f0f0f0; }
.sport-selector label.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; }
.sport-selector input { display: none; }
</style>
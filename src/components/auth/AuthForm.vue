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
  <div class="auth-form">
    <h3>{{ isRegistering ? 'Register' : 'Log In' }}</h3>
    
    <form @submit.prevent="handleSubmit">
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
      
      <button type="submit" :disabled="userStore.loading">
        {{ isRegistering ? 'Sign Up' : 'Log In' }}
      </button>
    </form>

    <p @click="isRegister = !isRegister" class="toggle-link">
      {{ isRegistering ? 'Already have an account? Log In' : 'Need an account? Sign Up' }}
    </p>

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
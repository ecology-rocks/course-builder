<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore'

const emit = defineEmits(['close'])
const userStore = useUserStore()

const loading = ref(false)
const message = ref('')

// Pre-fill user info if logged in
const form = ref({
  name: userStore.judgeName || '',
  email: userStore.user?.email || '',
  details: ''
})

const encode = (data) => {
  return Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&')
}

async function handleSubmit() {
  if (!form.value.details) return alert("Please describe the bug.")

  loading.value = true

  try {
    await fetch('/', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({
        'form-name': 'bug-report', // Must match the name in index.html
        ...form.value
      })
    })

    alert("Bug report sent! Thanks for hunting.")
    emit('close')
  } catch (error) {
    console.error(error)
    alert("Failed to send report. Please email us instead.")
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <h2>🐛 Bug Hunter</h2>
      <p>Found a gremlin? Let us know and earn free Pro time!</p>
      
      <form @submit.prevent="handleSubmit" class="bug-form">
        <input type="hidden" name="form-name" value="bug-report" />
        
        <label>Your Name</label>
        <input v-model="form.name" type="text" name="name" required />

        <label>Email (for your reward)</label>
        <input v-model="form.email" type="email" name="email" required />

        <label>What happened?</label>
        <textarea 
          v-model="form.details" 
          name="message" 
          rows="4" 
          placeholder="I clicked the bale and it exploded..." 
          required
        ></textarea>

        <div class="actions">
          <button type="button" @click="$emit('close')" class="btn-text">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Report' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999; }
.modal { background: white; padding: 30px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
h2 { margin-top: 0; color: #2c3e50; }
.bug-form { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
input, textarea { padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.btn-primary { background: #d32f2f; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:disabled { background: #ef9a9a; cursor: not-allowed; }
.btn-text { background: none; border: none; cursor: pointer; color: #666; }
</style>
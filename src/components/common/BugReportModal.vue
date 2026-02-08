<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'

const emit = defineEmits(['close'])
const userStore = useUserStore()

const loading = ref(false)

// Pre-fill user info if logged in
const form = ref({
  name: userStore.judgeName || '',
  email: userStore.user?.email || '',
  type: 'bug', // Default selection
  message: ''
})

const placeholderText = computed(() => {
  return form.value.type === 'bug' 
    ? "I clicked the bale and it exploded..." 
    : "It would be great if we could..."
})

const encode = (data) => {
  return Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&')
}

async function handleSubmit() {
  if (!form.value.message) return alert("Please provide some details.")

  loading.value = true

  try {
    await fetch('/', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({
        'form-name': 'bug-report', 
        ...form.value
      })
    })

    alert(form.value.type === 'bug' ? "Bug report sent! Thanks for hunting." : "Feature request received! Thanks for the idea.")
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
      <h2>📬 Feedback & Support</h2>
      <p>Found a gremlin? Have a brilliant idea? Let us know.</p>
      
      <form @submit.prevent="handleSubmit" class="bug-form">
        <input type="hidden" name="form-name" value="bug-report" />
        
        <div class="type-selector">
          <label class="radio-label" :class="{ active: form.type === 'bug' }">
            <input type="radio" v-model="form.type" name="type" value="bug">
            🐛 Bug Report
          </label>
          <label class="radio-label" :class="{ active: form.type === 'feature' }">
            <input type="radio" v-model="form.type" name="type" value="feature">
            ✨ Feature Request
          </label>
        </div>

        <label>Your Name</label>
        <input v-model="form.name" type="text" name="name" required />

        <label>Email (for updates)</label>
        <input v-model="form.email" type="email" name="email" required />

        <label>{{ form.type === 'bug' ? 'What happened?' : 'Describe your idea' }}</label>
        <textarea 
          v-model="form.message" 
          name="message" 
          rows="4" 
          :placeholder="placeholderText" 
          required
        ></textarea>

        <div class="actions">
          <button type="button" @click="$emit('close')" class="btn-text">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Feedback' }}
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

/* Radio Button Styling */
.type-selector { display: flex; gap: 10px; margin-bottom: 5px; }
.radio-label {
  flex: 1; border: 1px solid #ccc; padding: 10px; border-radius: 4px;
  text-align: center; cursor: pointer; font-weight: bold; color: #666;
  transition: all 0.2s;
}
.radio-label input { display: none; }
.radio-label:hover { background: #f9f9f9; }
.radio-label.active {
  background: #e3f2fd; border-color: #2196f3; color: #1565c0;
}

input[type="text"], input[type="email"], textarea { padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.btn-primary { background: #2c3e50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:disabled { background: #90a4ae; cursor: not-allowed; }
.btn-text { background: none; border: none; cursor: pointer; color: #666; }
</style>
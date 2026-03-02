<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'

const emit = defineEmits(['close', 'confirm'])
const mapStore = useMapStore()
const userStore = useUserStore()

const isAdmin = userStore.user?.email === 'reallyjustsam@gmail.com'

// Local State
const name = ref(mapStore.mapName || 'Untitled Item')
const selectedCategory = ref('tunnel') 
const isPublic = ref(isAdmin) // Default to public if admin, false otherwise
const isSaving = ref(false)
const error = ref(null)

const categories = [
  { id: 'tunnel', label: 'Tunnel' },
  { id: 'ring', label: 'Full Ring' },
  { id: 'sequence', label: 'Sequence / Pattern' },
  { id: 'setup', label: 'Course Setup' }
]

function handleSave() {
  if (!name.value.trim()) {
    error.value = "Please enter a name."
    return
  }
  
  isSaving.value = true
  emit('confirm', { 
    name: name.value, 
    category: selectedCategory.value,
    isPublic: isPublic.value
  })
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>Save to Library</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <div class="modal-body">
        <div v-if="error" class="error-banner">{{ error }}</div>

        <div class="form-group">
          <label>Item Name</label>
          <input 
            v-model="name" 
            type="text" 
            placeholder="e.g. Master Tunnel #1" 
            @keyup.enter="handleSave"
          />
        </div>

        <div class="form-group">
          <label>Category</label>
          <select v-model="selectedCategory">
            <option v-for="c in categories" :key="c.id" :value="c.id">
              {{ c.label }}
            </option>
          </select>
          <small class="hint">Helps you filter in the Library view.</small>
        </div>
      </div>

      <div v-if="isAdmin" class="form-group checkbox-group">
          <label>
            <input type="checkbox" v-model="isPublic" />
            Save as Public Library Item
          </label>
        </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" @click="handleSave" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : '💾 Save Item' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkbox-group { display: flex; align-items: center; }

.modal-overlay { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0,0,0,0.5); z-index: 3000;
  display: flex; align-items: center; justify-content: center;
}
.modal { 
  background: white; width: 400px; max-width: 90%; 
  border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; overflow: hidden;
}
.modal-header {
  padding: 15px 20px; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
  background: #f9f9f9;
}
.modal-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #888; }
.close-btn:hover { color: #333; }

.modal-body { padding: 20px; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 0.9rem; color: #555; }
.form-group input, .form-group select { 
  width: 100%; padding: 10px; border: 1px solid #ddd; 
  border-radius: 4px; font-size: 1rem;
}
.form-group input:focus, .form-group select:focus { border-color: #2196f3; outline: none; }
.hint { display: block; margin-top: 5px; color: #999; font-size: 0.8rem; }
.error-banner { 
  background: #ffebee; color: #d32f2f; padding: 10px; 
  border-radius: 4px; margin-bottom: 15px; font-size: 0.9rem; 
}

.modal-footer {
  padding: 15px 20px; border-top: 1px solid #eee;
  display: flex; justify-content: flex-end; gap: 10px;
  background: #f9f9f9;
}
.btn-cancel {
  background: white; border: 1px solid #ddd; padding: 8px 16px;
  border-radius: 4px; cursor: pointer; font-weight: bold; color: #666;
}
.btn-save {
  background: #2196f3; border: none; padding: 8px 16px;
  border-radius: 4px; cursor: pointer; font-weight: bold; color: white;
}
.btn-save:disabled { background: #90caf9; cursor: not-allowed; }
.btn-save:hover:not(:disabled) { background: #1976d2; }
</style>
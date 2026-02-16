<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ editMode ? '✏️ Edit Folder' : '📂 Create New Folder' }}</h3>
        <button class="close-btn" @click="$emit('cancel')">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Folder Name</label>
          <input 
            v-model="folderName" 
            ref="nameInput"
            @keyup.enter="handleSubmit"
            class="input-field"
            :placeholder="editMode ? 'Enter new name' : 'e.g. Novice Courses'"
          />
        </div>

        <div class="form-group">
          <label>Parent Folder (Location)</label>
          <select v-model="selectedParent" class="input-field select-field">
            <option :value="null">None (Root Level)</option>
            <option 
              v-for="folder in validParentFolders" 
              :key="folder.id" 
              :value="folder.id"
            >
              📁 {{ folder.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('cancel')">Cancel</button>
        <button class="btn-primary" @click="handleSubmit" :disabled="!folderName.trim()">
          {{ editMode ? 'Save Changes' : 'Create Folder' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  existingFolders: { type: Array, default: () => [] },
  editMode: { type: Boolean, default: false },
  initialName: { type: String, default: '' },
  folderId: { type: String, default: null },
  // [NEW] Accept the current parent ID
  initialParentId: { type: String, default: null } 
})

const emit = defineEmits(['cancel', 'create', 'rename'])

const folderName = ref(props.initialName || '')
// [UPDATED] Initialize with the prop
const selectedParent = ref(props.initialParentId || null)
const nameInput = ref(null)

// [UPDATED] Filter out the folder itself to prevent circular logic
const validParentFolders = computed(() => {
  return props.existingFolders.filter(f => {
    // 1. Remove system folders
    if (f.isSystem) return false
    // 2. If editing, don't allow selecting SELF as parent
    if (props.editMode && f.id === props.folderId) return false
    
    return true
  })
})

onMounted(() => {
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus()
      if (props.editMode) nameInput.value.select()
    }
  })
})

function handleSubmit() {
  if (!folderName.value.trim()) return
  
  if (props.editMode) {
    emit('rename', {
      id: props.folderId,
      name: folderName.value.trim(),
      parentId: selectedParent.value // [NEW] Send back the chosen parent
    })
  } else {
    emit('create', {
      name: folderName.value.trim(),
      parentId: selectedParent.value
    })
  }
}
</script>

<style scoped>
/* (Existing Styles Unchanged) */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(2px); }
.modal-content { background: white; width: 400px; max-width: 90vw; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
.modal-header { padding: 16px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.9rem; color: #555; }
.input-field { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
.input-field:focus { outline: none; border-color: #2196f3; box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1); }
.select-field { background-color: white; cursor: pointer; }
.modal-footer { padding: 16px 20px; background: #f8f9fa; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; }
.btn-secondary { padding: 8px 16px; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-weight: 600; color: #555; }
.btn-primary { padding: 8px 16px; background: #2196f3; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; color: white; }
.btn-primary:disabled { background: #90caf9; cursor: not-allowed; }
</style>
<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      
      <div v-if="step === 1 && !isNewMap">
        <div class="modal-header">
          <h3>
            <span v-if="allowDiscard">⚠️ Unsaved Changes</span>
            <span v-else>💾 Save Options</span>
          </h3>
          <button class="close-btn" @click="$emit('cancel')">×</button>
        </div>

        <div class="modal-body">
          <p v-if="allowDiscard" class="warning-text">You are leaving the editor. Save your changes?</p>
          <p v-else>You are editing an existing map.</p>
          
          <p class="highlight-text">"{{ mapName }}"</p>
        </div>

        <div class="action-grid">
          <button class="btn-overwrite" @click="$emit('overwrite')">
            <div class="icon">🔄</div>
            <div class="text">
              <strong>Update Existing</strong>
              <span>Overwrites the current file</span>
            </div>
          </button>

          <button class="btn-copy" @click="goToRename">
            <div class="icon">✨</div>
            <div class="text">
              <strong>Save as New</strong>
              <span>Creates a separate copy</span>
            </div>
          </button>
        </div>
      </div>

      <div v-else>
         <div class="modal-header">
          <h3 v-if="allowDiscard && isNewMap">⚠️ Save Before Exiting?</h3>
          <h3 v-else-if="isNewMap">💾 Save New Map</h3>
          <h3 v-else>✨ Name Your New Map</h3>
          <button class="close-btn" @click="$emit('cancel')">×</button>
        </div>

        <div class="modal-body">
          <p v-if="allowDiscard && isNewMap" class="warning-text">You are creating a new map. Name it to save, or discard to lose it.</p>
          <p v-else-if="isNewMap" class="subtext">Give your map a name to save it:</p>
          <p v-else class="subtext">Give your new copy a unique name:</p>
          
          <input 
            v-model="newName" 
            ref="nameInput"
            class="name-input" 
            @keyup.enter="confirmSave"
            placeholder="Enter map name..."
          />
        </div>

        <div class="footer-actions">
          <button v-if="!isNewMap" class="btn-secondary" @click="step = 1">Back</button>
          <button class="btn-primary" @click="confirmSave" :disabled="!newName.trim()">
            {{ isNewMap ? 'Save Map' : 'Save Copy' }}
          </button>
        </div>
      </div>

      <div class="backup-section">
        <div class="divider"><span>or backup locally</span></div>
        <button class="btn-export" @click="handleExport">
          ⬇️ Export JSON File
        </button>
      </div>

      <div v-if="allowDiscard" class="discard-section">
        <button class="btn-discard" @click="$emit('discard')">
          🗑️ Discard Changes & Exit
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'

const props = defineProps({
  mapName: { type: String, default: 'Untitled Map' },
  isNewMap: { type: Boolean, default: false },
  allowDiscard: { type: Boolean, default: false }
})

// [UPDATED] Add 'export-json'
const emit = defineEmits(['cancel', 'overwrite', 'save-as-new', 'discard', 'export-json'])

const step = ref(1)
const newName = ref('')
const nameInput = ref(null)

onMounted(() => {
  if (props.isNewMap) {
    step.value = 2
    newName.value = props.mapName === 'Untitled Map' ? '' : props.mapName
    nextTick(() => nameInput.value?.focus())
  }
})

function goToRename() {
  step.value = 2
  newName.value = `${props.mapName} (Copy)`
  nextTick(() => nameInput.value?.focus())
}

function confirmSave() {
  if (!newName.value.trim()) return
  emit('save-as-new', newName.value)
}

// [NEW] Handle Export Logic
function handleExport() {
  // If user typed a name in Step 2, pass it so the file is named correctly
  if (step.value === 2 && newName.value.trim()) {
    emit('export-json', newName.value)
  } else {
    emit('export-json')
  }
}
</script>

<style scoped>
/* (Existing Styles...) */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 3000; backdrop-filter: blur(2px); }
.modal-content { background: white; padding: 24px; border-radius: 12px; width: 500px; max-width: 90vw; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #333; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; }
.modal-body { text-align: center; margin-bottom: 24px; }
.highlight-text { font-size: 1.2rem; font-weight: bold; color: #2196f3; margin: 10px 0; }
.subtext { color: #666; font-size: 0.95rem; }
.warning-text { color: #d32f2f; font-weight: bold; margin-bottom: 10px; }
.action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.action-grid button { display: flex; align-items: center; padding: 16px; border: 2px solid transparent; border-radius: 8px; cursor: pointer; text-align: left; transition: all 0.2s; background: #f9f9f9; }
.action-grid button .icon { font-size: 1.8rem; margin-right: 12px; }
.action-grid button .text { display: flex; flex-direction: column; }
.action-grid button .text strong { font-size: 1rem; margin-bottom: 4px; color: #333; }
.action-grid button .text span { font-size: 0.8rem; color: #777; }
.btn-overwrite:hover { border-color: #ff9800; background: #fff3e0; }
.btn-copy:hover { border-color: #4caf50; background: #e8f5e9; }
.name-input { width: 100%; padding: 12px; font-size: 1.1rem; border: 2px solid #ddd; border-radius: 6px; box-sizing: border-box; text-align: center; }
.name-input:focus { border-color: #2196f3; outline: none; }
.footer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-secondary { background: #eee; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; color: #555; }
.btn-primary { background: #2196f3; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-primary:disabled { background: #90caf9; cursor: not-allowed; }

/* [NEW] Backup & Discard Styles */
.backup-section, .discard-section { margin-top: 15px; text-align: center; }
.divider { display: flex; align-items: center; color: #999; font-size: 0.8rem; margin: 15px 0 10px 0; }
.divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #eee; }
.divider span { padding: 0 10px; }

.btn-export {
  background: #f1f8e9; border: 2px solid #81c784; color: #2e7d32;
  padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%;
}
.btn-export:hover { background: #dcedc8; }

.btn-discard {
  background: none; border: 2px solid #ef5350; color: #ef5350;
  padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px;
}
.btn-discard:hover { background: #ffebee; }
</style>
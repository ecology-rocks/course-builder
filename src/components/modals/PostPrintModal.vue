<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      
      <div v-if="step === 1">
        <div class="modal-header">
          <h3>🖨️ Printing Complete!</h3>
          <button class="close-btn" @click="$emit('cancel')">×</button>
        </div>

        <div class="modal-body">
          <div class="success-icon">🎉</div>
          <p class="title-text">What would you like to do next?</p>
          <p class="subtext">
            Most users start their next map now using this one as a base.
          </p>
        </div>

        <div class="action-grid">
          <button class="btn-copy" @click="goToRename">
            <div class="icon">➡️</div>
            <div class="text">
              <strong>Start Next Map</strong>
              <span>Save this as a new copy & keep working. Great for nested courses.</span>
            </div>
          </button>
<button class="btn-print" @click="$emit('print-again')">
      <div class="icon">🖨️</div>
      <div class="text">
        <strong>Print Again</strong>
        <span>Change settings or print another copy. Great for printing hides or course building maps.</span>
      </div>
    </button>
          <button class="btn-stay" @click="$emit('cancel')">
            <div class="icon">✏️</div>
            <div class="text">
              <strong>Keep Editing</strong>
              <span>Stay on this file ("{{ mapName }}")</span>
            </div>
          </button>
        </div>
        
        <div class="footer-link">
          <button class="btn-text" @click="$emit('reset')">or create a blank map</button>
        </div>
      </div>

      <div v-else>
        <div class="modal-header">
          <h3>🚀 Name Your Next Map</h3>
          <button class="close-btn" @click="$emit('cancel')">×</button>
        </div>

        <div class="modal-body">
          <p class="subtext">Give your new map a name (e.g. "Novice T2"):</p>
          <input 
            v-model="newName" 
            ref="nameInput"
            class="name-input" 
            @keyup.enter="confirmNextMap"
            placeholder="Enter map name..."
          />
        </div>

        <div class="footer-actions">
          <button class="btn-secondary" @click="step = 1">Back</button>
          <button class="btn-primary" @click="confirmNextMap" :disabled="!newName.trim()">
            Create & Save
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  mapName: {
    type: String,
    default: 'Untitled Map'
  }
})

const emit = defineEmits(['cancel', 'save-as-new', 'reset', 'print-again'])

const step = ref(1)
const newName = ref('')
const nameInput = ref(null)

function goToRename() {
  step.value = 2
  // Suggest a name variation if possible, or just append (Next)
  newName.value = `${props.mapName} (Next)`
  
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus()
      nameInput.value.select()
    }
  })
}

function confirmNextMap() {
  if (!newName.value.trim()) return
  emit('save-as-new', newName.value)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  text-align: center;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 10px;
}

.title-text {
  font-size: 1.1rem;
  font-weight: bold;
  color: #2e7d32;
  margin: 0 0 5px 0;
}

.subtext {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

/* Action Grid */
.action-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-grid button {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.action-grid button .icon {
  font-size: 1.6rem;
  margin-right: 15px;
}

.action-grid button .text {
  display: flex;
  flex-direction: column;
}

.action-grid button .text strong {
  font-size: 1rem;
  color: #333;
}

.action-grid button .text span {
  font-size: 0.8rem;
  color: #777;
}

.btn-copy {
  background: #e3f2fd;
  border: 2px solid #2196f3;
}

.btn-copy:hover {
  background: #bbdefb;
}

.btn-stay {
  background: #f5f5f5;
  border: 2px solid #eee;
}

.btn-stay:hover {
  background: #eeeeee;
  border-color: #ddd;
}

/* Footer Link */
.footer-link {
  margin-top: 15px;
}

.btn-text {
  background: none;
  border: none;
  color: #ef5350;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}

.btn-text:hover {
  color: #c62828;
}

/* Step 2 Inputs */
.name-input {
  width: 80%;
  padding: 10px;
  font-size: 1.1rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  text-align: center;
  margin-bottom: 10px;
}

.name-input:focus {
  border-color: #2196f3;
  outline: none;
}

.footer-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.btn-secondary {
  background: #eee;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.btn-print {
  background: #f3e5f5;
  border: 2px solid #ab47bc;
}

.btn-print:hover {
  background: #e1bee7;
}
</style>
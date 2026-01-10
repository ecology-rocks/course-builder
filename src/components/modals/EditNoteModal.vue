<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()
const noteInput = ref('')

// Find the actual note object based on the ID in the store
const targetNote = computed(() => 
  store.notes.find(n => n.id === store.editingNoteId)
)

// Load existing text when modal opens
onMounted(() => {
  if (targetNote.value) {
    noteInput.value = targetNote.value.text
  }
})

function handleSave() {
  if (targetNote.value) {
    store.updateNote(store.editingNoteId, { text: noteInput.value })
  }
  store.closeNoteEditor()
}
</script>

<template>
  <div class="modal-backdrop" @click.self="store.closeNoteEditor()">
    <div class="modal-card">
      <h3>Edit Note</h3>
      
      <div class="field">
        <label>Note Content:</label>
        <textarea 
          v-model="noteInput" 
          placeholder="Enter note text..." 
          rows="5"
          autofocus
        ></textarea>
      </div>

      <div class="actions">
        <button @click="store.closeNoteEditor()" class="btn-cancel">Cancel</button>
        <button @click="handleSave" class="btn-save">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 5000;
}
.modal-card {
  background: white; padding: 25px; border-radius: 12px;
  width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
h3 { margin-top: 0; color: #333; }
.field { margin: 20px 0; display: flex; flex-direction: column; gap: 8px; }
textarea {
  padding: 10px; border: 1px solid #ddd; border-radius: 6px;
  font-family: inherit; resize: vertical;
}
.actions { display: flex; justify-content: flex-end; gap: 10px; }
button {
  padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;
}
.btn-cancel { background: #f5f5f5; color: #666; }
.btn-save { background: #2196f3; color: white; }
.btn-save:hover { background: #1e88e5; }
</style>
<script setup>
import { useMapStore } from '@/stores/mapStore'
import { computed, ref, onMounted, onUnmounted } from 'vue' // for menu style
import { useMenuPosition } from '@/services/menuPositionService' //for menu style

const props = defineProps({
  noteId: String,
  x: Number,
  y: Number
})

const emit = defineEmits(['close'])
const store = useMapStore()

// menu options
const menuRef = ref(null)
const menuState = computed(() => store.activeNoteMenu) // change menu here
const { style } = useMenuPosition(menuState, menuRef)
function handleInteraction(e) {
  // Handle Escape
  if (e.type === 'keydown' && e.key === 'Escape') {
    emit('close')
    return
  }
  
  // Handle Click Outside
  if (e.type === 'click') {
    if (menuRef.value && !menuRef.value.contains(e.target)) {
      emit('close')
    }
  }
}

onMounted(() => {
  // Use setTimeout to ensure we don't catch the initial click that opened the menu
  setTimeout(() => {
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
  }, 0)
})

onUnmounted(() => {
  window.removeEventListener('click', handleInteraction)
  window.removeEventListener('keydown', handleInteraction)
})

// end menu edits

function deleteNote() {
  store.removeNote(props.noteId)
  emit('close')
}

function openCustomizer() {
  store.editingCustomObject = props.noteId
  store.showCustomizationModal = true
  emit('close')
}

function rotate() {
  const note = store.notes.find(n => n.id === props.noteId)
  if (note) {
    store.updateNote(props.noteId, { rotation: (note.rotation || 0) + 45 })
  }
  emit('close')
}
</script>

<template>
  <div class="context-menu" :style="style" ref="menuRef">
    <div class="menu-header">Note Options</div>
    
    <div class="action-stack">
      <button @click="openCustomizer" class="action-btn customize">🎨 Customize & Edit</button>
      <button @click="rotate" class="action-btn rotate">🔄 Rotate 45°</button>
      <button @click="deleteNote" class="action-btn delete">🗑️ Delete Note</button>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 3000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 12px;
  width: 150px;
}
.menu-header { font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #666; }
.action-stack { display: flex; flex-direction: column; gap: 4px; }
.action-btn { 
  width: 100%; text-align: left; padding: 6px 8px; cursor: pointer; 
  font-size: 11px; border-radius: 4px; border: 1px solid #ddd; background: #f5f5f5;
}
.action-btn.customize { border-color: #2b9e57; color: #186435; background: #eefff3; }
.action-btn.rotate { border-color: #00a1ff; color: #007acc; background: #ddeaf8; }
.action-btn.delete { border-color: #ffcdd2; color: #d32f2f; background: #ffebee; }
</style>
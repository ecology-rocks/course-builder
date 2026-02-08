<script setup>
import { useMapStore } from '@/stores/mapStore'
import { onMounted, onUnmounted, ref } from 'vue'

defineProps({
  x: Number,
  y: Number
})

const emit = defineEmits(['close', 'fit-screen'])
const store = useMapStore()
const menuRef = ref(null)

// --- INTERACTION LOGIC ---
function handleInteraction(e) {
  // 1. Close on ESC Key
  if (e.type === 'keydown' && e.key === 'Escape') {
    emit('close')
    return
  }
  
  // 2. Close on Click Outside
  if (e.type === 'click') {
    // If the click target is NOT inside this menu, close it.
    if (menuRef.value && !menuRef.value.contains(e.target)) {
      emit('close')
    }
  }
}

onMounted(() => {
  // Use setTimeout to ensure we don't catch the initial right-click/mousedown event
  setTimeout(() => {
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
  }, 0)
})

onUnmounted(() => {
  window.removeEventListener('click', handleInteraction)
  window.removeEventListener('keydown', handleInteraction)
})
// -------------------------

function handlePaste() {
  store.pasteSelection()
  emit('close')
}

function handleDeselect() {
  store.clearSelection()
  emit('close')
}

function handleFit() {
  emit('fit-screen')
  emit('close')
}
</script>

<template>
  <div ref="menuRef" class="context-menu" :style="{ top: y + 'px', left: x + 'px' }">
    <button @click="handlePaste" title="Ctrl+V">
      📋 Paste
    </button>
    
    <button @click="handleDeselect" :disabled="store.selection.length === 0">
      Deselect All
    </button>
    
    <button @click="handleFit">
      Fit to Screen
    </button>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 3000;
  min-width: 140px;
}

.context-menu button {
  text-align: left;
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
}

.context-menu button:hover {
  background: #f5f5f5;
}

.context-menu button:disabled {
  color: #aaa;
  cursor: default;
  background: none;
}
</style>
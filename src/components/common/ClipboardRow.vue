<script setup>
import { useMapStore } from '@/stores/mapStore'

const props = defineProps({
  id: String // The ID of the object the menu was opened on
})

const emit = defineEmits(['close'])
const store = useMapStore()

function ensureSelection() {
  // If the target item is NOT part of the current selection, select it exclusively.
  // This allows "Right Click -> Copy" to work on an unselected item without clearing a group selection unnecessarily.
  if (props.id && !store.selection.includes(props.id)) {
    store.selectObject(props.id, false)
  }
}

function handleCopy() {
  ensureSelection()
  store.copySelection()
  emit('close')
}

function handleCut() {
  ensureSelection()
  store.cutSelection()
  emit('close')
}

function handlePaste() {
  // Paste does not require selection manipulation
  store.pasteSelection()
  emit('close')
}
</script>

<template>
  <div class="clipboard-row">
    <button @click="handleCopy" title="Copy (Ctrl+C)">📄 Copy</button>
    <button @click="handleCut" title="Cut (Ctrl+X)">✂️ Cut</button>
    <button @click="handlePaste" title="Paste (Ctrl+V)">📋 Paste</button>
  </div>
</template>

<style scoped>
.clipboard-row {
  display: flex;
  gap: 4px;
  padding: 2px 0;
}

.clipboard-row button {
  flex: 1;
  text-align: center;
  padding: 6px 2px;
  cursor: pointer;
  font-size: 11px;
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 3px;
  color: #444;
  transition: background 0.1s;
}

.clipboard-row button:hover {
  background: #e0e0e0;
  border-color: #ccc;
}

.clipboard-row button:active {
  background: #d0d0d0;
}
</style>
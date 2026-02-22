<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()
const menuRef = ref(null)

const style = computed(() => {
  if (!store.activeWallMenu) return { display: 'none' }
  return {
    top: `${store.activeWallMenu.y}px`,
    left: `${store.activeWallMenu.x}px`,
    display: 'block'
  }
})

function close() {
  store.activeWallMenu = null
}

function handleAction(type) {
  if (store.activeWallMenu) {
    const { wallId, segmentIndex } = store.activeWallMenu
    store.setSegmentType(wallId, segmentIndex, type)
  }
  close()
}

// Close on outside click
function handleOutsideClick(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    close()
  }
}

function handleCustomize() {
  if (store.activeWallMenu) {
    store.editingCustomObject = store.activeWallMenu.wallId
    store.showCustomizationModal = true
  }
  close()
}

// Attach listener to window to catch clicks outside the menu
onMounted(() => setTimeout(() => window.addEventListener('click', handleOutsideClick), 0))
onUnmounted(() => window.removeEventListener('click', handleOutsideClick))
</script>

<template>
  <div ref="menuRef" class="context-menu" :style="style">
    <button @click="handleAction('solid')">🧱 Set Wall (Thick)</button>
    <button @click="handleAction('fence')">🚧 Set Fence (Thin)</button>
    <div class="menu-divider"></div>
    <button @click="handleCustomize">🎨 Customize Style</button>
    <div class="menu-divider"></div>
    <button @click="store.removeWall(store.activeWallMenu.wallId); close()" class="delete-btn">🗑️ Delete Ring</button>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
  border-radius: 4px;
  overflow: hidden;
  min-width: 140px;
}
.context-menu button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
.context-menu button:hover { background: #f5f5f5; }
.menu-divider { height: 1px; background: #eee; margin: 2px 0; }
.delete-btn { color: #d32f2f; }
</style>
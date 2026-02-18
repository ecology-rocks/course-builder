<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useTunnelLogic } from './useTunnelLogic'

const store = useMapStore()
const { deletePath } = useTunnelLogic(store)

const menuPosition = computed(() => {
  const menu = store.activeTunnelMenu
  if (!menu) return { top: '-9999px', left: '-9999px' }
  
  return {
    top: `${menu.y}px`,
    left: `${menu.x}px`
  }
})

function handleCustomize() {
  if (!store.activeTunnelMenu) return
  
  // [FIX] Send ONLY the ID string. The modal expects a string, not an object.
  store.editingCustomObject = store.activeTunnelMenu.id
  
  store.showCustomizationModal = true
  store.closeAllMenus()
}

function handleDelete() {
  if (!store.activeTunnelMenu) return
  
  const id = store.activeTunnelMenu.id
  deletePath(id)
  
  // [FIX] Force close immediately
  store.activeTunnelMenu = null
  store.closeAllMenus()
}

// Close on outside click
function handleClickOutside(e) {
  if (!e.target.closest('.context-menu')) {
    store.activeTunnelMenu = null
    store.closeAllMenus()
  }
}

onMounted(() => window.addEventListener('click', handleClickOutside))
onUnmounted(() => window.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div 
    v-if="store.activeTunnelMenu"
    class="context-menu"
    :style="menuPosition"
    @click.stop
  >
    <div class="menu-item header">Tunnel Options</div>
    <div class="menu-item" @click.stop="handleCustomize">🎨 Customize Style</div>
    <div class="menu-item delete" @click.stop="handleDelete">🗑️ Delete Tunnel</div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
  border-radius: 4px;
  min-width: 150px;
  padding: 5px 0;
  font-family: sans-serif;
}
.menu-item {
  padding: 8px 15px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}
.menu-item:hover {
  background: #f0f0f0;
}
.menu-item.header {
  font-weight: bold;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
  cursor: default;
}
.menu-item.delete {
  color: #d32f2f;
  border-top: 1px solid #eee;
}
</style>
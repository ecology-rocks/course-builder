<script setup>
import { ref, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const emit = defineEmits(['close'])
const store = useMapStore()
const userMaps = ref([])

onMounted(async () => {
  userMaps.value = await store.loadUserMaps()
})

function close() {
  emit('close')
}

function selectMap(map) {
  if (confirm("Opening this map will replace your current workspace. Any unsaved changes will be lost. Continue?")) {
    store.loadMapFromData(map.id, map)
    close()
  }
}

// [UPDATED] Added confirmation check
function handleCopyMap(map) {
  if (confirm("Loading this copy will replace your current workspace. Any unsaved changes will be lost. Continue?")) {
    const newMap = JSON.parse(JSON.stringify(map))
    newMap.id = null
    newMap.name = `Copy of ${newMap.name}`
    
    store.loadMapFromData(null, newMap)
    close()
  }
}

async function handleDeleteMap(map) {
  if (confirm(`Delete "${map.name}"?`)) {
    await store.deleteMap(map.id)
    userMaps.value = await store.loadUserMaps() // Refresh
  }
}

async function handleRenameMap(map) {
  const newName = prompt("Enter new name:", map.name)
  if (newName && newName.trim() !== "") {
    await store.renameMap(map.id, newName.trim())
    userMaps.value = await store.loadUserMaps() // Refresh
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>Your Saved Maps</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      
      <ul class="map-list">
        <li v-for="map in userMaps" :key="map.id" class="map-item">
          <div class="map-info" @click="selectMap(map)">
            <span class="map-title">{{ map.name }}</span>
            <small>{{ new Date(map.updatedAt.seconds * 1000).toLocaleDateString() }}</small>
          </div>
          <div class="map-actions">
            <button @click.stop="handleCopyMap(map)" title="Duplicate Map">📄</button>
            <button @click.stop="handleRenameMap(map)" title="Rename">✏️</button>
            <button @click.stop="handleDeleteMap(map)" class="delete-btn" title="Delete">🗑️</button>
          </div>
        </li>
      </ul>
      
      <div v-if="userMaps.length === 0" class="empty-state">No saved maps found.</div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; padding: 20px; border-radius: 8px; min-width: 350px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.map-list { list-style: none; padding: 0; overflow-y: auto; }
.map-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
.map-item:hover { background-color: #f9f9f9; }
.map-info { flex-grow: 1; cursor: pointer; display: flex; flex-direction: column; }
.map-title { font-weight: bold; }
.map-actions { display: flex; gap: 5px; }
.map-actions button { padding: 4px 8px; cursor: pointer; }
.delete-btn:hover { background: #ffebee; border-color: red; }
.empty-state { text-align: center; color: #888; padding: 20px; }
</style>
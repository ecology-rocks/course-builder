<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const emit = defineEmits(['close'])
const store = useMapStore()

const userMaps = ref([])
const searchQuery = ref('')
const currentFolderId = ref(null)

onMounted(async () => {
  // Load both maps and folders so we can navigate
  const [maps] = await Promise.all([
    store.loadUserMaps(),
    store.loadUserFolders() 
  ])
  
  // Sort maps by newest first by default
  userMaps.value = maps.sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds)
})

// --- Navigation Logic ---

const currentFolder = computed(() => {
  return store.folders.find(f => f.id === currentFolderId.value)
})

const visibleFolders = computed(() => {
  // Hide folders if we are searching
  if (searchQuery.value) return []
  
  return store.folders
    .filter(f => {
      if (!currentFolderId.value) return !f.parentId
      return f.parentId === currentFolderId.value
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})

const visibleMaps = computed(() => {
  let maps = userMaps.value
  
  // 1. Search Mode: Show all matches, ignore folders
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    return maps.filter(m => m.name.toLowerCase().includes(q))
  }

  // 2. Browse Mode: Show only maps in current folder
  return maps.filter(m => m.folderId === currentFolderId.value)
})

function navigateDown(folderId) {
  currentFolderId.value = folderId
}

function navigateUp() {
  if (currentFolder.value) {
    currentFolderId.value = currentFolder.value.parentId || null
  } else {
    currentFolderId.value = null
  }
}

// --- Map Actions ---

function close() {
  emit('close')
}

function selectMap(map) {
  if (confirm("Opening this map will replace your current workspace. Any unsaved changes will be lost. Continue?")) {
    store.loadMapFromData(map.id, map)
    close()
  }
}

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
    userMaps.value = await store.loadUserMaps() // Refresh list
  }
}

async function handleRenameMap(map) {
  const newName = prompt("Enter new name:", map.name)
  if (newName && newName.trim() !== "") {
    await store.renameMap(map.id, newName.trim())
    userMaps.value = await store.loadUserMaps() // Refresh list
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>Load Map</h3>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="toolbar">
        <div class="nav-controls">
          <button v-if="currentFolderId" @click="navigateUp" class="btn-back">
            ⬅ Back
          </button>
          <span class="current-path">
            {{ currentFolder ? currentFolder.name : '📂 All Maps' }}
          </span>
        </div>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 Search maps..." 
          class="search-input"
        />
      </div>
      
      <ul class="file-list">
        <li 
          v-for="folder in visibleFolders" 
          :key="folder.id" 
          class="file-item folder"
          @click="navigateDown(folder.id)"
        >
          <div class="file-info">
            <span class="icon">📁</span>
            <span class="title">{{ folder.name }}</span>
          </div>
          <span class="arrow">›</span>
        </li>

        <li v-for="map in visibleMaps" :key="map.id" class="file-item map">
          <div class="file-info" @click="selectMap(map)">
            <span class="icon">📄</span>
            <div class="details">
              <span class="title">{{ map.name }}</span>
              <small>{{ new Date(map.updatedAt.seconds * 1000).toLocaleDateString() }}</small>
            </div>
          </div>
          
          <div class="actions">
            <button @click.stop="handleCopyMap(map)" title="Duplicate">❐</button>
            <button @click.stop="handleRenameMap(map)" title="Rename">✏️</button>
            <button @click.stop="handleDeleteMap(map)" class="btn-delete" title="Delete">🗑️</button>
          </div>
        </li>

        <li v-if="visibleFolders.length === 0 && visibleMaps.length === 0" class="empty-state">
          {{ searchQuery ? 'No matching maps found.' : 'This folder is empty.' }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0,0,0,0.5); 
  display: flex; align-items: center; justify-content: center; 
  z-index: 2000; 
}

.modal { 
  background: white; 
  width: 500px; 
  max-width: 90%;
  height: 80vh; 
  border-radius: 8px; 
  display: flex; 
  flex-direction: column; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.modal-header { 
  padding: 15px 20px; 
  border-bottom: 1px solid #eee; 
  display: flex; justify-content: space-between; align-items: center; 
}

.modal-header h3 { margin: 0; font-size: 1.2rem; color: #333; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; }
.close-btn:hover { color: #333; }

/* Toolbar */
.toolbar {
  padding: 10px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 10px;
  flex-direction: column;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  color: #555;
  height: 30px;
}

.btn-back {
  background: white;
  border: 1px solid #ccc;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-back:hover { background: #e3f2fd; border-color: #2196f3; color: #2196f3; }

.search-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

/* List */
.file-list { 
  list-style: none; 
  padding: 0; 
  margin: 0; 
  overflow-y: auto; 
  flex: 1; 
}

.file-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 12px 20px; 
  border-bottom: 1px solid #f0f0f0; 
  cursor: pointer;
  transition: background 0.1s;
}

.file-item:hover { background-color: #f5f9ff; }

.file-info { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  flex-grow: 1; 
  overflow: hidden;
}

.icon { font-size: 1.2rem; }

.details { display: flex; flex-direction: column; }
.details small { color: #888; font-size: 0.75rem; }
.title { font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Folder Specific */
.folder .title { font-weight: bold; color: #444; }
.folder .arrow { color: #ccc; font-weight: bold; }

/* Actions */
.actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.file-item:hover .actions { opacity: 1; }

.actions button { 
  background: white; 
  border: 1px solid #ddd; 
  border-radius: 4px;
  padding: 4px 6px; 
  cursor: pointer;
  color: #666;
}
.actions button:hover { background: #eee; color: #333; }

.actions .btn-delete:hover { 
  background: #ffebee; 
  border-color: #ffcdd2; 
  color: #d32f2f; 
}

.empty-state { padding: 40px; text-align: center; color: #999; font-style: italic; }
</style>
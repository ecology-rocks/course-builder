<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useMapStore } from '../stores/mapStore'
import { useRouter } from 'vue-router'
import AuthForm from '../components/auth/AuthForm.vue'
import DeleteMapModal from '../components/modals/DeleteMapModal.vue'

const userStore = useUserStore()
const mapStore = useMapStore()
const router = useRouter()

// Dashboard State
const isLoading = ref(false)
const isDragOver = ref(false)
const localMaps = ref([])

//Delete States
const showDeleteModal = ref(false)
const mapToDeleteId = ref(null)

const folderTree = computed(() => {
  const raw = mapStore.folders
  
  const build = (parentId, depth) => {
    return raw
      .filter(f => {
        // If looking for Root (parentId is null), accept null OR undefined
        if (!parentId) {
          return !f.parentId 
        }
        // Otherwise match exact ID
        return f.parentId === parentId
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap(f => [
        { ...f, depth },
        ...build(f.id, depth + 1)
      ])
  }
  
  return build(null, 0)
})


function handleLogout() {
  userStore.logout()
  router.push('/')
}

// [NEW] Create Folder (supports subfolders)
async function handleCreateFolder() {
  const parentId = mapStore.currentFolderId // Create inside current view?
  const name = prompt(parentId ? "New Subfolder Name:" : "New Root Folder Name:")
  if (name) await mapStore.createFolder(name, parentId)
}

// [NEW] Rename Logic
async function handleRenameFolder(folder) {
  const newName = prompt("Rename folder:", folder.name)
  if (newName && newName !== folder.name) {
    await mapStore.renameFolder(folder.id, newName)
  }
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp.seconds * 1000).toLocaleDateString()
}

function createNewMap(sportType) {
  // 1. Permission Check
  if (!userStore.canAccessSport(sportType)) {
    if (confirm("This sport requires a Pro subscription. Go to Settings?")) {
      router.push('/settings')
    }
    return
  }

  // 2. Reset & Configure
  mapStore.reset()
  mapStore.sport = 'barnhunt' 
  mapStore.ringDimensions = { width: 24, height: 24 }

  router.push('/editor')
}

async function openMap(map) {
  mapStore.loadMapFromData(map.id, map)
  router.push('/editor')
}

// --- Delete Logic ---
function requestDelete(id) {
  mapToDeleteId.value = id
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (mapToDeleteId.value) {
    await mapStore.deleteMap(mapToDeleteId.value)
    localMaps.value = await mapStore.loadUserMaps()
    showDeleteModal.value = false
    mapToDeleteId.value = null
  }
}



function copyToNewMap(map) {
  // 1. Deep clone to detach from original
  const newMap = JSON.parse(JSON.stringify(map))
  
  // 2. Reset ID so it is treated as a NEW map upon saving
  newMap.id = null
  newMap.name = `Copy of ${newMap.name}`
  
  // 3. Load into store (passing null as ID) and redirect
  mapStore.loadMapFromData(null, newMap)
  router.push('/editor')
}

async function handleDeleteFolder(id) {
  if (confirm("Are you sure you want to delete this folder?")) {
    await mapStore.deleteFolder(id)
    
    // If the deleted folder was the one currently open, switch back to 'All'
    if (mapStore.currentFolderId === id) {
      mapStore.currentFolderId = null
    }
  }
}

function onDragStart(event, type, id) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('type', type) // 'map' or 'folder'
  event.dataTransfer.setData('id', id)
}

// [UPDATED] Drop Handler
async function onDrop(event, targetFolderId) {
  const type = event.dataTransfer.getData('type')
  const id = event.dataTransfer.getData('id')

  if (!id) return

  if (type === 'map') {
    // Existing Map Logic
    await mapStore.moveMap(id, targetFolderId)
    localMaps.value = await mapStore.loadUserMaps()
  } else if (type === 'folder') {
    // [NEW] Folder Logic
    await mapStore.moveFolder(id, targetFolderId)
  }
  isDragOver.value = false
}

const filteredMaps = computed(() => {
  return localMaps.value.filter(m => m.folderId === mapStore.currentFolderId)
})

// Lifecycle & Watchers
async function loadData() {
  if (userStore.user) {
    isLoading.value = true
    await mapStore.loadUserFolders()
    localMaps.value = await mapStore.loadUserMaps()
    isLoading.value = false
  }
}

onMounted(loadData)

watch(() => userStore.user, async (newUser) => {
  if (newUser) {
    await loadData()
  } else {
    localMaps.value = []
  }
})
</script>

<template>
  <div class="dashboard">
    <Transition name="fade">
      <div v-if="mapStore.notification" class="toast-notification" :class="mapStore.notification.type">
        {{ mapStore.notification.message }}
      </div>
    </Transition>
    <nav class="navbar">
      <div class="logo">🐾 K9CourseBuilder</div>
      <div class="nav-links">
        <button v-if="userStore.user" @click="router.push('/settings')" class="btn-outline">⚙️ Settings</button>
        <button v-if="userStore.user" @click="handleLogout" class="btn-outline">Logout</button>
      </div>
    </nav>

<div v-if="!userStore.user" class="auth-container">
      <AuthForm />
    </div>

    <div v-else class="dashboard-content">
      
      <aside class="sidebar">
        <div class="sidebar-header">
          <h3>Folders</h3>
          <button @click="handleCreateFolder" class="btn-icon">+</button>
        </div>
<ul>
          <li 
            :class="{ active: mapStore.currentFolderId === null }"
            @click="mapStore.currentFolderId = null"
            @dragover.prevent
            @drop="onDrop($event, null)"
          >
            📂 All / Unfiled
          </li>

          <li 
            v-for="folder in folderTree" 
            :key="folder.id"
            :class="{ active: mapStore.currentFolderId === folder.id }"
            :style="{ paddingLeft: (10 + folder.depth * 15) + 'px' }"
            @click="mapStore.currentFolderId = folder.id"
            
            draggable="true"
            @dragstart.stop="onDragStart($event, 'folder', folder.id)"
            @dragover.prevent
            @drop.stop="onDrop($event, folder.id)"
          >
            📁 {{ folder.name }}
            
            <div class="folder-actions">
              <button @click.stop="handleRenameFolder(folder)" class="btn-xs" title="Rename">✎</button>
              <button @click.stop="handleDeleteFolder(folder.id)" class="btn-xs" title="Delete">×</button>
            </div>
          </li>
        </ul>
      </aside>

      <main class="main-area">
        
       <section class="create-section">
          <h2>Create New Map</h2>
          <div class="sport-grid">
            
            <button 
              @click="createNewMap('barnhunt')" 
              class="sport-card" 
              :class="{ disabled: !userStore.canAccessSport('barnhunt') }"
            >
              <span class="emoji">📦</span>
              <span class="label">New Barn Hunt Map</span>
              <span v-if="!userStore.canAccessSport('barnhunt')" class="lock-icon">🔒</span>
            </button>

            </div>
        </section>

        <hr />

        <section class="maps-list">
          <h2>Your Maps</h2>
          <div v-if="isLoading">Loading...</div>
          <div v-else-if="filteredMaps.length === 0" class="empty-state">
            No maps found in this folder.
          </div>
          
          <div v-else class="grid">
            <div 
              v-for="map in filteredMaps" 
              :key="map.id" 
              class="map-card"
              draggable="true"
              @dragstart="onDragStart($event, 'map', map.id)"
            >
              <div class="map-preview" @click="openMap(map)">
                <div class="preview-placeholder">
                  {{ map.sport === 'agility' ? '🐕' : (map.sport === 'scentwork' ? '👃' : '📦') }}
                </div>
              </div>
              <div class="map-info">
                <h4>{{ map.name }}</h4>
                <div class="meta">
                  <span>{{ map.level }}</span>
                  <span>{{ formatDate(map.updatedAt) }}</span>
                </div>
                <div class="actions">
                  <button @click="openMap(map)">Edit</button>
                  <button @click="copyToNewMap(map)">Copy</button>
                  <button @click="requestDelete(map.id)" class="btn-danger">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>

    <DeleteMapModal 
      v-if="showDeleteModal" 
      @close="showDeleteModal = false" 
      @confirm="confirmDelete" 
    />

  </div>
</template>

<style scoped>
/* (Styles same as previous) */
.dashboard { font-family: 'Inter', sans-serif; min-height: 100vh; background: #f4f6f8; }
.navbar { background: #fff; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; }
.logo { font-weight: 800; font-size: 1.2rem; color: #2c3e50; }
.btn-outline { background: none; border: 1px solid #ccc; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-left: 10px; }

/* AUTH LAYOUT ONLY */
.auth-container { display: flex; justify-content: center; align-items: center; height: 80vh; }
/* Note: .auth-card and internal form styles moved to AuthForm.vue */

/* DASHBOARD LAYOUT */
.dashboard-content { display: flex; height: calc(100vh - 60px); }
.sidebar { width: 250px; background: white; border-right: 1px solid #ddd; padding: 20px; overflow-y: auto; }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sidebar ul { list-style: none; padding: 0; }
.sidebar li { padding: 10px; cursor: pointer; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
.sidebar li:hover { background: #f9f9f9; }
.sidebar li.active { background: #e3f2fd; color: #1565c0; font-weight: bold; }
.btn-icon { background: none; border: 1px solid #ddd; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-xs { background: none; border: none; color: #999; cursor: pointer; font-size: 1.2em; line-height: 1; }
.btn-xs:hover { color: red; }

.main-area { flex: 1; padding: 40px; overflow-y: auto; }
.create-section { margin-bottom: 40px; }
.sport-grid { display: flex; gap: 20px; margin-top: 20px; }
.sport-card { 
  flex: 1; max-width: 200px; height: 120px; 
  background: white; border: 2px solid #eee; border-radius: 12px; 
  display: flex; flex-direction: column; align-items: center; justify-content: center; 
  cursor: pointer; transition: transform 0.2s; position: relative;
}
.sport-card:hover:not(.disabled) { transform: translateY(-3px); border-color: #4CAF50; }
.sport-card.disabled { opacity: 0.7; cursor: not-allowed; background: #f9f9f9; }
.sport-card .emoji { font-size: 2.5rem; margin-bottom: 10px; }
.sport-card .label { font-weight: bold; color: #333; }
.lock-icon { position: absolute; top: 10px; right: 10px; font-size: 1.2rem; }

.grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 20px; }
.map-card { width: 220px; background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.map-preview { height: 120px; background: #eee; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.preview-placeholder { font-size: 3rem; opacity: 0.3; }
.map-info { padding: 15px; }
.map-info h4 { margin: 0 0 5px 0; font-size: 1rem; }
.meta { font-size: 0.8rem; color: #666; display: flex; justify-content: space-between; margin-bottom: 10px; }
.actions { display: flex; gap: 10px; }
.actions button { flex: 1; padding: 5px; cursor: pointer; background: white; border: 1px solid #ccc; border-radius: 4px; font-size: 0.8rem; }
.actions .btn-danger { color: #d32f2f; border-color: #ef9a9a; }
.actions .btn-danger:hover { background: #ffebee; }
.empty-state { text-align: center; color: #999; margin-top: 40px; font-style: italic; }

.toast-notification { 
  position: fixed; 
  top: 80px; /* Below navbar */
  left: 50%; 
  transform: translateX(-50%); 
  padding: 12px 24px; 
  border-radius: 8px; 
  color: white; 
  font-weight: bold; 
  z-index: 2000; 
  pointer-events: none;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.toast-notification.success { background-color: #388e3c; }
.toast-notification.error { background-color: #d32f2f; }
.toast-notification.info { background-color: #2196f3; }

.folder-actions {
  display: flex;
  gap: 5px;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.sidebar li:hover .folder-actions {
  opacity: 1;
}
</style>
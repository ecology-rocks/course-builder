<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useUserStore } from 'stores/userStore'
import { useMapStore } from 'stores/mapStore'
import { useRouter } from 'vue-router'
import AuthForm from 'components/AuthForm.vue'
import DeleteMapModal from 'modals/DeleteMapModal.vue'
import UpgradeModal from '@/components/modals/UpgradeModal.vue'
import CreateFolderModal from '@/components/modals/CreateFolderModal.vue'

const userStore = useUserStore()
const mapStore = useMapStore()
const router = useRouter()

// Dashboard State
const isLoading = ref(false)
const isDragOver = ref(false)
const localMaps = ref([])
const showUpgradeModal = ref(false)
const showDragTip = ref(localStorage.getItem('dismissedDragTip') !== 'true')
const showFolderModal = ref(false)
const folderToEdit = ref(null)

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


function dismissDragTip() {
  showDragTip.value = false
  localStorage.setItem('dismissedDragTip', 'true')
}

function handleLogout() {
  userStore.logout()
  router.push('/')
}

// [UPDATED] Trigger for Create (Reset edit state)
function triggerCreateFolder() {
  folderToEdit.value = null 
  showFolderModal.value = true
}

// [NEW] Create Folder (supports subfolders)
async function handleCreateFolder(payload) {
  try {
    // Assuming your store has a createFolder action
    // If not, you might need to adapt this to your store's logic
    await mapStore.createFolder(payload.name, payload.parentId)
    
    mapStore.showNotification(`Folder "${payload.name}" created!`)
    showFolderModal.value = false
  } catch (error) {
    console.error(error)
    mapStore.showNotification("Failed to create folder", "error")
  }
}

// [NEW] Rename Logic
// [UPDATED] Trigger for Rename (Set edit state)
function handleRenameFolder(folder) {
  folderToEdit.value = folder
  showFolderModal.value = true
}

async function onFolderRename(payload) {
  try {
    const original = folderToEdit.value
    
    // 1. Rename if changed
    if (payload.name !== original.name) {
      await mapStore.renameFolder(payload.id, payload.name)
    }

    // 2. Move if parent changed
    // Note: We use undefined/null checks loosely to catch both null and undefined
    if (payload.parentId != original.parentId) {
      await mapStore.moveFolder(payload.id, payload.parentId)
    }

    showFolderModal.value = false
    mapStore.showNotification("Folder updated successfully")
  } catch (e) {
    console.error(e)
    mapStore.showNotification("Failed to update folder", "error")
  }
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp.seconds * 1000).toLocaleDateString()
}

function createNewMap(sportType) {
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

// Add this NEW watcher
watch(() => userStore.justRegistered, (isNew) => {
  if (isNew) {
    showUpgradeModal.value = true
    userStore.justRegistered = false // Reset immediately so it doesn't persist
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
      <div class="logo"><router-link to="/" class="logo">🐾 K9CourseBuilder</router-link></div>
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
          <button @click="triggerCreateFolder" class="btn-icon">+</button>
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
            >
              <span class="emoji">📦</span>
              <span class="label">New Barn Hunt Map</span>
            </button>

            </div>
        </section>

        <hr />

        <section class="maps-list">
          <h2>Your Unfiled Maps</h2>
          <div v-if="showDragTip" class="info-box">
        <div class="info-icon">💡</div>
        <div class="info-content">
          <strong>Organize your maps!</strong>
          <p>Did you know? You can drag and drop maps into folders to organize them. To get started, add a folder on the left (+ icon in the top right of the sidebar), then drag and drop your maps to the appropriate folder. </p>
        </div>
        <button class="close-btn" @click="dismissDragTip" title="Dismiss">×</button>
      </div>
          <div v-if="isLoading">Loading...</div>
          
          <div v-else-if="filteredMaps.length === 0">
            
            <div v-if="userStore.tier === 'free'" class="upgrade-empty-state">
              <h3>Ready to get serious? 🚀</h3>
              <p>Unlock unlimited maps, folders, and premium features.</p>
              <button @click="showUpgradeModal = true" class="btn-upgrade">
                View Pro Options
              </button>
            </div>

            <div v-else class="empty-state">
              No maps found in this folder.
            </div>

          </div>
          
          <div v-else class="grid">
            <div 
              v-for="map in filteredMaps" 
              :key="map.id" 
              class="map-card"
              draggable="true"
              @dragstart="onDragStart($event, 'map', map.id)"
            >
            <div class="drag-handle" title="Drag to move">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#ccc">
    <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
</div>
              <div class="map-preview" @click="openMap(map)">
                <div class="preview-placeholder">
                  📦
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

    <UpgradeModal 
      v-if="showUpgradeModal" 
      @close="showUpgradeModal = false" 
    />

    <CreateFolderModal
      v-if="showFolderModal"
      :existingFolders="mapStore.folders" 
      :editMode="!!folderToEdit"
      :initialName="folderToEdit?.name"
      :initialParentId="folderToEdit?.parentId" :folderId="folderToEdit?.id"
      @cancel="showFolderModal = false"
      @create="handleCreateFolder"
      @rename="onFolderRename" 
    />

  </div>
</template>

<style scoped>
/* (Styles same as previous) */

.info-box {
  background: #e3f2fd; /* Light Blue */
  border: 1px solid #90caf9;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}

.info-icon {
  font-size: 1.2rem;
}

.info-content strong {
  color: #1565c0;
  display: block;
  margin-bottom: 2px;
}

.info-content p {
  margin: 0;
  color: #555;
  font-size: 0.9rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #888;
  cursor: pointer;
  padding: 0 4px;
  margin-left: auto; /* Pushes button to the far right */
}

.close-btn:hover {
  color: #333;
}
.dashboard { font-family: 'Inter', sans-serif; min-height: 100vh; background: #f4f6f8; }
.navbar { background: #fff; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; }
.logo {
  text-decoration: none; /* Removes the underline */
  color: #2c3e50;        /* Forces your dark grey color instead of link blue */
  font-weight: 800;
  font-size: 1.2rem;
  cursor: pointer;
}

/* Optional: Slight fade on hover so they know it's clickable */
.logo:hover {
  opacity: 0.8;
}
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

.drag-handle {
  cursor: grab;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  opacity: 1;
}

/* Optional: Add a "grabbing" cursor when actively dragging */
.drag-handle:active {
  cursor: grabbing;
}

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

.upgrade-empty-state {
  background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
  border: 2px dashed #2196f3;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  margin-top: 20px;
  color: #2c3e50;
}

.upgrade-empty-state h3 {
  margin-top: 0;
  color: #1565c0;
}

.btn-upgrade {
  background: #2196f3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 15px;
  transition: background 0.2s;
}

.btn-upgrade:hover {
  background: #1976d2;
}
</style>
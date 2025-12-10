<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useMapStore } from '../stores/mapStore'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const mapStore = useMapStore()
const router = useRouter()

// Auth State
const email = ref('')
const password = ref('')
const registerSport = ref('barnhunt')
const isRegistering = ref(false)

// Dashboard State
const isLoading = ref(false)
const newFolderName = ref('')
const isDragOver = ref(false)
const localMaps = ref([])

async function handleLogin() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.login(email.value, password.value)
}

async function handleRegister() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.register(email.value, password.value, registerSport.value)
}

function handleLogout() {
  userStore.logout()
  router.push('/')
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
  mapStore.sport = sportType 
  
  if (sportType === 'agility') {
    mapStore.ringDimensions = { width: 80, height: 100 }
  } else if (sportType === 'scentwork') {
    mapStore.ringDimensions = { width: 40, height: 40 } // Default for Scent Work
  } else {
    mapStore.ringDimensions = { width: 24, height: 24 } // Default for Barn Hunt
  }

  router.push('/editor')
}

async function openMap(map) {
  mapStore.loadMapFromData(map.id, map)
  router.push('/editor')
}

async function handleDelete(id) {
  if(confirm("Are you sure you want to delete this map?")) {
    await mapStore.deleteMap(id)
    localMaps.value = await mapStore.loadUserMaps() 
  }
}

// === FOLDER LOGIC ===
async function handleCreateFolder() {
  const name = prompt("Folder Name:")
  if (name) await mapStore.createFolder(name)
}

async function handleDeleteFolder(id) {
  await mapStore.deleteFolder(id)
}

function onDragStart(event, mapId) {
  event.dataTransfer.dropEffect = 'move'
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('mapId', mapId)
}

async function onDrop(event, folderId) {
  const mapId = event.dataTransfer.getData('mapId')
  if (mapId) {
    await mapStore.moveMap(mapId, folderId)
    localMaps.value = await mapStore.loadUserMaps()
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
    <nav class="navbar">
      <div class="logo">🐾 K9CourseBuilder</div>
      <div class="nav-links">
        <button v-if="userStore.user" @click="router.push('/settings')" class="btn-outline">⚙️ Settings</button>
        <button v-if="userStore.user" @click="handleLogout" class="btn-outline">Logout</button>
      </div>
    </nav>

    <div v-if="!userStore.user" class="auth-container">
      <div class="auth-card">
        <h2>{{ isRegistering ? 'Create Account' : 'Welcome Back' }}</h2>
        <p>{{ isRegistering ? 'Start building your maps today' : 'Login to access your maps' }}</p>
        
        <div class="form-group">
          <input v-model="email" type="email" placeholder="Email Address" />
          <input v-model="password" type="password" placeholder="Password" />
        </div>

        <div v-if="isRegistering">
          <div class="sport-select-label">Choose your Primary Sport:</div>
          <div class="sport-selector">
            <label :class="{ active: registerSport === 'barnhunt' }">
              <input type="radio" v-model="registerSport" value="barnhunt">
              📦 Barn Hunt
            </label>
            <label :class="{ active: registerSport === 'agility' }">
              <input type="radio" v-model="registerSport" value="agility">
              🐕 Agility
            </label>
          </div>
        </div>

        <div class="auth-actions">
          <button v-if="!isRegistering" @click="handleLogin" class="btn-primary">Login</button>
          <button v-else @click="handleRegister" class="btn-secondary">Register New Account</button>
        </div>

        <div class="auth-toggle">
          <span v-if="!isRegistering">
            New here? <a href="#" @click.prevent="isRegistering = true">Create an Account</a>
          </span>
          <span v-else>
            Already have an account? <a href="#" @click.prevent="isRegistering = false">Back to Login</a>
          </span>
        </div>

        <div v-if="userStore.authError" class="error">{{ userStore.authError }}</div>
      </div>
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
            v-for="folder in mapStore.folders" 
            :key="folder.id"
            :class="{ active: mapStore.currentFolderId === folder.id }"
            @click="mapStore.currentFolderId = folder.id"
            @dragover.prevent
            @drop="onDrop($event, folder.id)"
          >
            📁 {{ folder.name }}
            <button @click.stop="handleDeleteFolder(folder.id)" class="btn-xs">×</button>
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
              <span class="label">Barn Hunt</span>
              <span v-if="!userStore.canAccessSport('barnhunt')" class="lock-icon">🔒</span>
            </button>

            <button 
              @click="createNewMap('agility')" 
              class="sport-card"
              :class="{ disabled: !userStore.canAccessSport('agility') }"
            >
              <span class="emoji">🐕</span>
              <span class="label">Agility</span>
              <span v-if="!userStore.canAccessSport('agility')" class="lock-icon">🔒</span>
            </button>

            <button 
              @click="createNewMap('scentwork')" 
              class="sport-card"
              :class="{ disabled: !userStore.canAccessSport('scentwork') }"
            >
              <span class="emoji">👃</span>
              <span class="label">Scent Work</span>
              <span v-if="!userStore.canAccessSport('scentwork')" class="lock-icon">🔒</span>
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
              @dragstart="onDragStart($event, map.id)"
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
                  <button @click="handleDelete(map.id)" class="btn-danger">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<style scoped>
/* (Styles same as previous) */
.dashboard { font-family: 'Inter', sans-serif; min-height: 100vh; background: #f4f6f8; }
.navbar { background: #fff; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; }
.logo { font-weight: 800; font-size: 1.2rem; color: #2c3e50; }
.btn-outline { background: none; border: 1px solid #ccc; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-left: 10px; }

/* AUTH STYLES */
.auth-container { display: flex; justify-content: center; align-items: center; height: 80vh; }
.auth-card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); width: 100%; max-width: 400px; text-align: center; }
.form-group { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
.form-group input { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
.auth-actions { display: flex; flex-direction: column; gap: 10px; }
.btn-primary { background: #2c3e50; color: white; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-secondary { background: #4CAF50; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.error { color: red; margin-top: 10px; font-size: 0.9em; }
.auth-toggle { margin-top: 15px; font-size: 0.9em; }
.auth-toggle a { color: #2196f3; cursor: pointer; text-decoration: none; }
.auth-toggle a:hover { text-decoration: underline; }

/* SPORT SELECTOR STYLES */
.sport-select-label { font-size: 0.85em; color: #666; margin-top: 15px; margin-bottom: 5px; text-align: left; }
.sport-selector { display: flex; gap: 10px; margin-bottom: 20px; }
.sport-selector label { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-size: 0.9em; cursor: pointer; background: #fafafa; transition: all 0.2s; }
.sport-selector label:hover { background: #f0f0f0; }
.sport-selector label.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; box-shadow: 0 2px 5px rgba(33, 150, 243, 0.2); }
.sport-selector input { display: none; }

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
</style>
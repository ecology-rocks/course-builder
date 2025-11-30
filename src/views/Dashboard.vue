<script setup>
import { onMounted, ref, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useMapStore } from '../stores/mapStore'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const mapStore = useMapStore()
const router = useRouter()
const userMaps = ref([])
const showMoveModal = ref(false)
const selectedMapToMove = ref(null)

// --- AUTH STATE (For Login Form) ---
const email = ref('')
const password = ref('')
const isRegistering = ref(false) // Toggle between Login/Register text

// --- COMPUTED ---
const currentFolderName = computed(() => {
  if (!mapStore.currentFolderId) return "All Maps"
  const f = mapStore.folders.find(f => f.id === mapStore.currentFolderId)
  return f ? f.name : "Unknown Folder"
})

const filteredMaps = computed(() => {
  if (!mapStore.currentFolderId) {
    return userMaps.value.filter(m => !m.folderId)
  } else {
    return userMaps.value.filter(m => m.folderId === mapStore.currentFolderId)
  }
})

// --- LIFECYCLE ---
onMounted(async () => {
  // Only load data if user is actually logged in
  if (userStore.user) {
    mapStore.currentFolderId = null
    userMaps.value = await mapStore.loadUserMaps()
    await mapStore.loadUserFolders()
  }
})

// --- AUTH ACTIONS ---
async function handleLogin() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.login(email.value, password.value)
  // After login, load their data immediately
  if (userStore.user) {
    userMaps.value = await mapStore.loadUserMaps()
    await mapStore.loadUserFolders()
  }
}

async function handleRegister() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.register(email.value, password.value)
}

async function handleForgotPassword() {
  if (!email.value) return alert("Please enter your email address first.")
  await userStore.resetPassword(email.value)
}

async function handleLogout() {
  await userStore.logout()
  router.push('/') 
}

// --- DASHBOARD ACTIONS ---
function openMoveModal(map) {
  selectedMapToMove.value = map
  showMoveModal.value = true
}

async function confirmMove(targetFolderId) {
  if (selectedMapToMove.value) {
    await mapStore.moveMap(selectedMapToMove.value.id, targetFolderId)
    userMaps.value = await mapStore.loadUserMaps()
    showMoveModal.value = false
    selectedMapToMove.value = null
  }
}

function createNewMap(sportType) {
  mapStore.reset()
  router.push('/editor')
}

function editMap(map) {
  mapStore.loadMapFromData(map.id, map)
  router.push('/editor')
}

function handleCreateFolder() {
  const name = prompt("Enter Trial/Event Name (e.g. 'May 2025 GCDOC'):")
  if (name) mapStore.createFolder(name)
}

function openFolder(folderId) {
  mapStore.currentFolderId = folderId
}

function goUpLevel() {
  mapStore.currentFolderId = null
}
</script>

<template>
  <div class="dashboard">

    <nav class="navbar">
      <div class="logo" @click="router.push('/')">🐾 K9CourseBuilder.com</div>
      
      <div v-if="userStore.user" class="user-status">
        <span class="badge" :class="userStore.tier">{{ userStore.tier.toUpperCase() }} MEMBER</span>
        <button @click="router.push('/settings')" class="btn-icon-nav" title="Settings">⚙️</button>
        <button @click="handleLogout" class="btn-nav-link">Logout</button>
      </div>
    </nav>

    <div v-if="!userStore.user" class="auth-wrapper">
      <div class="auth-card">
        <h1>{{ isRegistering ? 'Create Account' : 'Welcome Back' }}</h1>
        <p class="subtitle">{{ isRegistering ? 'Start building maps for free.' : 'Login to manage your maps.' }}</p>
        
        <div class="form-stack">
          <input v-model="email" type="email" placeholder="Email Address" @keyup.enter="isRegistering ? handleRegister() : handleLogin()" />
          <input v-model="password" type="password" placeholder="Password" @keyup.enter="isRegistering ? handleRegister() : handleLogin()" />
          
          <div v-if="userStore.authError" class="error-box">
            {{ userStore.authError }}
          </div>

          <button v-if="!isRegistering" @click="handleLogin" class="btn-primary full-width">Login</button>
          <button v-else @click="handleRegister" class="btn-primary full-width">Sign Up</button>
          
          <div class="auth-footer">
            <span v-if="!isRegistering">
              Need an account? <a @click="isRegistering = true">Register</a>
            </span>
            <span v-else>
              Have an account? <a @click="isRegistering = false">Login</a>
            </span>
            <br>
            <a v-if="!isRegistering" @click="handleForgotPassword" class="forgot-link">Forgot Password?</a>
          </div>
        </div>
      </div>
    </div>

    <main v-else class="content">

      <section class="creation-zone">
        <h2>Start a New Project</h2>
        <div class="sport-grid">
          <button @click="createNewMap('barnhunt')" class="sport-card">
            <span class="emoji">🐀</span>
            <span class="label">Barn Hunt</span>
          </button>
          <button class="sport-card disabled" title="Coming Soon">
            <span class="emoji">🐕</span>
            <span class="label">Agility</span>
          </button>
          <button class="sport-card disabled" title="Coming Soon">
            <span class="emoji">👃</span>
            <span class="label">Scent Work</span>
          </button>
        </div>
      </section>

      <hr class="divider" />

      <section class="explorer-zone">
        <div class="breadcrumb" v-if="mapStore.currentFolderId">
          <button @click="goUpLevel">📁 My Maps</button>
          <span class="separator">/</span>
          <span class="current">{{ currentFolderName }}</span>
        </div>
        <h2 v-else>My Library</h2>

        <div v-if="userStore.tier === 'free'" class="upsell-banner">
          <div class="banner-text">
            <strong>Free Tier Limit:</strong> You cannot save maps to the cloud or export JSON.
          </div>
          <button @click="router.push('/settings')" class="btn-upgrade">
            Upgrade to Solo ($8/mo)
          </button>
        </div>

        <div v-if="!mapStore.currentFolderId" class="folder-section">
          <h3>Trials & Folders</h3>
          <div class="folder-grid">
            <div class="folder-card new-folder" @click="handleCreateFolder">
              <span class="icon">➕</span>
              <span class="name">New Folder</span>
            </div>

            <div v-for="folder in mapStore.folders" :key="folder.id" class="folder-card" @click="openFolder(folder.id)">
              <span class="icon">📁</span>
              <span class="name">{{ folder.name }}</span>
              <button @click.stop="mapStore.deleteFolder(folder.id)" class="btn-xs delete"
                title="Delete Folder">×</button>
            </div>
          </div>
        </div>

        <div class="map-section">
          <h3>{{ mapStore.currentFolderId ? 'Maps in this Trial' : 'Unfiled Maps' }}</h3>

          <div v-if="filteredMaps.length === 0" class="empty-msg">
            No maps found here.
          </div>

          <div class="map-list-grid">
            <div v-for="map in filteredMaps" :key="map.id" class="map-item">
              <div class="map-content" @click="editMap(map)">
                <div class="map-icon">📄</div>
                <div class="map-details">
                  <div class="map-name">{{ map.name }}</div>
                  <div class="map-meta">
                    {{ map.level }} • {{ new Date(map.updatedAt.seconds * 1000).toLocaleDateString() }}
                  </div>
                </div>
              </div>

              <div class="map-actions">
                <button @click.stop="openMoveModal(map)" class="btn-icon" title="Move Folder">📂</button>
              </div>
            </div>
          </div>
        </div>

      </section>
    </main>

    <div v-if="showMoveModal" class="modal-overlay" @click.self="showMoveModal = false">
      <div class="modal">
        <h3>Move Map</h3>
        <p>Select destination for "<strong>{{ selectedMapToMove?.name }}</strong>":</p>
        
        <div class="folder-list">
          <div class="folder-option" @click="confirmMove(null)">
            <span>🚫 Unfiled (Root)</span>
          </div>
          
          <div 
            v-for="folder in mapStore.folders" 
            :key="folder.id" 
            class="folder-option"
            @click="confirmMove(folder.id)"
          >
            <span>📁 {{ folder.name }}</span>
          </div>
        </div>
        
        <button @click="showMoveModal = false" class="btn-cancel">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { max-width: 900px; margin: 0 auto; padding: 0; padding-bottom: 50px; }

/* NAVBAR */
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #eee; margin-bottom: 30px; background: white; }
.logo { font-weight: 800; font-size: 1.2rem; color: #2c3e50; cursor: pointer; }
.user-status { display: flex; align-items: center; }

/* AUTH CARD STYLES */
.auth-wrapper { display: flex; justify-content: center; padding-top: 50px; }
.auth-card { background: white; border: 1px solid #ddd; padding: 40px; border-radius: 12px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
.auth-card h1 { margin-bottom: 10px; color: #2c3e50; }
.subtitle { color: #666; margin-bottom: 30px; }
.form-stack { display: flex; flex-direction: column; gap: 15px; }
.form-stack input { padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
.full-width { width: 100%; padding: 12px; font-size: 1.1rem; }
.auth-footer { margin-top: 20px; font-size: 0.9rem; color: #666; }
.auth-footer a { color: #4CAF50; cursor: pointer; font-weight: bold; text-decoration: underline; }
.forgot-link { display: inline-block; margin-top: 10px; color: #999; text-decoration: none; cursor: pointer; }
.error-box { color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 6px; font-size: 0.9rem; }

/* EXISTING DASHBOARD STYLES */
.content { padding: 0 20px; }
.badge { background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; margin-right: 10px; }
.badge.pro { background: #ffd700; color: #000; }
.badge.club { background: #9c27b0; color: white; }
.creation-zone { margin-bottom: 30px; }
.sport-grid { display: flex; gap: 15px; margin-top: 15px; }
.sport-card { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; height: 100px; border: 2px solid #eee; border-radius: 12px; cursor: pointer; background: white; transition: 0.2s; }
.sport-card:hover:not(.disabled) { transform: translateY(-3px); border-color: #4CAF50; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.sport-card .emoji { font-size: 2rem; margin-bottom: 5px; }
.sport-card .label { font-weight: bold; color: #444; }
.sport-card.disabled { opacity: 0.5; cursor: not-allowed; background: #f9f9f9; filter: grayscale(1); }
.divider { border: 0; border-top: 1px solid #eee; margin: 30px 0; }
.breadcrumb { font-size: 1.2rem; display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.breadcrumb button { background: none; border: none; color: #007bff; cursor: pointer; font-size: inherit; font-weight: bold; padding: 0; }
.upsell-banner { background: #fff8e1; border: 1px solid #ffe0b2; color: #5d4037; padding: 15px 20px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; gap: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.btn-upgrade { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-upgrade:hover { background: #43a047; }
.folder-section { margin-bottom: 40px; }
.folder-section h3, .map-section h3 { font-size: 0.9rem; text-transform: uppercase; color: #888; margin-bottom: 15px; letter-spacing: 1px; }
.folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; }
.folder-card { background: #fdfdfd; border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100px; }
.folder-card:hover { background: #fff; border-color: #bbb; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05); }
.folder-card .icon { font-size: 2rem; margin-bottom: 5px; display: block; }
.folder-card .name { font-weight: bold; color: #333; font-size: 0.95rem; }
.folder-card.new-folder { border: 2px dashed #ccc; color: #666; background: transparent; }
.folder-card.new-folder:hover { border-color: #4CAF50; color: #4CAF50; background: #f0fdf4; }
.btn-xs.delete { position: absolute; top: 5px; right: 5px; background: none; border: none; color: #ddd; font-size: 1.2rem; cursor: pointer; }
.btn-xs.delete:hover { color: red; }
.map-list-grid { display: flex; flex-direction: column; gap: 10px; }
.map-item { display: flex; align-items: center; gap: 15px; border: 1px solid #eee; padding: 10px 15px; border-radius: 8px; cursor: pointer; background: white; transition: 0.2s; justify-content: space-between; }
.map-item:hover { border-color: #4CAF50; transform: translateX(5px); }
.map-icon { font-size: 1.5rem; background: #e8f5e9; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.map-name { font-weight: bold; font-size: 1.1rem; color: #2c3e50; }
.map-meta { color: #888; font-size: 0.9rem; margin-top: 3px; }
.empty-msg { color: #999; font-style: italic; padding: 20px; border: 2px dashed #eee; border-radius: 8px; text-align: center; }
.map-content { display: flex; align-items: center; gap: 15px; flex-grow: 1; cursor: pointer; }
.map-actions { display: flex; gap: 5px; }
.btn-icon { background: white; border: 1px solid #ddd; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; }
.btn-icon:hover { background: #f0f0f0; border-color: #bbb; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; padding: 20px; border-radius: 8px; min-width: 350px; }
.folder-list { display: flex; flex-direction: column; gap: 5px; margin: 15px 0; max-height: 300px; overflow-y: auto; }
.folder-option { padding: 12px; border: 1px solid #eee; border-radius: 6px; cursor: pointer; background: #fdfdfd; }
.folder-option:hover { background: #e3f2fd; border-color: #2196f3; }
.btn-cancel { width: 100%; padding: 10px; background: #eee; border: none; cursor: pointer; border-radius: 4px; }
.btn-icon-nav { background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-right: 10px; padding: 5px; border-radius: 50%; transition: background 0.2s; }
.btn-icon-nav:hover { background: #f0f0f0; }
.btn-nav-link { background: none; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
.btn-nav-link:hover { background: #eee; }
.btn-primary { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:hover { background-color: #43a047; }
</style>
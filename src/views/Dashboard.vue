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

// Computed: Helper for Breadcrumb title
const currentFolderName = computed(() => {
  if (!mapStore.currentFolderId) return "All Maps"
  const f = mapStore.folders.find(f => f.id === mapStore.currentFolderId)
  return f ? f.name : "Unknown Folder"
})

// Computed: Filter maps based on current folder
const filteredMaps = computed(() => {
  if (!mapStore.currentFolderId) {
    // ROOT VIEW: Show maps that have NO folder ID (null, undefined, or empty)
    return userMaps.value.filter(m => !m.folderId)
  } else {
    // FOLDER VIEW: Show maps matching current ID
    return userMaps.value.filter(m => m.folderId === mapStore.currentFolderId)
  }
})

// Lifecycle
onMounted(async () => {
  if (userStore.user) {
    // Reset to root view when entering dashboard
    mapStore.currentFolderId = null

    // Load data
    userMaps.value = await mapStore.loadUserMaps()
    await mapStore.loadUserFolders()
  }
})


function openMoveModal(map) {
  selectedMapToMove.value = map
  showMoveModal.value = true
}

async function confirmMove(targetFolderId) {
  if (selectedMapToMove.value) {
    await mapStore.moveMap(selectedMapToMove.value.id, targetFolderId)
    // Refresh list
    userMaps.value = await mapStore.loadUserMaps()
    showMoveModal.value = false
    selectedMapToMove.value = null
  }
}

// Actions
function createNewMap(sportType) {
  mapStore.reset()
  // Note: reset() preserves currentFolderId, so the map is created in the active folder
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
      <div class="user-status">
        <span class="badge" :class="userStore.tier">{{ userStore.tier.toUpperCase() }} MEMBER</span>
        
        <button @click="router.push('/settings')" class="btn-icon-nav" title="Settings">⚙️</button>
        
        <button @click="userStore.logout" class="btn-nav-link">Logout</button>
      </div>
    </nav>

    <main class="content">

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
.dashboard {
  max-width: 900px;
  margin: 0 auto;
  padding: 0;
  padding-bottom: 50px;
}

/* NAVBAR */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 30px;
  background: white;
}

.logo {
  font-weight: 800;
  font-size: 1.2rem;
  color: #2c3e50;
  cursor: pointer;
}

.logo:hover {
  opacity: 0.7;
}

.content {
  padding: 0 20px;
}

.user-status {
  display: flex;
  align-items: center;
}

.badge {
  background: #eee;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.8em;
  margin-right: 10px;
}

.badge.pro {
  background: #ffd700;
  color: #000;
}

.badge.club {
  background: #9c27b0;
  color: white;
}

/* CREATION ZONE */
.creation-zone {
  margin-bottom: 30px;
}

.sport-grid {
  display: flex;
  gap: 15px;
  margin-top: 15px;
}

.sport-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 100px;
  border: 2px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  background: white;
  transition: 0.2s;
}

.sport-card:hover:not(.disabled) {
  transform: translateY(-3px);
  border-color: #4CAF50;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.sport-card .emoji {
  font-size: 2rem;
  margin-bottom: 5px;
}

.sport-card .label {
  font-weight: bold;
  color: #444;
}

.sport-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9f9f9;
  filter: grayscale(1);
}

.divider {
  border: 0;
  border-top: 1px solid #eee;
  margin: 30px 0;
}

/* EXPLORER ZONE */
.breadcrumb {
  font-size: 1.2rem;
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
}

.breadcrumb button {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: inherit;
  font-weight: bold;
  padding: 0;
}

.breadcrumb button:hover {
  text-decoration: underline;
}

.separator {
  color: #ccc;
}

/* UPDATED BANNER STYLES */
.upsell-banner {
  background: #fff8e1; /* Lighter yellow */
  border: 1px solid #ffe0b2;
  color: #5d4037;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.banner-text {
  font-size: 0.95rem;
  flex: 1;
}

/* NEW BUTTON STYLE */
.btn-upgrade {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-upgrade:hover {
  background: #43a047;
  transform: translateY(-1px);
}

/* FOLDERS */
.folder-section {
  margin-bottom: 40px;
}

.folder-section h3,
.map-section h3 {
  font-size: 0.9rem;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 15px;
}

.folder-card {
  background: #fdfdfd;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
}

.folder-card:hover {
  background: #fff;
  border-color: #bbb;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.folder-card .icon {
  font-size: 2rem;
  margin-bottom: 5px;
  display: block;
}

.folder-card .name {
  font-weight: bold;
  color: #333;
  font-size: 0.95rem;
  word-break: break-word;
}

.folder-card.new-folder {
  border: 2px dashed #ccc;
  color: #666;
  background: transparent;
}

.folder-card.new-folder:hover {
  border-color: #4CAF50;
  color: #4CAF50;
  background: #f0fdf4;
}

.btn-xs.delete {
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  color: #ddd;
  font-size: 1.2rem;
  cursor: pointer;
}

.btn-xs.delete:hover {
  color: red;
}

/* MAPS */
.map-list-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-item {
  display: flex;
  align-items: center;
  gap: 15px;
  border: 1px solid #eee;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  background: white;
  transition: 0.2s;
  justify-content: space-between;
}

.map-item:hover {
  border-color: #4CAF50;
  transform: translateX(5px);
}

.map-icon {
  font-size: 1.5rem;
  background: #e8f5e9;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.map-name {
  font-weight: bold;
  font-size: 1.1rem;
  color: #2c3e50;
}

.map-meta {
  color: #888;
  font-size: 0.9rem;
  margin-top: 3px;
}

.empty-msg {
  color: #999;
  font-style: italic;
  padding: 20px;
  border: 2px dashed #eee;
  border-radius: 8px;
  text-align: center;
}

.map-content {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-grow: 1;
  cursor: pointer;
}

.map-actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: white;
  border: 1px solid #ddd;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
}
.btn-icon:hover {
  background: #f0f0f0;
  border-color: #bbb;
}

/* MODAL STYLES */
.folder-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 15px 0;
  max-height: 300px;
  overflow-y: auto;
}

.folder-option {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  cursor: pointer;
  background: #fdfdfd;
}
.folder-option:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.btn-cancel {
  width: 100%;
  padding: 10px;
  background: #eee;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
.btn-icon-nav {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  margin-right: 10px;
  padding: 5px;
  border-radius: 50%;
  transition: background 0.2s;
}
.btn-icon-nav:hover {
  background: #f0f0f0;
}
.btn-nav-link {
  background: none;
  border: 1px solid #ccc;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-nav-link:hover {
  background: #eee;
}

@media (max-width: 600px) {
  .upsell-banner {
    flex-direction: column;
    text-align: center;
  }
  .btn-upgrade {
    width: 100%;
  }
}
</style>
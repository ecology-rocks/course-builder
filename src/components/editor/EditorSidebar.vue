<script setup>
import { ref, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useRouter } from 'vue-router'

// Import the Modals we extracted
import LoadMapModal from '../modals/LoadMapModal.vue'
import ShareMapModal from '../modals/ShareMapModal.vue'
import RandomizerModal from '../modals/RandomizerModal.vue'

const emit = defineEmits(['print']) // We tell the parent to print
const store = useMapStore()
const userStore = useUserStore()
const router = useRouter()

// Local State
const email = ref('')
const password = ref('')
const fileInput = ref(null)

// Modal State
const showLoadModal = ref(false)
const showShareModal = ref(false)
const showRandomizerModal = ref(false)

// --- ACTIONS ---

// Auth
async function handleLogin() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.login(email.value, password.value)
}

async function handleRegister() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.register(email.value, password.value)
}

async function handleForgotPassword() {
  if (!email.value) return alert("Please enter your email address first.")
  await userStore.resetPassword(email.value)
}

async function handleEditProfileName() {
  const newName = prompt("Enter your official Judge Name for printouts:", userStore.judgeName)
  if (newName && newName.trim() !== "") {
    await userStore.updateJudgeName(newName.trim())
  }
}

// Files
function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => store.importMapFromJSON(e.target.result)
  reader.readAsText(file)
}

function openShareModal() {
  if (!store.currentMapId) {
    alert("Please save the map to the cloud first.")
    return
  }
  if (!store.isShared) {
    store.isShared = true
    store.saveToCloud()
  }
  showShareModal.value = true
}

// Lifecycle
onMounted(async () => {
  if (userStore.user) {
    await store.loadUserFolders()
  }
})
</script>

<template>
  <div class="controls">
    
    <div class="saas-header">
      <div class="nav-row">
        <button @click="router.push('/dashboard')" class="btn-text">← Dashboard</button>
      </div>
      
      <div v-if="userStore.user" class="user-info">
        <span>👤 {{ userStore.user.email }}</span>
        <button @click="userStore.logout" class="btn-small">Logout</button>
      </div>
      
      <div v-else class="auth-form">
        <input v-model="email" type="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Password" />
        <div class="auth-buttons">
          <button @click="handleLogin" class="btn-primary">Login</button>
          <button @click="handleRegister" class="btn-secondary">Register</button>
        </div>
        <a href="#" @click.prevent="handleForgotPassword" class="forgot-link">Forgot Password?</a>
        <span v-if="userStore.authError" class="error-msg">{{ userStore.authError }}</span>
      </div>

      <div class="file-actions">
        <div class="folder-select-row">
          <span class="label">Folder:</span>
          <select v-model="store.currentFolderId">
            <option :value="null">🚫 Unfiled</option>
            <option v-for="f in store.folders" :key="f.id" :value="f.id">
              📁 {{ f.name }}
            </option>
          </select>
        </div>

        <input v-model="store.mapName" class="map-name-input" placeholder="Map Name" />
        
        <div class="profile-link" v-if="userStore.user">
          <span class="label">Judge:</span>
          <span class="name">{{ userStore.judgeName || 'Not Set' }}</span>
          <button @click="handleEditProfileName" class="btn-xs" title="Edit Profile Name">✏️</button>
        </div>

        <div class="btn-group">
          <button @click="store.saveToCloud" :disabled="!userStore.user || !userStore.can('save_cloud')" :title="userStore.can('save_cloud') ? 'Save' : 'Club Upgrade Required'">
            ☁️ Save {{ !userStore.can('save_cloud') ? '🔒' : '' }}
          </button>
          <button @click="showLoadModal = true" :disabled="!userStore.user">📂 Open</button>
          <button 
            @click="openShareModal" 
            :disabled="!userStore.can('save_cloud') || !store.currentMapId"
            :style="{ backgroundColor: store.isShared ? '#4CAF50' : '#f0f0f0', color: store.isShared ? 'white' : '#333' }"
          >
            {{ store.isShared ? '🔗 Shared' : '🔒 Private' }}
          </button>
        </div>

        <div class="btn-group">
          <button @click="store.exportMapToJSON" :disabled="!userStore.can('export_json')">⬇️ Export {{ !userStore.can('export_json') ? '🔒' : '' }}</button>
          <button @click="fileInput.click()">⬆️ Import</button>
          <button @click="emit('print')">🖨️ Print</button>
          <button v-if="store.classLevel === 'Master'" @click="showRandomizerModal = true" style="background-color: #673ab7; color: white; border: none;">🎲 Randomizer</button>
          <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleFileImport" />
        </div>
      </div>
    </div>
    <hr />

    <h3>Layer Control</h3>
    <div class="layer-select">
      <button v-for="i in 3" :key="i" @click="store.currentLayer = i" :class="{ active: store.currentLayer === i }">Layer {{ i }}</button>
    </div>

    <div class="toolbox">
      <h4>Placement Tools</h4>
      <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }">📦 Bale</button>
      <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Board</button>
      <button @click="store.setTool('startbox')" :class="{ active: store.activeTool === 'startbox' }">🔲 Start</button>
      <button @click="store.setTool('dcmat')" :class="{ active: store.activeTool === 'dcmat' }">🟧 DC Mat</button>
      <button @click="userStore.can('mark_hides') ? store.setTool('hide') : alert('Pro Feature')" :class="{ active: store.activeTool === 'hide', disabled: !userStore.can('mark_hides') }">🔴 Hide {{ !userStore.can('mark_hides') ? '🔒' : '' }}</button>
    </div>

    <div class="toolbox action-tools">
      <h4>Action Tools</h4>
      <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">🔄 Rotate</button>
      <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }">📐 Type</button>
      <button @click="store.setTool('lean')" :class="{ active: store.activeTool === 'lean' }">↗️ Lean</button>
      <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete</button>
    </div>

    <h3>Course Settings</h3>
    <div class="level-control">
      <label>Class Level:</label>
      <select v-model="store.classLevel">
        <option value="Instinct">Instinct</option>
        <option value="Novice">Novice</option>
        <option value="Open">Open</option>
        <option value="Senior">Senior</option>
        <option value="Master">Master</option>
        <option value="Crazy8s">Crazy 8s</option>
        <option value="LineDrive">Line Drive</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div class="guidelines-box" v-if="store.currentGuidelines">
      <h5>{{ store.classLevel }} Guidelines</h5>
      <div class="guide-row"><span>Min Bales:</span> <strong>{{ store.currentGuidelines.minBales }}</strong></div>
      <div class="guide-row"><span>Max Bales:</span> <strong>{{ store.currentGuidelines.maxBales }}</strong></div>
      <div class="guide-note">{{ store.currentGuidelines.notes }}</div>
      <div v-if="store.inventory.total < store.currentGuidelines.minBales" class="warning-text">⚠️ Need {{ store.currentGuidelines.minBales - store.inventory.total }} more bales!</div>
    </div>

    <div class="ring-controls">
      <label>Width (ft):<input type="number" :value="store.ringDimensions.width" @change="store.resizeRing($event.target.value, store.ringDimensions.height)" /></label>
      <label>Height (ft):<input type="number" :value="store.ringDimensions.height" @change="store.resizeRing(store.ringDimensions.width, $event.target.value)" /></label>
    </div>

    <div class="stats-panel">
      <h4>Bale Inventory</h4>
      <div class="stat-row main-stat"><span>Total Bales:</span><strong>{{ store.inventory.total }}</strong></div>
      <div class="stat-row"><span>Base Layer (L1):</span><span>{{ store.inventory.base }}</span></div>
      <hr>
      <div class="nesting-control">
        <label>Previous Class Count:</label>
        <input type="number" v-model.number="store.previousClassCount" placeholder="e.g. 40">
      </div>
      <div class="stat-row delta" :class="{ 'positive': store.inventory.total >= store.previousClassCount }">
        <span>Nesting Delta:</span><strong>{{ store.inventory.deltaString }} bales</strong>
      </div>
    </div>

    <div class="instructions">
      <h4>Controls</h4>
      <ul>
        <li><strong>Click Grid:</strong> Add Item</li>
        <li><strong>Right-Click:</strong> Rotate</li>
        <li><strong>Shift+Click:</strong> Cycle Type</li>
        <li><strong>Alt+Click:</strong> Leaner Arrow</li>
        <li><strong>Drag:</strong> Move Item</li>
        <li><strong>Dbl-Click (Left):</strong> Delete</li>
      </ul>
    </div>

    <LoadMapModal v-model="showLoadModal" />
    <ShareMapModal v-model="showShareModal" />
    <RandomizerModal v-model="showRandomizerModal" />

  </div>
</template>

<style scoped>
/* COPIED STYLES FROM MapEditor.vue */
.controls { width: 250px; background: #f5f5f5; padding: 1rem; max-height: 90vh; overflow-y: auto; }
.saas-header { margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px; }
.auth-form { display: flex; flex-direction: column; gap: 5px; }
.auth-form input { padding: 5px; border: 1px solid #ccc; border-radius: 4px; }
.auth-buttons { display: flex; gap: 5px; margin-top: 5px; }
.user-info { display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; font-weight: bold; }
.error-msg { color: red; font-size: 0.8em; }
.forgot-link { font-size: 0.85rem; color: #007bff; text-decoration: none; cursor: pointer; margin-top: 5px; }
.forgot-link:hover { text-decoration: underline; }
.nav-row { margin-bottom: 5px; }
.btn-text { background: none; border: none; color: #666; cursor: pointer; font-weight: bold; padding: 0; }
.btn-text:hover { text-decoration: underline; color: #333; }
.file-actions { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.map-name-input { width: 95%; padding: 5px; font-weight: bold; }
.btn-group { display: flex; gap: 5px; flex-wrap: wrap; }
.btn-group button { flex: 1; padding: 5px; cursor: pointer; font-size: 0.9em; min-width: 60px; }
.btn-primary { background-color: #4CAF50; color: white; border: none; padding: 6px; cursor: pointer; border-radius: 4px; flex: 1; }
.btn-secondary { background-color: #008CBA; color: white; border: none; padding: 6px; cursor: pointer; border-radius: 4px; flex: 1; }
.btn-small { padding: 2px 6px; font-size: 0.8em; cursor: pointer; }
.layer-select button, .toolbox button { margin-right: 5px; padding: 5px 10px; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 3px; }
.layer-select button.active, .toolbox button.active { background: #333; color: white; }
.toolbox { margin-bottom: 20px; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px; }
.level-control { margin-bottom: 10px; }
.level-control select { width: 100%; padding: 5px; }
.ring-controls { display: flex; gap: 10px; margin-bottom: 10px; }
.ring-controls input { width: 50px; padding: 4px; }
.stats-panel { background: #fff; border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
.stat-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
.main-stat { font-size: 1.1em; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
.small-text { font-size: 0.85em; color: #666; }
.nesting-control { display: flex; flex-direction: column; margin-bottom: 8px; }
.delta.positive { color: #388e3c; }
.delta { color: #d32f2f; font-weight: bold; }
.instructions ul { padding-left: 20px; margin: 0; font-size: 0.9rem; line-height: 1.6; }
.guidelines-box { background: #e3f2fd; border: 1px solid #90caf9; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; }
.guidelines-box h5 { margin: 0 0 5px 0; color: #1565c0; text-transform: uppercase; font-size: 0.85em; }
.guide-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
.guide-note { margin-top: 5px; font-style: italic; color: #555; font-size: 0.85em; line-height: 1.4; border-top: 1px solid #bbdefb; padding-top: 5px; }
.warning-text { color: #d32f2f; font-weight: bold; margin-top: 5px; text-align: center; background: rgba(255, 255, 255, 0.5); border-radius: 4px; padding: 2px; }
.profile-link { display: flex; align-items: center; background: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 0.9em; margin-bottom: 5px; border: 1px solid #ddd; }
.profile-link .label { color: #666; margin-right: 5px; }
.profile-link .name { font-weight: bold; color: #333; margin-right: 10px; flex-grow: 1; }
.btn-xs { background: none; border: none; cursor: pointer; font-size: 1em; padding: 0; }
.btn-xs:hover { transform: scale(1.1); }
.folder-select-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 0.9em; color: #666; }
.folder-select-row select { flex: 1; padding: 4px; border: 1px solid #ccc; border-radius: 4px; background: #fff; }
.action-tools button { background: #fff3e0; border-color: #ffcc80; }
.action-tools button.active { background: #e65100; color: white; }

@media (max-width: 768px) {
  .controls { width: 100%; max-height: 250px; overflow-y: auto; padding: 10px; }
  .toolbox, .file-actions, .saas-header { display: flex; flex-wrap: wrap; gap: 8px; }
}
</style>
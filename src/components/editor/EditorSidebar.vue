<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useRouter } from 'vue-router'

// Toolboxes
import BarnHuntToolbox from './toolboxes/BarnHuntToolbox.vue'
import AgilityToolbox from './toolboxes/AgilityToolbox.vue'
import ScentWorkToolbox from './toolboxes/ScentWorkToolbox.vue'

// Modals
import ShareMapModal from '../modals/ShareMapModal.vue'
import LoadMapModal from '../modals/LoadMapModal.vue'
import CourseSettingsModal from '../modals/CourseSettingsModal.vue'
import RandomizerModal from '../modals/RandomizerModal.vue'
import BugReportModal from '../modals/BugReportModal.vue'
import DeleteMapModal from '../modals/DeleteMapModal.vue'
import LibraryModal from '../modals/LibraryModal.vue'

const store = useMapStore()
const userStore = useUserStore()
const router = useRouter()
const emit = defineEmits(['print', 'save-map', 'save-library'])

// State for Modals & Menus
const showShareModal = ref(false)
const showLoadModal = ref(false)
const showSettingsModal = ref(false)
const showRandomizerModal = ref(false)
const showBugReportModal = ref(false)
const showDeleteModal = ref(false)
const showLibraryModal = ref(false)
const showMoreMenu = ref(false)
const isAdmin = computed(() => userStore.user?.email === 'reallyjustsam@gmail.com')

// --- FILE IMPORT LOGIC ---
const fileInput = ref(null)

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    store.importMapFromJSON(e.target.result)
    event.target.value = '' // Reset so same file can be loaded again
  }
  reader.readAsText(file)
}
// -------------------------

const toolboxComponent = computed(() => {
  switch (store.sport) {
    case 'agility': return AgilityToolbox
    case 'scentwork': return ScentWorkToolbox
    default: return BarnHuntToolbox
  }
})

function goHome() {
  if (confirm("Leave editor? Unsaved changes will be lost.")) {
    store.reset()
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="sidebar">
    <div class="zone-top">
      <div class="header-row">
        <button @click="goHome" class="btn-icon" title="Home">🏠</button>
        <div class="map-title-wrapper">
          <input v-model="store.mapName" class="map-title-input" placeholder="Untitled Map" />
        </div>
        <button @click="emit('save-map')" class="btn-icon" title="Quick Save">💾</button>
        <button @click="showSettingsModal = true" class="btn-icon" title="Settings">⚙️</button>
      </div>

      <div class="control-row">
        <div class="layer-pills" v-if="store.sport === 'barnhunt'">
          <button @click="store.currentLayer = 1" :class="{ active: store.currentLayer === 1 }">L1</button>
          <button @click="store.currentLayer = 2" :class="{ active: store.currentLayer === 2 }">L2</button>
          <button @click="store.currentLayer = 3" :class="{ active: store.currentLayer === 3 }">L3</button>
        </div>
        
        <div class="history-pills">
          <button @click="store.undo()" title="Undo (Ctrl+Z)">↩</button>
          <button @click="store.redo()" title="Redo (Ctrl+Y)">↪</button>
        </div>
      </div>
    </div>

    <div class="zone-middle">
      <component :is="toolboxComponent" />
    </div>

    <div class="zone-bottom">
      <div class="primary-actions">
        <button @click="emit('save-map')" class="btn-primary">💾 Save</button>
        <button @click="emit('print', true)" class="btn-secondary">🖨️ Print</button>
      </div>
      
      <div class="secondary-actions">
        <button @click="showLoadModal = true">📂 Load</button>
        <button @click="showShareModal = true">🔗 Share</button>
        <button @click="showLibraryModal = true">📖 Lib</button>
      </div>

      <button class="btn-more" @click="showMoreMenu = !showMoreMenu">
        {{ showMoreMenu ? '▼ Less' : '▲ More Actions' }}
      </button>

      <div v-if="showMoreMenu" class="more-menu">
        <button @click="emit('print', false)">🖨️ Print (No Hides)</button>
        <button v-if="isAdmin" @click="emit('save-library')">📚 Save to Library</button>
        
        <button @click="triggerFileUpload">⬆ Import JSON</button>
        
        <button @click="store.exportMapToJSON()">⬇ Export JSON</button>
        
        <button @click="store.realignGrid()">📏 Realign All to Grid</button>

        <button @click="showRandomizerModal = true">🎲 Randomizer</button>
        <button @click="showBugReportModal = true">🐞 Report Bug</button>
        <button v-if="store.currentMapId" @click="showDeleteModal = true" class="text-danger">
          🗑️ Delete Map
        </button>
      </div>
    </div>

    <input 
      type="file" 
      ref="fileInput" 
      accept=".json" 
      style="display: none" 
      @change="handleFileUpload" 
    />

    <ShareMapModal v-if="showShareModal" @close="showShareModal = false" />
    <LoadMapModal v-if="showLoadModal" @close="showLoadModal = false" />
    <CourseSettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />
    <RandomizerModal v-if="showRandomizerModal" @close="showRandomizerModal = false" />
    <BugReportModal v-if="showBugReportModal" @close="showBugReportModal = false" />
    <DeleteMapModal v-if="showDeleteModal" @close="showDeleteModal = false" />
    <LibraryModal v-if="showLibraryModal" @close="showLibraryModal = false" />
  </div>
</template>

<style scoped>
.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ZONE 1 */
.zone-top {
  padding: 10px;
  border-bottom: 1px solid #eee;
  background: #fcfcfc;
}

.header-row {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}

.map-title-wrapper {
  flex: 1;
}

.map-title-input {
  width: 90%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-weight: bold;
}

.btn-icon {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 5px 8px;
}

.control-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.layer-pills, .history-pills {
  display: flex;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 2px;
}

.layer-pills button, .history-pills button {
  border: none;
  background: none;
  padding: 4px 10px;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 3px;
  font-weight: bold;
  color: #555;
}

.layer-pills button.active {
  background: white;
  color: #2196f3;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.history-pills button:hover {
  background: #e0e0e0;
}

/* ZONE 2 */
.zone-middle {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

/* ZONE 3 */
.zone-bottom {
  padding: 15px;
  border-top: 1px solid #eee;
  background: #f9f9f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.primary-actions {
  display: flex;
  gap: 8px;
}

.primary-actions button {
  flex: 1;
  padding: 10px;
  border-radius: 4px;
  border: none;
  font-weight: bold;
  cursor: pointer;
}

.btn-primary { background: #2196f3; color: white; }
.btn-primary:hover { background: #1976d2; }
.btn-secondary { background: #5c6bc0; color: white; }
.btn-secondary:hover { background: #3949ab; }

.secondary-actions {
  display: flex;
  gap: 5px;
}

.secondary-actions button {
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-more {
  background: none;
  border: none;
  font-size: 0.8rem;
  color: #777;
  cursor: pointer;
  margin-top: 5px;
}

.more-menu {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: white;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.more-menu button {
  text-align: left;
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #444;
}

.more-menu button:hover {
  background: #f5f5f5;
  color: #000;
}

.text-danger {
  color: #c62828 !important;
}
.text-danger:hover {
  background: #ffebee !important;
}
</style>
<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useRouter } from 'vue-router'

// Toolboxes
import BarnHuntToolbox from './BarnHuntToolbox.vue'

// Modals
import ShareMapModal from 'modals/ShareMapModal.vue'
import LoadMapModal from 'modals/LoadMapModal.vue'
import CourseSettingsModal from 'modals/CourseSettingsModal.vue'
import BugReportModal from 'common/BugReportModal.vue'
import DeleteMapModal from 'modals/DeleteMapModal.vue'
import LibraryModal from 'modals/LibraryModal.vue'
import UpgradeModal from 'modals/UpgradeModal.vue'
// [KEEP] Old Print Modal
import PrintModal from 'modals/PrintModal.vue'
// [NEW] Advanced Print Modal
import AdvancedPrintModal from '@/components/modals/AdvancedPrintModal.vue'

const store = useMapStore()
const userStore = useUserStore()
const router = useRouter()
const emit = defineEmits(['print', 'advanced-print', 'save-map', 'save-library', 'blind-setup'])

// State for Modals & Menus
const showShareModal = ref(false)
const showLoadModal = ref(false)
const showSettingsModal = ref(false)
const showBugReportModal = ref(false)
const showDeleteModal = ref(false)
const showLibraryModal = ref(false)
const showPrintModal = ref(false) // Old Modal
const showAdvancedPrintModal = ref(false) // New Modal
const showMoreMenu = ref(false)
const isAdmin = computed(() => userStore.user?.email === 'reallyjustsam@gmail.com')
const isPro = computed(() => ['pro', 'club'].includes(userStore.tier))
const showUpgradeModal = ref(false)

// [OLD] Legacy Handler
function onPrintConfirm(config) {
  emit('print', config)
  showPrintModal.value = false
}

// [NEW] Advanced Handler
function onAdvancedPrintConfirm(config) {
  emit('advanced-print', config)
  showAdvancedPrintModal.value = false
}

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
  return BarnHuntToolbox
})

function goHome() {
  if (confirm("Leave editor? Unsaved changes will be lost.")) {
    store.reset()
    router.push('/dashboard')
  }
}

function handleSave() {
  if (userStore.isPro) {
    emit('save-map')
  } else {
    showUpgradeModal.value = true
  }
}
</script>

<template>
  <div class="sidebar">
    <div class="zone-top">
      <div class="header-row">
        <button @click="goHome" class="btn-icon" title="Home">🏠</button>
        <button v-if="!userStore.isPro" @click="showUpgradeModal = true" class="btn-upgrade-icon"
          title="Upgrade to Pro">👑</button>
        <div class="map-title-wrapper">
          <input v-model="store.mapName" class="map-title-input"
            :placeholder="isPro ? 'Untitled Map' : 'Untitled Map (Read Only)'" :disabled="!isPro"
            :title="!isPro ? 'Upgrade to rename map' : ''" />
        </div>
        <button @click="handleSave" class="btn-icon" title="Quick Save">💾<span
            v-if="!userStore.isPro">🔒</span></button>
        <button @click="showSettingsModal = true" class="btn-icon" title="Settings">⚙️</button>
      </div>

      <div class="control-row">
        <div class="layer-pills">
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

    <div class="sidebar-section">
      <label class="checkbox-row">
        <input type="checkbox" v-model="store.multiLayerView" />
        <span>Overlay All Layers</span>
      </label>

      <div v-if="store.multiLayerView" class="opacity-control">
        <div class="opacity-header">
          <span>Layer Opacity</span>
          <span>{{ Math.round(store.layerOpacity * 100) }}%</span>
        </div>
        <input type="range" v-model.number="store.layerOpacity" min="0.1" max="1" step="0.1" />
      </div>
    </div>
    <div class="zone-middle">
      <component :is="toolboxComponent" @blind-setup="emit('blind-setup')"/>
    </div>

    <div class="zone-bottom">
      <div class="primary-actions">
        <button @click="handleSave" class="btn-primary">
          <span v-if="!userStore.isPro">🔒</span> 💾 Save
        </button>
        
        <button @click="showPrintModal = true" class="btn-secondary">🖨️ Print</button>
      </div>
      
      <div style="margin-top: 5px;">
        <button @click="showAdvancedPrintModal = true" class="btn-beta">
          🚀 Advanced Print (Beta)
        </button>
      </div>

      <div class="secondary-actions">
        <button @click="showLoadModal = true">📂 Load</button>
        <button v-if="userStore.isPro" @click="showShareModal = true">🔗 Share</button>
        <button @click="showLibraryModal = true">📖 Lib</button>
      </div>

      <button class="btn-more" @click="showMoreMenu = !showMoreMenu">
        {{ showMoreMenu ? '▼ Less' : '▲ More Actions' }}
      </button>

      <div v-if="showMoreMenu" class="more-menu">
        <button v-if="isAdmin" @click="emit('save-library')">📚 Save to Library</button>
        <button @click="triggerFileUpload">⬆ Import JSON</button>
        <button @click="store.exportMapToJSON()">⬇ Export JSON</button>
        <button @click="store.realignGrid()">📏 Realign All to Grid</button>
        <button @click="showBugReportModal = true">🐞 Feedback & Bugs</button>
        <button v-if="store.currentMapId" @click="showDeleteModal = true" class="text-danger">
          🗑️ Delete Map
        </button>
      </div>
    </div>

    <input type="file" ref="fileInput" accept=".json" style="display: none" @change="handleFileUpload" />

    <ShareMapModal v-if="showShareModal" @close="showShareModal = false" />
    <LoadMapModal v-if="showLoadModal" @close="showLoadModal = false" />
    <CourseSettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />
    <BugReportModal v-if="showBugReportModal" @close="showBugReportModal = false" />
    <DeleteMapModal v-if="showDeleteModal" @close="showDeleteModal = false" />
    <LibraryModal v-if="showLibraryModal" @close="showLibraryModal = false" />
    <UpgradeModal v-if="showUpgradeModal" @close="showUpgradeModal = false" />
    
    <PrintModal v-if="showPrintModal" @close="showPrintModal = false" @confirm="onPrintConfirm" />
    <AdvancedPrintModal v-if="showAdvancedPrintModal" @close="showAdvancedPrintModal = false" @confirm="onAdvancedPrintConfirm" />
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

.layer-pills,
.history-pills {
  display: flex;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 2px;
}

.layer-pills button,
.history-pills button {
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #5c6bc0;
  color: white;
}

.btn-secondary:hover {
  background: #3949ab;
}

/* Beta Button Style */
.btn-beta {
  width: 100%;
  background: linear-gradient(45deg, #673ab7, #9c27b0);
  color: white;
  border: none;
  padding: 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(103, 58, 183, 0.3);
}
.btn-beta:hover {
  opacity: 0.9;
}

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

.btn-upgrade-icon {
  background: #fff9c4;
  /* Pale yellow */
  border: 1px solid #fbc02d;
  border-radius: 4px;
  cursor: pointer;
  padding: 5px 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(251, 192, 45, 0.4);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(251, 192, 45, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(251, 192, 45, 0);
  }
}

.sidebar-section {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #444;
  user-select: none;
}

.checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.opacity-control {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 6px;
  margin-top: 5px;
}

.opacity-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.opacity-control input[type="range"] {
  width: 100%;
  cursor: pointer;
  accent-color: #2196f3;
  /* Matches your active blue theme */
}
</style>
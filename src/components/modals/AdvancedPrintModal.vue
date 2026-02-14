<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'confirm'])
const store = useMapStore()
const userStore = useUserStore()

const activeTab = ref('general')

const config = reactive({
  mode: 'layers',
  layout: 'full', 
  orientation: 'landscape',
  overlayAll: true, 
  copies: 1, // [NEW] Default to 1 copy
  
  layers: { 1: true, 2: false, 3: false },
  hides: { mode: 'none' },

  legend: {
    showStats: true,
    showBales: true,
    showHides: true,
    showWalls: true,
    showFence: true,
    showTunnels: true,
    showTunnelBox: true,
    showGate: true,
    showStep: true,
    showLeaners: true,
    showAnchors: true,
    showStartBox: true,
    showDCMat: true,
    showObstruction: true,
    showDeadZone: true,
    customItems: {} 
  }
})

const availableBlinds = computed(() => store.mapData.blinds || [])
const selectedBlindIds = ref([])

const printButtonLabel = computed(() => {
  if (activeTab.value === 'blinds') return 'Print Blinds'
  if (activeTab.value === 'layers') return 'Print Layers'
  return config.mode === 'blinds' ? 'Print Blinds' : 'Print Layers'
})

// Custom Item Scanning
const detectedCustoms = computed(() => {
  const customs = []
  const seen = new Set()
  const scan = (collection, typeLabel) => {
    if (!collection) return
    const items = Array.isArray(collection) ? collection : [collection]
    items.forEach(item => {
      let fill = null, stroke = null
      if (item.custom) { fill = item.custom.fillColor; stroke = item.custom.strokeColor } 
      else { fill = item.fillColor; stroke = item.strokeColor || item.color }

      if (fill || stroke) {
         const sig = JSON.stringify({ f: fill, s: stroke, t: typeLabel })
         if (!seen.has(sig)) {
           seen.add(sig)
           customs.push({
             id: sig,
             label: item.label || item.name || `Custom ${typeLabel}`,
             style: { fillColor: fill, strokeColor: stroke }
           })
         }
      }
    })
  }
  scan(store.bales, "Bale")
  scan(store.customWalls, "Wall")
  scan(store.tunnelBoards, "Board")
  scan(store.dcMats, "Mat")
  if (store.startBox) scan(store.startBox, "Start Box")
  return customs
})

const hasLayer2 = computed(() => store.bales.some(b => b.layer === 2))
const hasLayer3 = computed(() => store.bales.some(b => b.layer === 3))

onMounted(() => {
  if (hasLayer2.value) config.layers[2] = true
  if (hasLayer3.value) config.layers[3] = true
  selectedBlindIds.value = availableBlinds.value.map(b => b.id)
  detectedCustoms.value.forEach(c => {
    config.legend.customItems[c.id] = true
  })
})

watch(activeTab, (newTab) => {
  if (newTab === 'layers') config.mode = 'layers'
  if (newTab === 'blinds') config.mode = 'blinds'
})

// Profile Logic
const savedProfiles = ref([])
const newProfileName = ref('')
function loadProfiles() {
  const raw = localStorage.getItem('k9_print_profiles')
  if (raw) savedProfiles.value = JSON.parse(raw)
}
function saveProfile() {
  if (!newProfileName.value) return
  savedProfiles.value.push({ id: Date.now(), name: newProfileName.value, config: JSON.parse(JSON.stringify(config)) })
  localStorage.setItem('k9_print_profiles', JSON.stringify(savedProfiles.value))
  newProfileName.value = ''
}
function applyProfile(profile) {
  Object.assign(config, JSON.parse(JSON.stringify(profile.config)))
  if (config.mode === 'layers') activeTab.value = 'layers'
  if (config.mode === 'blinds') activeTab.value = 'blinds'
}
function deleteProfile(id) {
  savedProfiles.value = savedProfiles.value.filter(p => p.id !== id)
  localStorage.setItem('k9_print_profiles', JSON.stringify(savedProfiles.value))
}
onMounted(loadProfiles)

function toggleAllBlinds() {
  selectedBlindIds.value = (selectedBlindIds.value.length === availableBlinds.value.length) 
    ? [] : availableBlinds.value.map(b => b.id)
}

function handlePrint() {
  const payload = {
    mode: config.mode,
    layout: config.layout,
    orientation: config.orientation,
    overlayAll: config.overlayAll,
    copies: config.copies, // [NEW]
    hides: { mode: config.hides.mode },
    legend: { ...config.legend, customDefinitions: detectedCustoms.value },
    selectedBlindIds: selectedBlindIds.value
  }
  if (config.mode === 'layers') {
    payload.layers = Object.entries(config.layers).filter(([_, a]) => a).map(([k]) => parseInt(k))
  }
  emit('confirm', payload)
  emit('close')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-window">
      
      <div class="modal-header">
        <div class="title-block">
          <h3>Print Map</h3>
          <span class="subtitle">{{ store.mapName }}</span>
        </div>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <div class="tabs">
        <button :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">General</button>
        <button :class="{ active: activeTab === 'legend' }" @click="activeTab = 'legend'">Legend</button>
        <button :class="{ active: activeTab === 'layers' }" @click="activeTab = 'layers'">Print Layers</button>
        <button :class="{ active: activeTab === 'blinds' }" @click="activeTab = 'blinds'">Print Blinds</button>
        <!--button :class="{ active: activeTab === 'profiles' }" @click="activeTab = 'profiles'">Profiles</button-->
      </div>

      <div class="modal-body">
        
        <div v-if="activeTab === 'general'" class="tab-pane">
          <div class="control-group">
            <label>Orientation</label>
            <div class="radio-cards">
              <label class="card" :class="{ active: config.orientation === 'landscape' }">
                <input type="radio" v-model="config.orientation" value="landscape">
                <span class="icon">↔</span> <span>Landscape</span>
              </label>
              <label class="card" :class="{ active: config.orientation === 'portrait' }">
                <input type="radio" v-model="config.orientation" value="portrait">
                <span class="icon">↕</span> <span>Portrait</span>
              </label>
            </div>
          </div>
          <div class="control-group">
            <label>Layout</label>
            <div class="radio-cards">
              <label class="card" :class="{ active: config.layout === 'full' }">
                <input type="radio" v-model="config.layout" value="full">
                <span class="icon">📄</span> <span>Full Page</span>
              </label>
              <label class="card" :class="{ active: config.layout === 'half' }">
                <input type="radio" v-model="config.layout" value="half">
                <span class="icon">⊟</span> <span>Half Page</span>
              </label>
              <label class="card" :class="{ active: config.layout === 'quarter' }">
                <input type="radio" v-model="config.layout" value="quarter">
                <span class="icon">田</span> <span>Quarter Page</span>
              </label>
            </div>
          </div>
          
          <div class="split-row">
            <div class="control-group half">
              <label>Copies per Item</label>
              <div class="input-wrapper">
                <input type="number" v-model.number="config.copies" min="1" max="50">
              </div>
              <small class="hint">Useful for grid layouts</small>
            </div>
            <div class="control-group half">
              <label class="checkbox-row" style="margin-top: 25px;">
                <input type="checkbox" v-model="config.overlayAll">
                <span><strong>Ghost Overlay</strong></span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'layers'" class="tab-pane">
          <div class="sub-group">
            <label class="sub-label">Select Layers</label>
            <div class="checkbox-list">
              <label class="checkbox-row"><input type="checkbox" v-model="config.layers[1]"> Layer 1</label>
              <label class="checkbox-row" :class="{ disabled: !hasLayer2 }">
                <input type="checkbox" v-model="config.layers[2]" :disabled="!hasLayer2"> Layer 2
              </label>
              <label class="checkbox-row" :class="{ disabled: !hasLayer3 }">
                <input type="checkbox" v-model="config.layers[3]" :disabled="!hasLayer3"> Layer 3
              </label>
            </div>
            <label class="sub-label" style="margin-top:15px">Include (Legacy/Quick) Hides?</label>
            <div class="radio-row">
              <label><input type="radio" v-model="config.hides.mode" value="none"> No</label>
              <label><input type="radio" v-model="config.hides.mode" value="quick"> Yes (Icons)</label>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'blinds'" class="tab-pane">
           <div class="toolbar">
              <button @click="toggleAllBlinds" class="btn-xs">
                {{ selectedBlindIds.length === availableBlinds.length ? 'None' : 'All' }}
              </button>
              <span class="count">{{ selectedBlindIds.length }} / {{ availableBlinds.length }}</span>
            </div>
            <div class="blind-list">
              <label v-for="blind in availableBlinds" :key="blind.id" class="blind-item">
                <input type="checkbox" v-model="selectedBlindIds" :value="blind.id">
                <span class="blind-name">{{ blind.name }}</span>
                <span class="blind-info">{{ blind.randoms.join('-') }}</span>
              </label>
            </div>
            <div v-if="availableBlinds.length === 0">
                <p>Sorry, you haven't set up blinds yet!</p> <p> Hit the <b>🏆 Full Blinds</b> button on the Editor Sidebar to get started. </p>
            </div>
        </div>

        <div v-if="activeTab === 'legend'" class="tab-pane">
          <p class="help-text">Select items to display in the key:</p>
          <div class="checkbox-grid">
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showStats"> Stats</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showBales"> Bales</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showHides"> Hides</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showWalls"> Walls</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showFence"> Fence</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showTunnels"> Boards</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showTunnelBox"> Tunnel Box</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showGate"> Gate</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showStep"> Step</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showLeaners"> Leaners</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showAnchors"> Anchors</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showStartBox"> Start Box</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showDCMat"> DC Mat</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showObstruction"> Obstruction</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showDeadZone"> Dead Zone</label>
          </div>

          <div v-if="detectedCustoms.length > 0" class="custom-section">
            <div class="divider"></div>
            <p class="help-text">Custom Styles:</p>
            <div class="checkbox-grid">
              <label v-for="c in detectedCustoms" :key="c.id" class="checkbox-row">
                <input type="checkbox" v-model="config.legend.customItems[c.id]">
                <span class="color-dot" :style="{ background: c.style.fillColor || '#ccc', border: c.style.strokeColor ? `2px solid ${c.style.strokeColor}` : '1px solid #333' }"></span>
                <span>{{ c.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'profiles'" class="tab-pane">
           <div class="input-group">
            <input type="text" v-model="newProfileName" placeholder="Profile Name">
            <button @click="saveProfile" :disabled="!newProfileName" class="btn-sm">Save</button>
          </div>
          <div class="profile-list">
             <div v-for="p in savedProfiles" :key="p.id" class="profile-item">
               <span>{{ p.name }}</span>
               <div class="p-actions">
                 <button @click="applyProfile(p)" class="btn-xs load">Load</button>
                 <button @click="deleteProfile(p.id)" class="btn-xs delete">×</button>
               </div>
             </div>
          </div>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button class="btn-primary" @click="handlePrint" :disabled="activeTab === 'blinds' && selectedBlindIds.length === 0">
          {{ printButtonLabel }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Previous Styles + New Input Styles */
.split-row { display: flex; gap: 15px; }
.half { flex: 1; }
.input-wrapper input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.hint { font-size: 10px; color: #888; font-style: italic; }

/* ... (All existing styles) ... */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.modal-window { background: white; width: 500px; max-width: 95%; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; }
.modal-header { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; }
.title-block h3 { margin: 0; font-size: 18px; color: #2c3e50; }
.subtitle { font-size: 12px; color: #666; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; line-height: 1; }
.tabs { display: flex; border-bottom: 1px solid #eee; background: white; }
.tabs button { flex: 1; padding: 12px; border: none; background: none; font-weight: 500; color: #666; cursor: pointer; border-bottom: 3px solid transparent; }
.tabs button:hover { background: #f8f9fa; }
.tabs button.active { color: #2196f3; border-bottom-color: #2196f3; }
.modal-body { padding: 20px; min-height: 300px; }
.tab-pane { animation: fadeIn 0.2s; }
.control-group { margin-bottom: 20px; }
.control-group label { display: block; font-size: 12px; font-weight: bold; color: #666; margin-bottom: 8px; text-transform: uppercase; }
.radio-cards { display: flex; gap: 10px; }
.card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; transition: all 0.2s; text-align: center; }
.card:hover { border-color: #bbb; }
.card.active { border-color: #2196f3; background: #e3f2fd; color: #1565c0; }
.card input { display: none; }
.icon { font-size: 20px; }
.checkbox-row { display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 4px; }
.checkbox-row:hover { background: #f5f5f5; }
.checkbox-row.disabled { opacity: 0.5; pointer-events: none; }
.sub-group { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-top: 10px; }
.sub-label { font-size: 11px; color: #888; margin-bottom: 8px; display: block; font-weight: bold; text-transform: uppercase; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
.count { font-size: 11px; color: #666; }
.blind-list { max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; margin-bottom: 15px; }
.blind-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.blind-item:last-child { border-bottom: none; }
.blind-item:hover { background: #f0f7ff; }
.blind-name { font-weight: bold; font-size: 13px; flex: 1; }
.blind-info { font-family: monospace; font-size: 12px; color: #666; }
.modal-footer { padding: 15px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; align-items: center; gap: 10px; background: #f8f9fa; }
.btn-secondary { background: white; border: 1px solid #ddd; color: #333; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.btn-primary { background: #2196f3; border: none; color: white; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.custom-section { margin-top: 15px; }
.divider { height: 1px; background: #eee; margin: 10px 0; }
.color-dot { width: 12px; height: 12px; display: inline-block; margin-right: 5px; }
.profile-list { max-height: 220px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; }
.profile-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
.btn-xs { border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; }
.btn-xs.load { background: #e3f2fd; color: #1976d2; }
.btn-xs.delete { background: #ffebee; color: #c62828; }
.input-group { display: flex; gap: 8px; margin-bottom: 15px; }
.btn-sm { padding: 0 12px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; }
.blind-btn {padding: 10px;
  border: 1px solid #eee;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  font-size: 0.9rem;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
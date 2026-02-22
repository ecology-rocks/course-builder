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
  copies: 1, 
  
  layers: { 1: true, 2: false, 3: false },
  hides: { mode: 'none' },

  legend: {
    showStats: true,
    showBales: true,
    showHides: true,
    showWalls: true,
    showFence: true,
    showTunnels: true,     // Boards
    showTunnelPaths: true, // [NEW] Tunnel Paths
    showTunnelStats: true,
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

const printButtonClass = computed(() => {
  if (activeTab.value === 'blinds' || config.mode === 'blinds') {
    return 'btn-purple'
  }
  return 'btn-primary'
})

// [UPDATED] Scans for Tunnels and Lines
const detectedCustoms = computed(() => {
  const customs = []
  const seen = new Set()

  const scan = (collection, typeLabel, isLine = false) => {
    if (!collection) return
    const items = Array.isArray(collection) ? collection : [collection]
    
    items.forEach(item => {
      let fill = null, stroke = null, dashStyle = 'solid'

      // Handle Tunnel Paths (Line Objects)
      if (isLine) {
        stroke = item.custom?.strokeColor || item.style?.color || 'blue'
        const d = item.custom?.dash || item.style?.dash || [10, 5]
        if (d.length > 0) dashStyle = (d[0] === 2) ? 'dotted' : 'dashed'
        fill = 'transparent' // Lines don't have fill
        if (typeLabel === 'Tunnel Path' && stroke === 'blue' && dashStyle === 'dashed') {
          return
        }
      } 
      // Handle Standard Objects (Rects)
      else {
        if (item.custom) { fill = item.custom.fillColor; stroke = item.custom.strokeColor } 
        else { fill = item.fillColor; stroke = item.strokeColor || item.color }
      }

      // If it has a relevant style, add it
      if (fill || stroke) {
         // Create unique signature including dash style
         const sig = JSON.stringify({ f: fill, s: stroke, d: dashStyle, t: typeLabel })
         
         if (!seen.has(sig)) {
           seen.add(sig)
           customs.push({
             id: sig,
             label: item.label || item.name || `Custom ${typeLabel}`,
             isLine,
             style: { 
               fillColor: fill, 
               strokeColor: stroke,
               dashStyle
             }
           })
         }
      }
    })
  }

  scan(store.bales, "Bale")
  scan(store.customWalls, "Wall")
  scan(store.tunnelBoards, "Board")
  // [CRITICAL] This requires store.tunnelPaths to be exported from mapStore.js
  scan(store.tunnelPaths, "Tunnel Path", true) 
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
  
  // Auto-select all detected customs
  detectedCustoms.value.forEach(c => {
    config.legend.customItems[c.id] = true
  })
})

watch(activeTab, (newTab) => {
  if (newTab === 'layers') config.mode = 'layers'
  if (newTab === 'blinds') config.mode = 'blinds'
})

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
    copies: config.copies,
    hides: { mode: config.hides.mode },
    legend: { ...config.legend, customDefinitions: detectedCustoms.value },
    selectedBlindIds: selectedBlindIds.value,
    judgeNotes: store.judgeNotes
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
        <button :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">Notes</button>
        <button 
          class="tab-action layers-mode"
          :class="{ active: activeTab === 'layers' }" 
          @click="activeTab = 'layers'"
        >Print Layers</button>
        
        <button 
          class="tab-action blinds-mode"
          :class="{ active: activeTab === 'blinds' }" 
          @click="activeTab = 'blinds'"
        >Print Blinds</button>
      </div>

      <div class="modal-body">
        <div v-if="activeTab === 'general'" class="tab-pane">
            <div class="info-box"><span class="icon">ℹ️</span>These settings apply to both the Print Layers and Print Blinds workflows. </div>
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
              <small class="hint">Useful for half- and quarter- page layouts. Each layer or blind will duplicate itself by this number of copies. E.g., Layer 1 four times, then Layer 2 four times, to facilitate double sided course maps for course builders or other needs. Use your printer's "Copies" feature to print sequentially (Layer 1 then Layer 2, repeat).</small>
            </div>
            <div class="control-group half">
              <label class="checkbox-row" style="margin-top: 25px;">
                <input type="checkbox" v-model="config.overlayAll">
                <span><strong>Ghost Overlay</strong></span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'notes'" class="tab-pane">
          <div class="info-box">
            <span class="icon">ℹ️</span>
            These notes are saved with the map and will appear below the legend on Full Page prints.
          </div>
          <div class="control-group">
            <label>Judge's Notes</label>
            <textarea 
              v-model="store.judgeNotes" 
              rows="8" 
              placeholder="Enter course time, special rules, or reminders..."
              class="notes-input"
            ></textarea>
          </div>
          <div v-if="config.layout !== 'full'" class="warning-box">
            ⚠️ You currently have "{{ config.layout }}" layout selected. These notes will NOT appear on grid layouts.
          </div>
        </div>

        <div v-if="activeTab === 'layers'" class="tab-pane">
            <div class="info-box"><span class="icon">ℹ️</span>This print button prints your layers individually for course builders. It ignores your blinds settings.</div>
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
            <label class="sub-label" style="margin-top:15px">Include Quick Hides?</label>
            <div class="radio-row">
              <label><input type="radio" v-model="config.hides.mode" value="none"> No</label>
              <label><input type="radio" v-model="config.hides.mode" value="quick"> Yes (Icons)</label>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'blinds'" class="tab-pane">
            <div class="info-box"><span class="icon">ℹ️</span>Print your blinds on an overlaid map (all 2 or 3 layers). This print button ignores any settings on the "Print Layers" tab. </div>
           <div class="toolbar">
              <button @click="toggleAllBlinds" class="btn-xs">
                {{ selectedBlindIds.length === availableBlinds.length ? 'Select None' : 'Select All' }}
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
        </div>

        <div v-if="activeTab === 'legend'" class="tab-pane">
            <div class="info-box"><span class="icon">ℹ️</span>Select items to display in the key.</div>
          
          <div class="checkbox-grid">
            <label class="checkbox-row highlight-row"><input type="checkbox" v-model="config.legend.showTunnelStats"> Tunnel Lengths</label>
            <label class="checkbox-row highlight-row"><input type="checkbox" v-model="config.legend.showStats">Bale Stats</label>
          </div>
          <div class="divider"></div>
          <div class="checkbox-grid">
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showTunnelPaths"> Tunnel Paths</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showTunnels"> Board Edges</label>
          </div>
          <div class="divider"></div>
          <div class="checkbox-grid">
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showBales"> Bales</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showLeaners"> Leaners</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showAnchors"> Anchors</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showHides"> Hides</label>
          </div>
          <div class="divider"></div>
          <div class="checkbox-grid">
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showWalls"> Walls</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showFence"> Fence</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showGate"> Gate</label>
</div>
          <div class="divider"></div>
          <div class="checkbox-grid">
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showStep"> Step</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showStartBox"> Start Box</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showDCMat"> DC Mat</label>
                        <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showTunnelBox"> Support Boards</label>
</div>
          <div class="divider"></div>
          <div class="checkbox-grid">
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showObstruction"> Obstruction</label>
            <label class="checkbox-row"><input type="checkbox" v-model="config.legend.showDeadZone"> Dead Zone</label>
          </div>

          <div v-if="detectedCustoms.length > 0" class="custom-section">
            <div class="divider"></div>
            <div class="checkbox-grid">
              <label v-for="c in detectedCustoms" :key="c.id" class="checkbox-row">
                <input type="checkbox" v-model="config.legend.customItems[c.id]">
                
                <span v-if="c.isLine" class="line-dot" 
                  :style="{ 
                    borderColor: c.style.strokeColor, 
                    borderStyle: c.style.dashStyle 
                  }">
                </span>
                
                <span v-else class="color-dot" 
                  :style="{ 
                    background: c.style.fillColor || '#ccc', 
                    border: c.style.strokeColor ? `2px solid ${c.style.strokeColor}` : '1px solid #333' 
                  }">
                </span>
                
                <span>{{ c.label }}</span>
              </label>
            </div>
          </div>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button 
          :class="printButtonClass" 
          @click="handlePrint" 
          :disabled="activeTab === 'blinds' && selectedBlindIds.length === 0"
        >
          {{ printButtonLabel }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* (Existing styles...) */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.modal-window { background: white; width: 500px; max-width: 95%; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 90vh; /* [FIX] Limit height */ }
.modal-header { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; flex-shrink: 0; }
.title-block h3 { margin: 0; font-size: 18px; color: #2c3e50; }
.subtitle { font-size: 12px; color: #666; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; line-height: 1; }

.tabs { display: flex; border-bottom: 1px solid #eee; background: white; flex-shrink: 0; }
.tabs button { flex: 1; padding: 12px; border: none; background: none; font-weight: 500; color: #666; cursor: pointer; border-bottom: 3px solid transparent; }
.tabs button:hover { background: #f8f9fa; }
.tabs button.active { color: #2196f3; border-bottom-color: #2196f3; }
.tabs button.tab-action { font-weight: bold; }
.tabs button.layers-mode { color: #555; }
.tabs button.layers-mode:hover { background: #e3f2fd; color: #1976d2; }
.tabs button.layers-mode.active { color: #1976d2; border-bottom-color: #1976d2; background: #e3f2fd50; }
.tabs button.blinds-mode { color: #555; }
.tabs button.blinds-mode:hover { background: #f3e5f5; color: #9c27b0; }
.tabs button.blinds-mode.active { color: #9c27b0; border-bottom-color: #9c27b0; background: #f3e5f550; }

.modal-body { 
  padding: 20px; 
  flex: 1; /* Take remaining space */
  overflow-y: auto; /* [FIX] Enable Scrolling */
}

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
.modal-footer { padding: 15px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; align-items: center; gap: 10px; background: #f8f9fa; flex-shrink: 0; }
.btn-secondary { background: white; border: 1px solid #ddd; color: #333; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.btn-primary { background: #2196f3; border: none; color: white; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.btn-purple { background: #9c27b0; border: none; color: white; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-purple:hover { background: #7b1fa2; }
.btn-purple:disabled { background: #ccc; cursor: not-allowed; }

.checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.custom-section { margin-top: 15px; }
.divider { height: 1px; background: #eee; margin: 10px 0; }
.color-dot { width: 12px; height: 12px; display: inline-block; margin-right: 5px; }
.line-dot { width: 20px; height: 0; border-bottom-width: 2px; display: inline-block; margin-right: 5px; }
.highlight-row { background-color: #e3f2fd; }

.input-group { display: flex; gap: 8px; margin-bottom: 15px; }
.input-group input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.btn-sm { padding: 0 12px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; }
.split-row { display: flex; gap: 15px; }
.half { flex: 1; }
.input-wrapper input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.hint { font-size: 10px; color: #888; font-style: italic; }
.info-box { background-color: #e3f2fd; border: 1px solid #90caf9; color: #1565c0; padding: 10px 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; line-height: 1.4; display: flex; align-items: flex-start; gap: 10px; }
.info-box .icon { font-size: 16px; line-height: 1; flex-shrink: 0; }
.notes-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; resize: vertical; font-size: 14px; line-height: 1.5; box-sizing: border-box; }
.notes-input:focus { outline: none; border-color: #2196f3; }
.warning-box { background: #fff3e0; color: #e65100; padding: 12px; border-radius: 6px; margin-top: 15px; font-size: 13px; border: 1px solid #ffe0b2; font-weight: bold; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
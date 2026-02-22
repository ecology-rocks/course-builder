<script setup>
import { computed, ref, watch } from 'vue' // [UPDATE] Added watch
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()
const unit = ref('feet') 

const isOpen = computed(() => store.showCustomizationModal)
const selectionId = computed(() => store.editingCustomObject)

// Lookup
const selection = computed(() => store.findObjectById(selectionId.value))
const selectedObject = computed(() => selection.value?.item)
const type = computed(() => selection.value?.type)

// --- FEATURE FLAGS ---
// [UPDATE] Exclude 'customWalls' from generic flags to prevent double rendering
const hasDimensions = computed(() => 
  ['bales', 'dcMats', 'steps', 'tunnelBoards', 'zones'].includes(type.value)
)
const hasFill = computed(() => 
  ['bales', 'dcMats', 'steps', 'notes', 'zones', 'tunnelBoards', 'startBox'].includes(type.value)
)
const hasText = computed(() => 
  ['notes'].includes(type.value)
)
// Only Tunnels use the generic stroke width (Walls have their own section now)
const hasStrokeWidth = computed(() => 
  ['tunnelPaths'].includes(type.value)
)
// Tunnels only (Walls excluded)
const hasStroke = computed(() => 
  ['tunnelPaths'].includes(type.value) || (!['customWalls'].includes(type.value)) // Catch-all for borders
)
const hasDash = computed(() => 
  ['tunnelPaths'].includes(type.value) || (!['customWalls'].includes(type.value))
)

const isWall = computed(() => type.value === 'customWalls')

// --- HELPERS ---
function close() {
  store.showCustomizationModal = false
  store.editingCustomObject = null
}

function ensureCustom() {
  if (selectedObject.value && !selectedObject.value.custom) {
    selectedObject.value.custom = {}
  }
  
  // [INSERT] Ensure nested structure for Walls
  if (isWall.value) {
    if (!selectedObject.value.custom.wall) {
      selectedObject.value.custom.wall = { strokeColor: '#000000', strokeWidth: 6, dash: [] }
    }
    if (!selectedObject.value.custom.fence) {
      selectedObject.value.custom.fence = { strokeColor: '#000000', strokeWidth: 2, dash: [] }
    }
  }
}

// Watch selection to initialize defaults immediately
watch(selectedObject, () => {
  if (selectedObject.value) ensureCustom()
}, { immediate: true })


// --- GENERIC ADAPTERS (Keep existing for Tunnels/Bales) ---
const activeDashStyle = computed({
  get: () => {
    const c = selectedObject.value?.custom
    if (!c) return 'solid'
    if (Array.isArray(c.dash)) {
      if (c.dash.length === 0) return 'solid'
      return c.dash[0] === 2 ? 'dotted' : 'dashed'
    }
    return c.borderStyle || 'solid'
  },
  set: (val) => {
    ensureCustom()
    const c = selectedObject.value.custom
    if (type.value === 'tunnelPaths') {
      if (val === 'solid') c.dash = []
      if (val === 'dashed') c.dash = [10, 5]
      if (val === 'dotted') c.dash = [2, 5]
    } else {
      c.borderStyle = val
    }
  }
})

// [INSERT] Specific Adapters for Wall Segments
function useWallStyle(subType) {
  const getObj = () => selectedObject.value?.custom?.[subType]
  
  const color = computed({
    get: () => getObj()?.strokeColor || '#000000',
    set: (v) => { ensureCustom(); selectedObject.value.custom[subType].strokeColor = v }
  })
  
  const width = computed({
    get: () => getObj()?.strokeWidth || (subType === 'wall' ? 6 : 2),
    set: (v) => { ensureCustom(); selectedObject.value.custom[subType].strokeWidth = parseInt(v) }
  })

  const style = computed({
    get: () => {
      const d = getObj()?.dash || []
      if (d.length === 0) return 'solid'
      return d[0] === 2 ? 'dotted' : 'dashed'
    },
    set: (v) => {
      ensureCustom()
      let d = []
      if (v === 'dashed') d = [10, 5]
      if (v === 'dotted') d = [2, 5]
      selectedObject.value.custom[subType].dash = d
    }
  })

  return { color, width, style }
}

// Create the composables
const wallStyle = useWallStyle('wall')
const fenceStyle = useWallStyle('fence')


// --- DIMENSIONS (Keep existing) ---
function useDimension(key) {
  return computed({
    get: () => {
      const val = selectedObject.value?.custom?.[key]
      if (val == null || val === '') return null
      return unit.value === 'inches' ? parseFloat((val * 12).toFixed(2)) : parseFloat(val.toFixed(2))
    },
    set: (val) => {
      if (!selectedObject.value) return
      ensureCustom()
      selectedObject.value.custom[key] = (val === null || val === '') 
        ? null 
        : (unit.value === 'inches' ? val / 12 : val)
    }
  })
}
const dimL = useDimension('length')
const dimW = useDimension('width')
const dimH = useDimension('height')
const inputStep = computed(() => unit.value === 'feet' ? 0.1 : 1)
const unitLabel = computed(() => unit.value === 'feet' ? 'ft' : 'in')

function resetToDefault() {
  if (!selectedObject.value) return
  if (type.value === 'customWalls') {
    selectedObject.value.custom = {
      wall: { strokeColor: '#000000', strokeWidth: 6, dash: [] },
      fence: { strokeColor: '#000000', strokeWidth: 2, dash: [] }
    }
  } else {
    // ... other resets ...
    selectedObject.value.custom = {}
  }
}

const displayType = computed(() => {
  if (!type.value) return 'Object'
  if (type.value === 'customWalls') return 'Wall/Ring'
  if (type.value === 'tunnelPaths') return 'Tunnel Path'
  return type.value.charAt(0).toUpperCase() + type.value.slice(1, -1)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen && selectedObject" class="modal-overlay" @click.self="close">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Customize {{ displayType }}</h3>
          <div class="unit-toggle" v-if="hasDimensions">
             <button :class="{ active: unit === 'feet' }" @click="unit = 'feet'">ft</button>
             <button :class="{ active: unit === 'inches' }" @click="unit = 'inches'">in</button>
          </div>
        </div>
        <hr />

        <div class="form-container">
          
          <div v-if="isWall">
            <div class="section-title">🧱 Solid Wall Style</div>
            <div class="form-group">
              <label>Color</label>
              <input type="color" v-model="wallStyle.color.value" />
            </div>
            <div class="form-group">
              <label>Width ({{ wallStyle.width.value }}px)</label>
              <input type="range" min="1" max="20" v-model="wallStyle.width.value" />
            </div>
            <div class="form-group">
              <label>Style</label>
              <select v-model="wallStyle.style.value">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>

            <div class="section-title">🚧 Fence Style</div>
            <div class="form-group">
              <label>Color</label>
              <input type="color" v-model="fenceStyle.color.value" />
            </div>
            <div class="form-group">
              <label>Width ({{ fenceStyle.width.value }}px)</label>
              <input type="range" min="1" max="10" v-model="fenceStyle.width.value" />
            </div>
            <div class="form-group">
              <label>Style</label>
              <select v-model="fenceStyle.style.value">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>

          <div v-else>
            <div class="section-title" v-if="hasStroke || hasFill">Appearance</div>
            
            <div v-if="hasStroke" class="form-group">
              <label>{{ type === 'tunnelPaths' ? 'Line Color' : 'Border Color' }}</label>
              <input 
                type="color" 
                :value="selectedObject.custom?.strokeColor || '#000000'"
                @input="e => { ensureCustom(); selectedObject.custom.strokeColor = e.target.value }" 
              />
            </div>

            <div v-if="hasDash" class="form-group">
              <label>Style</label>
              <select v-model="activeDashStyle">
                <option value="solid">Solid ────</option>
                <option value="dashed">Dashed ╌╌╌╌</option>
                <option value="dotted">Dotted ····</option>
              </select>
            </div>

            <div v-if="hasStrokeWidth" class="form-group">
              <label>Thickness ({{ selectedObject.custom?.strokeWidth || 2 }}px)</label>
              <input 
                type="range" min="1" max="10" 
                :value="selectedObject.custom?.strokeWidth || 2"
                @input="e => { ensureCustom(); selectedObject.custom.strokeWidth = parseInt(e.target.value) }"
              />
            </div>

            <div v-if="hasFill" class="form-group">
              <label>Fill Color</label>
              <div class="color-row">
                <input 
                  type="color" 
                  :value="selectedObject.custom?.fillColor && selectedObject.custom.fillColor !== 'transparent' ? selectedObject.custom.fillColor : '#ffffff'" 
                  @input="e => { ensureCustom(); selectedObject.custom.fillColor = e.target.value }"
                  :disabled="selectedObject.custom?.fillColor === 'transparent'"
                />
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    :checked="selectedObject.custom?.fillColor === 'transparent'"
                    @change="e => { ensureCustom(); selectedObject.custom.fillColor = e.target.checked ? 'transparent' : '#ffffff' }"
                  >
                  Transparent
                </label>
              </div>
            </div>
          </div>

          <div v-if="hasDimensions">
            <div class="section-title">Dimensions</div>
            <div class="form-group">
              <label>Length ({{ unitLabel }})</label>
              <input type="number" v-model.number="dimL" placeholder="Default" :step="inputStep" />
            </div>
            <div class="form-group">
              <label>Width ({{ unitLabel }})</label>
              <input type="number" v-model.number="dimW" placeholder="Default" :step="inputStep" />
            </div>
            <div class="form-group">
              <label>Height ({{ unitLabel }})</label>
              <input type="number" v-model.number="dimH" placeholder="Default" :step="inputStep" />
            </div>
          </div>

          <div v-if="hasText">
             <div class="section-title">Text</div>
             <div class="form-group">
                <label>Label</label>
                <input type="text" :value="selectedObject.custom?.textValue || selectedObject.text" 
                       @input="e => { ensureCustom(); selectedObject.custom.textValue = e.target.value }" />
             </div>
             <div class="form-group">
                <label>Font Size</label>
                <input type="number" :value="selectedObject.custom?.fontSize || 14" 
                       @input="e => { ensureCustom(); selectedObject.custom.fontSize = parseInt(e.target.value) }" />
             </div>
          </div>

        </div>

        <div class="modal-actions">
          <button @click="resetToDefault" class="btn-secondary">Reset Defaults</button>
          <button @click="close" class="btn-primary">Done</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Keep existing styles */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.modal-content { background: white; padding: 24px; border-radius: 12px; width: 340px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.unit-toggle { display: flex; background: #f0f0f0; border-radius: 6px; padding: 2px; border: 1px solid #ddd; }
.unit-toggle button { background: none; border: none; padding: 4px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; color: #666; }
.unit-toggle button.active { background: white; color: #2196f3; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.form-container { margin: 15px 0; max-height: 450px; overflow-y: auto; }
.section-title { font-size: 11px; text-transform: uppercase; color: #888; margin: 15px 0 8px 0; font-weight: bold; letter-spacing: 0.5px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
.form-group { margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
.form-group input[type="text"], .form-group input[type="number"] { width: 110px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
.color-row { display: flex; align-items: center; gap: 8px; }
.checkbox-label { font-size: 12px; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
.btn-primary { background: #00a1ff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: #f5f5f5; color: #444; border: 1px solid #ddd; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style>
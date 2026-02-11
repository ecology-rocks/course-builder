<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()

const isOpen = computed(() => store.showCustomizationModal)
const selectedId = computed(() => store.editingCustomObject)

// Local UI State
const unit = ref('feet') // 'feet' | 'inches'

const selectedObject = computed(() => {
  if (!selectedId.value) return null
  return store.hides.find(h => h.id === selectedId.value) ||
    store.bales?.find(b => b.id === selectedId.value) ||
    store.dcMats?.find(m => m.id === selectedId.value) ||
    store.steps?.find(s => s.id === selectedId.value) ||
    store.notes?.find(n => n.id === selectedId.value) ||
    store.zones?.find(z => z.id === selectedId.value) ||
    store.tunnelBoards?.find(t => t.id === selectedId.value) ||
    (store.startBox && store.startBox.id === selectedId.value ? store.startBox : null)
})

function close() {
  store.showCustomizationModal = false
  store.editingCustomObject = null
}

function resetToDefault() {
  if (!selectedObject.value || !selectedObject.value.custom) return
  const current = selectedObject.value.custom
  const newCustom = {}

  // Dimensions
  if ('width' in current) newCustom.width = null
  if ('height' in current) newCustom.height = null
  if ('length' in current) newCustom.length = null

  // Colors & Styles
  if ('fillColor' in current) newCustom.fillColor = null
  if ('strokeColor' in current) newCustom.strokeColor = null
  if ('textValue' in current) newCustom.textValue = 'New Note'
  if ('textColor' in current) newCustom.textColor = null
  if ('fontSize' in current) newCustom.fontSize = 14
  if ('borderStyle' in current) newCustom.borderStyle = 'solid'

  selectedObject.value.custom = newCustom
}

// --- UNIT CONVERSION HELPERS ---

function useDimension(key) {
  return computed({
    get: () => {
      const val = selectedObject.value?.custom?.[key]
      if (val == null || val === '') return null
      if (unit.value === 'inches') {
        return parseFloat((val * 12).toFixed(2))
      }
      return parseFloat(val.toFixed(2))
    },
    set: (val) => {
      if (!selectedObject.value?.custom) return
      if (val === null || val === '') {
        selectedObject.value.custom[key] = null
        return
      }
      if (unit.value === 'inches') {
        selectedObject.value.custom[key] = val / 12
      } else {
        selectedObject.value.custom[key] = val
      }
    }
  })
}

const customLength = useDimension('length')
const customWidth = useDimension('width')
const customHeight = useDimension('height')

const inputStep = computed(() => unit.value === 'feet' ? 0.1 : 1)
const unitLabel = computed(() => unit.value === 'feet' ? 'ft' : 'in')

// [FIX] Helper to safely get hex colors for inputs
// <input type="color"> throws warnings if value is "transparent" or null
function safeColor(val, fallback = '#ffffff') {
  if (!val || val === 'transparent') return fallback
  return val
}

</script>

<template>
  <div v-if="isOpen && selectedObject" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Customize Object</h3>
        
        <div class="unit-toggle">
           <button :class="{ active: unit === 'feet' }" @click="unit = 'feet'">ft</button>
           <button :class="{ active: unit === 'inches' }" @click="unit = 'inches'">in</button>
        </div>
      </div>
      <hr />

      <div class="form-container">
        
        <div v-if="'length' in selectedObject.custom" class="form-group">
          <label>Length ({{ unitLabel }})</label>
          <input type="number" v-model.number="customLength" placeholder="Default" :step="inputStep" />
        </div>

        <div v-if="'width' in selectedObject.custom" class="form-group">
          <label>Width ({{ unitLabel }})</label>
          <input type="number" v-model.number="customWidth" placeholder="Default" :step="inputStep" />
        </div>

        <div v-if="'height' in selectedObject.custom" class="form-group">
          <label>Height ({{ unitLabel }})</label>
          <input type="number" v-model.number="customHeight" placeholder="Default" :step="inputStep" />
        </div>

        <div class="type-specific-section">
          <div v-if="'textValue' in selectedObject.custom" class="form-group">
            <label>Label Text</label>
            <input type="text" v-model="selectedObject.custom.textValue" />
          </div>

          <div v-if="'fontSize' in selectedObject.custom" class="form-group">
            <label>Font Size</label>
            <input type="number" v-model.number="selectedObject.custom.fontSize" />
          </div>

          <div v-if="'fillColor' in selectedObject.custom" class="form-group">
            <label>Fill Color</label>
            <div class="color-row">
              <input 
                type="color" 
                :value="safeColor(selectedObject.custom.fillColor, '#ffffff')" 
                @input="e => selectedObject.custom.fillColor = e.target.value"
                :disabled="selectedObject.custom.fillColor === 'transparent'"
              />
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  :checked="selectedObject.custom.fillColor === 'transparent'"
                  @change="e => selectedObject.custom.fillColor = e.target.checked ? 'transparent' : '#ffffff'"
                >
                Transparent
              </label>
            </div>
          </div>

          <div v-if="'strokeColor' in selectedObject.custom" class="form-group">
            <label>Border Color</label>
            <input 
              type="color" 
              :value="safeColor(selectedObject.custom.strokeColor, '#000000')" 
              @input="e => selectedObject.custom.strokeColor = e.target.value" 
            />
          </div>

          <div v-if="'borderStyle' in selectedObject.custom" class="form-group">
            <label>Border Style</label>
            <select v-model="selectedObject.custom.borderStyle">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
            </select>
          </div>

          <div v-if="'textColor' in selectedObject.custom" class="form-group">
            <label>Text Color</label>
            <input 
              type="color" 
              :value="safeColor(selectedObject.custom.textColor, '#000000')"
              @input="e => selectedObject.custom.textColor = e.target.value" 
            />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="resetToDefault" class="btn-secondary">Reset Defaults</button>
        <button @click="close" class="btn-primary">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 20px; border-radius: 12px; width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 { margin: 0; font-size: 1.1rem; }

/* Unit Toggle Styles */
.unit-toggle {
  display: flex;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 2px;
  border: 1px solid #ddd;
}
.unit-toggle button {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 4px;
  color: #666;
  font-weight: 500;
}
.unit-toggle button.active {
  background: white;
  color: #2196f3;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.form-container { margin: 15px 0; max-height: 400px; overflow-y: auto; }
.form-group { margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.form-group label { font-size: 14px; color: #444; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-primary { background: #00a1ff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-secondary { background: #eee; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.form-group input[type="text"], .form-group input[type="number"], .form-group select { width: 100px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; }

/* [NEW STYLES] */
.color-row { display: flex; align-items: center; gap: 10px; }
.checkbox-label { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; cursor: pointer; }
input[type="color"] { border: none; width: 40px; height: 30px; padding: 0; cursor: pointer; background: none; }
input[type="color"]:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
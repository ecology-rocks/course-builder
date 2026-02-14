<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()
const isOpen = computed(() => store.showCustomizationModal)
const selectedId = computed(() => store.editingCustomObject)
const unit = ref('feet') 

// Identify type based on store arrays to handle missing JSON properties
const isBale = computed(() => store.bales?.some(b => b.id === selectedId.value))
const isNote = computed(() => store.notes?.some(n => n.id === selectedId.value))

const selectedObject = computed(() => {
  if (!selectedId.value) return null
  const obj = store.hides?.find(h => h.id === selectedId.value) ||
    store.bales?.find(b => b.id === selectedId.value) ||
    store.dcMats?.find(m => m.id === selectedId.value) ||
    store.steps?.find(s => s.id === selectedId.value) ||
    store.notes?.find(n => n.id === selectedId.value) ||
    store.zones?.find(z => z.id === selectedId.value) ||
    store.tunnelBoards?.find(t => t.id === selectedId.value) ||
    (store.startBox?.id === selectedId.value ? store.startBox : null)

  if (obj && !obj.custom) {
    obj.custom = {}
  }
  return obj
})

function hasProp(prop) {
  if (!selectedObject.value) return false
  // Check custom object, then base object
  return (selectedObject.value.custom && prop in selectedObject.value.custom) || (prop in selectedObject.value)
}

function close() {
  store.showCustomizationModal = false
  store.editingCustomObject = null
}

function resetToDefault() {
  if (!selectedObject.value) return
  const obj = selectedObject.value
  const newCustom = {}

  // Bales and objects with existing width/height should have these reset options
  if (hasProp('width') || isBale.value) newCustom.width = null
  if (hasProp('height') || isBale.value) newCustom.height = null
  if (hasProp('length') || isBale.value) newCustom.length = null

  newCustom.fillColor = null
  newCustom.strokeColor = null
  newCustom.borderStyle = 'solid'

  if (hasProp('textValue') || 'text' in obj || isNote.value) {
    newCustom.textValue = obj.text || obj.custom?.textValue || 'New Note'
    newCustom.fontSize = 14
    newCustom.textColor = null
  }

  selectedObject.value.custom = newCustom
}

function useDimension(key) {
  return computed({
    get: () => {
      const val = selectedObject.value?.custom?.[key]
      if (val == null || val === '') return null
      return unit.value === 'inches' ? parseFloat((val * 12).toFixed(2)) : parseFloat(val.toFixed(2))
    },
    set: (val) => {
      if (!selectedObject.value) return
      if (!selectedObject.value.custom) selectedObject.value.custom = {}
      selectedObject.value.custom[key] = (val === null || val === '') 
        ? null 
        : (unit.value === 'inches' ? val / 12 : val)
    }
  })
}

const customLength = useDimension('length')
const customWidth = useDimension('width')
const customHeight = useDimension('height')

const inputStep = computed(() => unit.value === 'feet' ? 0.1 : 1)
const unitLabel = computed(() => unit.value === 'feet' ? 'ft' : 'in')
const safeColor = (val, fallback = '#ffffff') => (!val || val === 'transparent') ? fallback : val
</script>

<template>
  <Teleport to="body">
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
          <div v-if="isBale || hasProp('length')" class="form-group">
            <label>Length ({{ unitLabel }})</label>
            <input type="number" v-model.number="customLength" placeholder="Default" :step="inputStep" />
          </div>

          <div v-if="isBale || hasProp('width')" class="form-group">
            <label>Width ({{ unitLabel }})</label>
            <input type="number" v-model.number="customWidth" placeholder="Default" :step="inputStep" />
          </div>

          <div v-if="isBale || hasProp('height')" class="form-group">
            <label>Height ({{ unitLabel }})</label>
            <input type="number" v-model.number="customHeight" placeholder="Default" :step="inputStep" />
          </div>

          <div class="type-specific-section" v-if="selectedObject.custom">
            <div v-if="isNote || hasProp('textValue') || 'text' in selectedObject" class="form-group">
              <label>Label Text</label>
              <input type="text" v-model="selectedObject.custom.textValue" />
            </div>

            <div v-if="isNote || hasProp('fontSize') || 'fontSize' in selectedObject" class="form-group">
              <label>Font Size</label>
              <input type="number" v-model.number="selectedObject.custom.fontSize" />
            </div>

            <div class="form-group">
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

            <div class="form-group">
              <label>Border Color</label>
              <input 
                type="color" 
                :value="safeColor(selectedObject.custom.strokeColor, '#000000')" 
                @input="e => selectedObject.custom.strokeColor = e.target.value" 
              />
            </div>

            <div class="form-group">
              <label>Border Style</label>
              <select v-model="selectedObject.custom.borderStyle">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
              </select>
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
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.modal-content { background: white; padding: 24px; border-radius: 12px; width: 340px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.unit-toggle { display: flex; background: #f0f0f0; border-radius: 6px; padding: 2px; border: 1px solid #ddd; }
.unit-toggle button { background: none; border: none; padding: 4px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; color: #666; }
.unit-toggle button.active { background: white; color: #2196f3; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.form-container { margin: 15px 0; max-height: 450px; overflow-y: auto; }
.form-group { margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
.form-group input { width: 110px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
.color-row { display: flex; align-items: center; gap: 8px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
.btn-primary { background: #00a1ff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: #f5f5f5; color: #444; border: 1px solid #ddd; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style>
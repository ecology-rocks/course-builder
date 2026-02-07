<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()

const isOpen = computed(() => store.showCustomizationModal)
const selectedId = computed(() => store.editingCustomObject)

// Find the object in the store based on the ID
const selectedObject = computed(() => {
  if (!selectedId.value) return null

  // Check generic arrays
  const foundInArray = store.hides.find(h => h.id === selectedId.value) ||
    store.bales?.find(b => b.id === selectedId.value) ||
    store.dcMats?.find(m => m.id === selectedId.value) ||
    store.steps?.find(s => s.id === selectedId.value) ||
    store.notes?.find(n => n.id === selectedId.value) ||
    store.zones?.find(z => z.id === selectedId.value)

  if (foundInArray) return foundInArray

  // [NEW] Check Singleton Objects (Start Box)
  // We check if store.startBox exists AND matches the ID
  if (store.startBox && store.startBox.id === selectedId.value) {
    return store.startBox
  }

  return null
})



function close() {
  store.showCustomizationModal = false
  store.editingCustomObject = null
}


function resetToDefault() {
  if (!selectedObject.value || !selectedObject.value.custom) return

  const current = selectedObject.value.custom
  const newCustom = {}

  // 1. Dimensions (If present)
  if ('width' in current) newCustom.width = null
  if ('height' in current) newCustom.height = null

  // 2. Colors (If present)
  if ('fillColor' in current) newCustom.fillColor = null
  if ('strokeColor' in current) newCustom.strokeColor = null
  
  // 3. Text (If present)
  if ('textValue' in current) newCustom.textValue = null
  if ('textColor' in current) newCustom.textColor = null

  // 4. Styles (If present)
  // 'borderStyle' usually defaults to 'solid' rather than null
  if ('borderStyle' in current) newCustom.borderStyle = 'solid'

  // Update the object in the store
  selectedObject.value.custom = newCustom
}
</script>

<template>
  <div v-if="isOpen && selectedObject" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3>Customize Object</h3>
      <hr />

      <div class="form-container">
        <div v-if="'width' in selectedObject.custom" class="form-group">
          <label>Width (feet)</label>
          <input type="number" v-model.number="selectedObject.custom.width" placeholder="Default" />
        </div>

        <div v-if="'height' in selectedObject.custom" class="form-group">
          <label>Height (feet)</label>
          <input type="number" v-model.number="selectedObject.custom.height" placeholder="Default" />
        </div>

        <div class="type-specific-section">
          <div v-if="'textValue' in selectedObject.custom" class="form-group">
            <label>Label Text</label>
            <input type="text" v-model="selectedObject.custom.textValue" placeholder="Text" />
          </div>

          <div v-if="'fillColor' in selectedObject.custom" class="form-group">
            <label>Fill Color</label>
            <input type="color" v-model="selectedObject.custom.fillColor" />
          </div>

          <div v-if="'strokeColor' in selectedObject.custom" class="form-group">
            <label>Border Color</label>
            <input type="color" v-model="selectedObject.custom.strokeColor" />
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
            <input type="color" v-model="selectedObject.custom.textColor" />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="resetToDefault" class="btn-secondary">Reset to Defaults</button>
        <button @click="close" class="btn-primary">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
  width: 300px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.form-container {
  margin: 15px 0;
  max-height: 400px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-group label {
  font-size: 14px;
  color: #444;
}

.form-group input[type="number"] {
  width: 80px;
  padding: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  background: #00a1ff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: #eee;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  width: 100px;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
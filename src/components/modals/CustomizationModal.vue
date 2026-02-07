<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()

const isOpen = computed(() => store.showCustomizationModal)
const selectedId = computed(() => store.editingCustomObject)

// Find the object in the store based on the ID
const selectedObject = computed(() => {
  if (!selectedId.value) return null
  // Search through different collections (hides, bales, etc.)
  return store.hides.find(h => h.id === selectedId.value) || 
         store.bales?.find(b => b.id === selectedId.value)
})

function close() {
  store.showCustomizationModal = false
  store.editingCustomObject = null
}

function resetToDefault() {
  if (selectedObject.value) {
    selectedObject.value.custom = {
      width: null,
      height: null,
      fillColor: null,
      strokeColor: null,
      borderStyle: 'solid',
      textColor: '#000000'
    }
  }
}
</script>

<template>
  <div v-if="isOpen && selectedObject" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3>Customize Object</h3>
      <hr />

      <div class="form-container">
        <div class="form-group">
          <label>Width (px)</label>
          <input type="number" v-model.number="selectedObject.custom.width" placeholder="Default" />
        </div>
        <div class="form-group">
          <label>Height (px)</label>
          <input type="number" v-model.number="selectedObject.custom.height" placeholder="Default" />
        </div>

        <div v-if="selectedObject.type" class="type-specific-section">
          <div class="form-group">
            <label>Fill Color</label>
            <input type="color" v-model="selectedObject.custom.fillColor" />
          </div>

          <div class="form-group">
            <label>Border Color</label>
            <input type="color" v-model="selectedObject.custom.strokeColor" />
          </div>

          <div class="form-group">
            <label>Border Style</label>
            <select v-model="selectedObject.custom.borderStyle">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
            </select>
          </div>

          <div class="form-group">
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
  top: 0; left: 0;
  width: 100%; height: 100%;
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
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
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
.form-group label { font-size: 14px; color: #444; }
.form-group input[type="number"] { width: 80px; padding: 4px; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.btn-primary { background: #00a1ff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-secondary { background: #eee; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
</style>
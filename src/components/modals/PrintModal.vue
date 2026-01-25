<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const emit = defineEmits(['close', 'confirm'])
const store = useMapStore()

// 1. Detect Active Layers
const hasLayer2 = computed(() => store.bales.some(b => b.layer === 2))
const hasLayer3 = computed(() => store.bales.some(b => b.layer === 3))

// 2. Form State
const selectedLayers = ref({
  1: true,
  2: hasLayer2.value,
  3: hasLayer3.value
})

const includeHides = ref(true)
const layout = ref('full') // 'full' or 'quarter'

function handlePrint() {
  // Convert object {1: true, 2: false} to array [1]
  const layersToPrint = Object.entries(selectedLayers.value)
    .filter(([_, active]) => active)
    .map(([layer]) => parseInt(layer))

  emit('confirm', {
    layers: layersToPrint,
    withHides: includeHides.value,
    layout: layout.value
  })
  emit('close')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Print Map</h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <div class="options-grid">
        <div class="section">
          <h4>Select Layers</h4>
          <label class="checkbox-row">
            <input type="checkbox" v-model="selectedLayers[1]" />
            Layer 1 (Base)
          </label>
          
          <label class="checkbox-row" :class="{ disabled: !hasLayer2 }">
            <input type="checkbox" v-model="selectedLayers[2]" :disabled="!hasLayer2" />
            Layer 2
            <span v-if="!hasLayer2" class="pill">Empty</span>
          </label>
          
          <label class="checkbox-row" :class="{ disabled: !hasLayer3 }">
            <input type="checkbox" v-model="selectedLayers[3]" :disabled="!hasLayer3" />
            Layer 3
            <span v-if="!hasLayer3" class="pill">Empty</span>
          </label>
        </div>

        <div class="section">
          <h4>Options</h4>
          <label class="checkbox-row">
            <input type="checkbox" v-model="includeHides" />
            Show Hides (Rats/Litter)
          </label>
        </div>

        <div class="section">
          <h4>Layout</h4>
          <div class="radio-group">
            <label class="radio-card" :class="{ active: layout === 'full' }">
              <input type="radio" v-model="layout" value="full" />
              <div class="icon">📄</div>
              <span>Full Page</span>
              <small>Standard Judge's Map</small>
            </label>

            <label class="radio-card" :class="{ active: layout === 'quarter' }">
              <input type="radio" v-model="layout" value="quarter" />
              <div class="icon">田</div>
              <span>Quarter Page</span>
              <small>4 Copies (For Helpers)</small>
            </label>
          </div>
        </div>
      </div>

      <div class="actions">
        <button @click="handlePrint" class="btn-primary">🖨️ Print Now</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 2000;
}

.modal-content {
  background: white; padding: 25px; border-radius: 8px;
  width: 90%; max-width: 500px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;
}

.options-grid {
  display: flex; flex-direction: column; gap: 20px; margin-bottom: 25px;
}

.section h4 { margin: 0 0 10px 0; color: #555; font-size: 0.9rem; text-transform: uppercase; }

.checkbox-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer;
}
.checkbox-row.disabled { opacity: 0.5; cursor: not-allowed; }

.pill {
  background: #eee; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; color: #777;
}

/* Radio Cards */
.radio-group { display: flex; gap: 10px; }
.radio-card {
  flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px;
  cursor: pointer; text-align: center; transition: all 0.2s;
  display: flex; flex-direction: column; align-items: center;
}
.radio-card input { display: none; }
.radio-card.active { border-color: #2196f3; background: #e3f2fd; }
.radio-card .icon { font-size: 1.5rem; margin-bottom: 5px; }
.radio-card small { font-size: 0.7rem; color: #666; margin-top: 4px; }

.actions { display: flex; justify-content: flex-end; }
.btn-primary {
  background: #2196f3; color: white; border: none; padding: 10px 20px;
  border-radius: 4px; font-weight: bold; cursor: pointer;
}
.btn-primary:hover { background: #1976d2; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; }
</style>
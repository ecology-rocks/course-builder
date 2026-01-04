# Barn Hunt Rules

## Debugging View

<script setup>
import { onMounted, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore.js'
import BarnHuntLayer from '@/components/layers/BarnHuntLayer.vue'

const store = useMapStore()
const isReady = ref(false)

onMounted(() => {
  // 1. DEFINE BALE SIZES (Crucial Fix)
  // The component calculates dimensions based on these global settings
  store.baleConfig = {
    length: 3,  // 3 grid units (approx 3 ft)
    width: 1.5, // 1.5 grid units
    height: 1   // 1 grid unit
  }

  // 2. Define Grid Settings
  store.ringDimensions = { width: 10, height: 10 }
  store.currentLayer = 2 // Ensure we can see Layer 1
  store.selection = []   // Prevent "undefined" errors on selection checks

  // 3. Add Bales
  store.bales = [
    { id: 'b1', x: 2, y: 2, rotation: 0, orientation: 'flat', layer: 1, supported: true },
    { id: 'b2', x: 6, y: 2, rotation: 90, orientation: 'tall', layer: 1, supported: true },
    { id: 'b3', x: 2, y: 5, rotation: 0, orientation: 'pillar', layer: 2, supported: true }
  ]
  
  isReady.value = true
})
</script>

<div class="debug-panel">
  <p><strong>Store Ready:</strong> {{ isReady }}</p>
  <p><strong>Bale Count:</strong> {{ store.bales.length }}</p>
</div>

<div class="controls">
  <button @click="store.currentLayer = 1" :class="{ active: store.currentLayer === 1 }">Layer 1</button>
  <button @click="store.currentLayer = 2" :class="{ active: store.currentLayer === 2 }">Layer 2</button>
</div>

<style>
.controls { margin-bottom: 10px; }
button { 
  padding: 5px 10px; 
  margin-right: 5px; 
  border: 1px solid #ccc; 
  background: white; 
  cursor: pointer;
}
button.active { 
  background: #2196f3; 
  color: white; 
  border-color: #1976d2; 
}
</style>

<v-stage :config="{ width: 400, height: 300 }">
<v-layer>
<v-circle :config="{ x: 50, y: 50, radius: 20, fill: 'red' }"></v-circle>
<BarnHuntLayer :scale="30" :GRID_OFFSET="10" />
</v-layer>
</v-stage>

<style>
.debug-panel {
  padding: 10px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  margin-bottom: 10px;
  border-radius: 4px;
}
</style>
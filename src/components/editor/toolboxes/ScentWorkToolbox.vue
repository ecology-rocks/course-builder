<script setup>
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()
</script>

<template>
  <div class="toolbox">
    <h3>Elements</h3>
    <div class="tool-grid">
      <button @click="store.setTool('box')" :class="{ active: store.activeTool === 'box' }">📦 Box</button>
      <button @click="store.setTool('luggage')" :class="{ active: store.activeTool === 'luggage' }">🧳 Luggage</button>
      <button @click="store.setTool('container')" :class="{ active: store.activeTool === 'container' }">🗑️ Cont.</button>
      <button @click="store.setTool('cone')" :class="{ active: store.activeTool === 'cone' }">⚠️ Cone</button>
      <button @click="store.setTool('vehicle')" :class="{ active: store.activeTool === 'vehicle' }">🚗 Vehicle</button>
      <button @click="store.setTool('buried')" :class="{ active: store.activeTool === 'buried' }">🏖️ Buried</button>
    </div>
    
    <h3>Tools</h3>
    <div class="tool-grid">
       <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Tape/Wall</button>
       <button @click="store.setTool('hot')" :class="{ active: store.activeTool === 'hot' }">🔥 Mark Hot</button>
       <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete</button>
    </div>
  </div>
</template>

<style scoped>
.toolbox { margin-bottom: 20px; }
.toolbox h3 { font-size: 0.9rem; text-transform: uppercase; color: #888; margin: 15px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }

.tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

button { padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; text-align: left; transition: all 0.2s; font-size: 0.9rem; }
button:hover { background: #f5f5f5; }
button.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; }
</style>
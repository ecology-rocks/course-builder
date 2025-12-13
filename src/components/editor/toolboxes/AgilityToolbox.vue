<script setup>
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()
</script>

<template>
  <div class="toolbox">
    <h3>Obstacles</h3>
    <div class="tool-grid">
      <button @click="store.setTool('jump')" :class="{ active: store.activeTool === 'jump' }">🚧 Jump</button>
      <button @click="store.setTool('tunnel')" :class="{ active: store.activeTool === 'tunnel' }">🚇 Tunnel</button>
      <button @click="store.setTool('weave')" :class="{ active: store.activeTool === 'weave' }">💈 Weaves</button>
      <button @click="store.setTool('table')" :class="{ active: store.activeTool === 'table' }">🟨 Table</button>
    </div>
    
    <h3>Contacts</h3>
    <div class="tool-grid">
      <button @click="store.setTool('dogwalk')" :class="{ active: store.activeTool === 'dogwalk' }">🚶 DogWalk</button>
      <button @click="store.setTool('aframe')" :class="{ active: store.activeTool === 'aframe' }">🔺 A-Frame</button>
      <button @click="store.setTool('teeter')" :class="{ active: store.activeTool === 'teeter' }">⚖️ Teeter</button>
    </div>

    <h3>Actions</h3>
    <div class="action-tools">
      <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">🔄 Rotate</button>
      <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }">📐 Shape</button>
      
      <div class="renumber-group">
        <button @click="store.setTool('renumber')" :class="{ active: store.activeTool === 'renumber' }">
          🔢 123
        </button>
        <input 
          v-if="store.activeTool === 'renumber'" 
          type="number" 
          v-model="store.nextNumber" 
          class="num-input" 
        />
      </div>

      <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete</button>
    </div>
  </div>
</template>

<style scoped>
.toolbox { margin-bottom: 20px; }
.toolbox h3 { font-size: 0.9rem; text-transform: uppercase; color: #888; margin: 15px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }

.tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.action-tools { display: flex; flex-direction: column; gap: 8px; }

.renumber-group { display: flex; gap: 5px; }
.renumber-group button { flex: 1; }
.num-input { width: 40px; padding: 5px; text-align: center; border: 1px solid #2196f3; border-radius: 4px; font-weight: bold; }

button { padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; text-align: left; transition: all 0.2s; font-size: 0.9rem; }
button:hover { background: #f5f5f5; }
button.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; }
</style>
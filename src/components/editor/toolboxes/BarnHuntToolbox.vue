<script setup>
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()
</script>

<template>
  <div class="toolbox">
    <h3>Layers</h3>
    <div class="layer-controls">
      <button @click="store.currentLayer = 1" :class="{ active: store.currentLayer === 1 }">1</button>
      <button @click="store.currentLayer = 2" :class="{ active: store.currentLayer === 2 }">2</button>
      <button @click="store.currentLayer = 3" :class="{ active: store.currentLayer === 3 }">3</button>
    </div>

    <div class="panel" v-if="store.sport === 'barnhunt'">
      <h3>📊 Statistics</h3>
      <div class="stats-grid">
        <div class="stat-box">
          <span class="label">Total</span>
          <span class="value">{{ store.inventory.total }}</span>
        </div>
        <div class="stat-box">
          <span class="label">Base</span>
          <span class="value">{{ store.inventory.base }}</span>
        </div>
        <div class="stat-box">
          <span class="label">Layer 2</span>
          <span class="value">{{ store.inventory.layer2 }}</span>
        </div>
        <div class="stat-box">
          <span class="label">Layer 3</span>
          <span class="value">{{ store.inventory.layer3 }}</span>
        </div>
      </div>
      
      <div class="nesting-info" :class="{ valid: store.inventory.isNestingValid }">
         <small>Class Change: <strong>{{ store.inventory.deltaString }}</strong> bales</small>
      </div>
    </div>

    <h3>Place Items</h3>
    <div class="tool-grid">
      <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }">📦 Bale</button>
      <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Tunnel Board</button>
      <button @click="store.setTool('startbox')" :class="{ active: store.activeTool === 'startbox' }">🏁 Start</button>
      <button @click="store.setTool('hide')" :class="{ active: store.activeTool === 'hide' }">🐀 Hide</button>
      <button @click="store.setTool('dcmat')" :class="{ active: store.activeTool === 'dcmat' }">🟨 Mat</button>
    </div>

    <h3>Actions</h3>
    <div class="action-tools">
      <button @click="store.setTool('select')" :class="{ active: store.activeTool === 'select' }">⬜ Select Area (Click + Drag)</button>
      
      <button 
        v-if="store.selection.length > 1" 
        @click="store.rotateSelection()" 
        style="background: #e8f5e9; color: #2e7d32; border-color: #a5d6a7;"
      >
        🔄 Rotate Group (90°)
      </button>

      <button 
        v-if="store.selection.length > 0" 
        @click="store.deleteSelection()" 
        style="background: #ffebee; color: #c62828; border-color: #ef9a9a; font-weight: bold;"
      >
        🗑️ Delete Selected ({{ store.selection.length }})
      </button>

      <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">🔄 Rotate Item (Right Click)</button>
      <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }">📐 Orientation (Alt+Click)</button>
      <button @click="store.setTool('lean')" :class="{ active: store.activeTool === 'lean' }">↗️ Lean (Ctrl+Click)</button>
      <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete Tool (Double Click)</button>
    </div>
  </div>
</template>

<style scoped>
.toolbox { margin-bottom: 20px; }
.toolbox h3 { font-size: 0.9rem; text-transform: uppercase; color: #888; margin: 15px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }

.layer-controls { display: flex; gap: 5px; margin-bottom: 10px; }
.layer-controls button { flex: 1; padding: 8px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; font-weight: bold; }
.layer-controls button.active { background: #2196f3; color: white; border-color: #1976d2; }

.tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.action-tools { display: flex; flex-direction: column; gap: 8px; }

button { padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; text-align: left; transition: all 0.2s; font-size: 0.9rem; }
button:hover { background: #f5f5f5; }
button.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.stat-box { background: white; border: 1px solid #ddd; padding: 5px; border-radius: 4px; text-align: center; }
.stat-box .label { display: block; font-size: 0.7rem; color: #888; text-transform: uppercase; }
.stat-box .value { display: block; font-size: 1.1rem; font-weight: bold; color: #333; }
.nesting-info { font-size: 0.8rem; color: #666; text-align: center; padding-top: 5px; border-top: 1px solid #eee; }
</style>
<script setup>
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()
</script>

<template>
  <div class="toolbox">
    <div class="tool-section">
      <h3>Structures</h3>
      <div class="tool-grid">
        <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }">📦 Bale</button>
        <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Board</button>
        <button @click="store.setTool('gate')" :class="{ active: store.activeTool === 'gate' }">🚪 Gate</button>
        <button @click="store.setTool('dcmat')" :class="{ active: store.activeTool === 'dcmat' }">🟨 Mat</button>
      </div>
    </div>

    <div class="tool-section">
      <h3>Markers</h3>
      <div class="tool-grid">
        <button @click="store.setTool('startbox')" :class="{ active: store.activeTool === 'startbox' }">🏁 Start</button>
        <button @click="store.setTool('hide')" :class="{ active: store.activeTool === 'hide' }">🐀 Hide</button>
        <button @click="store.setTool('step')" :class="{ active: store.activeTool === 'step' }">🪜 Step</button>
        <button @click="store.setTool('measure')" :class="{ active: store.activeTool === 'measure' }">📏 Measure</button>
      </div>
    </div>

    <div class="tool-section">
      <h3>Zones</h3>
      <div class="tool-grid">
        <button @click="store.setTool('dead')" :class="{ active: store.activeTool === 'dead' }">🚫 Dead Zone</button>
        <button @click="store.setTool('obstruction')" :class="{ active: store.activeTool === 'obstruction' }">🧱 Obstruction</button>
      </div>
    </div>

    <div class="tool-section">
      <h3>Tools</h3>
      <div class="list-tools">
        <button @click="store.setTool('select')" :class="{ active: store.activeTool === 'select' }">
          ⬜ Select (Click + Drag)
        </button>
        <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">
          🗑️ Delete Tool
        </button>
        <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">
          🔄 Rotate Item
        </button>
        <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }">
          📐 Orientation Tool
        </button>
        <button @click="store.setTool('lean')" :class="{ active: store.activeTool === 'lean' }">
          ↗️ Lean Tool
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbox {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
}

.tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.list-tools {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

button {
  padding: 10px;
  border: 1px solid #eee;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

button:hover {
  background: #fafafa;
  border-color: #ccc;
  transform: translateY(-1px);
}

button.active {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1565c0;
  font-weight: bold;
  box-shadow: inset 0 0 0 1px #2196f3;
}
</style>
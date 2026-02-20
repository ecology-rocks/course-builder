<script setup>
import { computed } from 'vue'
import { useMapStore } from 'stores/mapStore'
import IconLine from '@/assets/icons/measure-line.svg?component'
import IconPath from '@/assets/icons/measure-path.svg?component' 
import IconBale from '@/assets/icons/bale-icon.svg?component'
const store = useMapStore()
const emit = defineEmits(['tool-select', 'blind-setup'])


import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore()
const isBeta = userStore.isBeta
const hasBaleSelected = computed(() => {
  return store.selection.some(id => store.bales.some(b => b.id === id))
})

function handleOrient() {
  if (hasBaleSelected) {
    store.cycleOrientation() // Trigger immediate action on selection
  } else {
    store.setTool('type')    // Activate tool for manual clicking
  }
}


function startTunnelMode() {
  store.isTunnelMode = true
  store.setTool('tunnel_edges') // Default to step 1
  store.closeAllMenus()
}

function handleLean() {
  if (hasBaleSelected.value) {
    store.cycleLean()        // Trigger immediate action on selection
  } else {
    store.setTool('lean')    // Activate tool for manual clicking
  }
}
</script>

<template>
  <div class="toolbox">
    <div class="tool-section" v-if="store.currentLayer === 1">
      <h3>Walls & Zones</h3>
      <div class="tool-grid">
        <button @click="store.setTool('wall')" :class="{ active: store.activeTool === 'wall' }">
          🧱 Ring Shape
        </button>
        <button @click="store.setTool('gate')" :class="{ active: store.activeTool === 'gate' }">🚪 Gate</button>
        <button @click="store.setTool('dead')" :class="{ active: store.activeTool === 'dead' }">🚫 Dead Zone</button>
        <button @click="store.setTool('obstruction')" :class="{ active: store.activeTool === 'obstruction' }">🧱
          Obstruction</button>
          
      </div>
      
    </div>


    <div class="tool-section">
      <h3>Bales & Modifiers</h3>
      <div class="tool-grid">
        <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }"><IconBale class="tool-icon" /> Bale</button>
        <button @click="store.toggleAnchor()" :disabled="!hasBaleSelected"
          :style="{ opacity: hasBaleSelected ? 1 : 0.5 }">
          ⚓Mark Anchor
        </button>
        <button @click="handleOrient" :class="{ active: store.activeTool === 'type' }">
          📐 Orient
        </button>
        <button @click="handleLean" :class="{ active: store.activeTool === 'lean' }">
          ↗️ Lean
        </button>
        
        <!--button @click="store.setTool('anchor')" :class="{ active: store.activeTool === 'anchor' }">
          ⚓ Mark Lines
        </button-->
      </div>
    </div>
    <div class="tool-section">
      <h3>Other Objects</h3>
      <div class="tool-grid">
        <button @click="store.setTool('step')" :class="{ active: store.activeTool === 'step' }">🪜 Step</button>
        <button @click="store.setTool('tunnelboard')" :class="{ active: store.activeTool === 'tunnelboard' }">🟥 Board
          </button>
      </div>
      <div class="tool-grid" v-if="store.currentLayer === 1">
        <button @click="store.setTool('startbox')" :class="{ active: store.activeTool === 'startbox' }">🏁Start</button>
        <button @click="store.setTool('dcmat')" :class="{ active: store.activeTool === 'dcmat' }">🟨 DC Mat</button>
      </div>

    </div>

    

    <div class="tool-section">
      <h3>Managers</h3>
      <div class="tool-grid">
        
        <button class="tool-btn action-btn span-full" @click="$emit('blind-setup')" title="Create and manage multiple blinds and hides.">🏆 Blinds / Hides </button>
          <button @click="startTunnelMode" class="span-full">🚇 Tunnels ✨Beta✨</button>

      </div>
    </div>

    <div class="tool-section">
      <h3>Annotations</h3>
      <div class="tool-grid">
        <button @click="store.setTool('measure')" :class="{ active: store.activeTool === 'measure' }">
          <IconLine class="tool-icon" /> Line
        </button>
        <button @click="store.setTool('measurePath')" :class="{ active: store.activeTool === 'measurePath' }">
          <IconPath class="tool-icon" /> Path
        </button>
        <button @click="store.setTool('note')" :class="{ active: store.activeTool === 'note' }" class="span-full">📝 Note (N) </button>
      </div>
    </div>

    <div class="tool-section">
      <h3>Legacy Tools</h3>
      <div class="tool-grid">
        <button @click="store.setTool('hide')" :class="{ active: store.activeTool === 'hide' }" title="Use for one blind only.">🐀 Quick Hide</button>
        <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Board Line</button>
      </div>
    </div>


    <div class="tool-section">
      <h3>Misc. Tools</h3>
      <div class="tool-grid">
        <button @click="store.setTool('select')" :class="{ active: store.activeTool === 'select' }">
          👆 Select (V)
        </button>
        <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">
          🔄 Rotate (R)
        </button>

        

        <button @click="store.copySelection()">
          🗐 Copy
        </button>
        <button @click="store.pasteSelection()">
          📋 Paste
        </button>

        <button @click="store.cutSelection()">
          ✂️ Cut
        </button>
        <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">
          🗑️ Delete
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

.span-full {
  grid-column: 1 / -1; /* Spans from the first line to the very last line */
  justify-content: center;
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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
.tool-icon {
  /* 1em makes it exactly the same height as the text */
  width: 18px; 
  height: 18px;
  
  /* Optional: Push it down slightly if it feels "high" compared to text */
  /* vertical-align: -0.125em; */

}
</style>
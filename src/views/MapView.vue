<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { auth } from '../firebase' // <--- Add this

const route = useRoute()
const loading = ref(true)
const error = ref(null)

// Local state
const mapData = ref(null)
const currentLayer = ref(1) // Default to Layer 1
const scale = 40
const GRID_OFFSET = 30

// --- 1. VISUAL HELPERS (Copied from Editor) ---

const hatchPattern = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 20; canvas.height = 20
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillRect(0,0,20,20)
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, 0); ctx.stroke()
  return canvas
})()

const pillarPattern = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 20; canvas.height = 20
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillRect(0,0,20,20)
  ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 20); ctx.moveTo(20, 0); ctx.lineTo(0, 20); ctx.stroke()
  return canvas
})()

function getBaleColor(layer) {
  switch(layer) {
    case 1: return '#e6c200'
    case 2: return '#4caf50' 
    case 3: return '#2196f3' 
    return '#ccc'
  }
}

function getOpacity(layer) {
  // In View Mode, we dim other layers significantly so the active one pops
  if (layer === currentLayer.value) return 1
  return 0.3 
}

function getBaleDims(bale) {
  if (bale.orientation === 'pillar') return { width: 1.5, height: 1.0 }
  if (bale.orientation === 'tall') return { width: 3.0, height: 1.0 }
  return { width: 3.0, height: 1.5 }
}

function getArrowPoints(width, height, direction) {
  const cx = width / 2
  const cy = height / 2
  const size = Math.min(width, height) * 0.4
  switch (direction) {
    case 'top':    return [cx, cy + size, cx, cy - size]
    case 'bottom': return [cx, cy - size, cx, cy + size]
    case 'left':   return [cx + size, cy, cx - size, cy]
    case 'right':  return [cx - size, cy, cx + size, cy]
    default: return []
  }
}

// --- 2. COMPUTED DATA ---

const stageConfig = computed(() => {
  if (!mapData.value) return { width: 300, height: 300 }
  // Calculate size based on map dimensions + gutter
  return {
    width: (mapData.value.dimensions.width * scale) + (GRID_OFFSET * 2),
    height: (mapData.value.dimensions.height * scale) + (GRID_OFFSET * 2)
  }
})

// Sort and filter bales exactly like the editor
const visibleBales = computed(() => {
  if (!mapData.value || !mapData.value.bales) return []
  
  // We show ALL layers in View mode (ghosted), but sort them correctly
  return mapData.value.bales.slice().sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer
    const aIsLeaner = a.lean !== null
    const bIsLeaner = b.lean !== null
    if (aIsLeaner && !bIsLeaner) return 1
    if (!aIsLeaner && bIsLeaner) return -1
    return 0
  })
})

// --- 3. FETCH DATA ---

onMounted(async () => {
  const mapId = route.params.id
  if (!mapId) {
    error.value = "No map ID provided."
    loading.value = false
    return
  }

  try {
    const docRef = doc(db, "maps", mapId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const fullDoc = docSnap.data()
      
      // 1. OWNER CHECK (The "Gotcha" Fix)
      // If the map is NOT shared, but we can see it, we must be the owner.
      if (!fullDoc.isShared) {
        const currentUid = auth.currentUser ? auth.currentUser.uid : null
        
        // If we are the owner, show a warning so they know it's still private
        if (currentUid === fullDoc.uid) {
          alert("⚠️ NOTE: This map is currently PRIVATE.\n\nYou can see this because you are the owner, but the public link will NOT work for others until you click 'Share' in the editor.")
        } else {
          // If we aren't the owner (and rules failed), block access manually
          error.value = "This map is private."
          return
        }
      }

      // 2. SECURITY: Strip Hides (Rat/Litter)
      // We delete this array so the dots never render for course builders
      if (fullDoc.data.hides) {
        fullDoc.data.hides = [] 
      }
      
      // 3. Load the Map
      mapData.value = fullDoc.data
    } else {
      error.value = "Map not found."
    }
  } catch (e) {
    console.error(e)
    // If Firestore Security Rules block the read (because it's private and user is anon),
    // it jumps straight here.
    error.value = "This map is private or deleted."
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="viewer-container">
    
    <div v-if="loading" class="state-msg">
      <div class="spinner"></div>
      <p>Loading Map...</p>
    </div>

    <div v-else-if="error" class="state-msg error">
      <h3>⚠️ Error</h3>
      <p>{{ error }}</p>
      <button @click="$router.push('/')">Go Home</button>
    </div>
    
    <div v-else class="content">
      
      <div class="view-header">
        <div class="map-title">
          <strong>{{ mapData.name || 'Untitled Map' }}</strong>
        </div>
        <div class="layer-toggles">
          <button v-for="i in 3" :key="i" @click="currentLayer = i" :class="{ active: currentLayer === i }">
            L{{ i }}
          </button>
        </div>
      </div>

      <div class="canvas-scroll">
        <v-stage :config="stageConfig">
          <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
            
            <v-line v-for="n in mapData.dimensions.width + 1" :key="'v'+n" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, mapData.dimensions.height * scale], stroke: (n-1)%5===0?'#ccc':'#eee', strokeWidth: 1 }" />
            <v-line v-for="n in mapData.dimensions.height + 1" :key="'h'+n" :config="{ points: [0, (n-1)*scale, mapData.dimensions.width * scale, (n-1)*scale], stroke: (n-1)%5===0?'#ccc':'#eee', strokeWidth: 1 }" />

            <v-group v-if="mapData.startBox" :config="{ x: mapData.startBox.x * scale, y: mapData.startBox.y * scale }">
              <v-rect :config="{ width: 4 * scale, height: 4 * scale, stroke: '#9c27b0', strokeWidth: 4, fill: 'rgba(156, 39, 176, 0.1)', cornerRadius: 2 }" />
              <v-text :config="{ text: 'START', fontSize: 14, fontStyle: 'bold', fill: '#9c27b0', width: 4 * scale, padding: 5, align: 'center', y: (4 * scale) / 2 - 7 }" />
            </v-group>

            <v-group v-for="mat in mapData.dcMats" :key="mat.id" :config="{ x: mat.x * scale, y: mat.y * scale, rotation: mat.rotation, offsetX: (2 * scale) / 2, offsetY: (3 * scale) / 2 }">
              <v-rect :config="{ width: 2 * scale, height: 3 * scale, stroke: '#ff9800', strokeWidth: 3, fill: 'rgba(255, 152, 0, 0.2)', cornerRadius: 2, dash: [10, 5] }" />
              <v-text :config="{ text: 'DC', fontSize: 16, fontStyle: 'bold', fill: '#e65100', width: 2 * scale, padding: 0, align: 'center', y: (3 * scale) / 2 - 8 }" />
            </v-group>

            <v-group
              v-for="bale in visibleBales"
              :key="bale.id"
              :config="{
                x: (bale.x * scale) + (1.5 * scale),
                y: (bale.y * scale) + (0.75 * scale),
                rotation: bale.rotation,
                opacity: getOpacity(bale.layer),
                offsetX: 1.5 * scale,
                offsetY: 0.75 * scale
              }"
            >
              <v-rect
                :config="{
                  ...(() => {
                     const dims = getBaleDims(bale)
                     const w = dims.width * scale
                     const h = dims.height * scale
                     return { width: w, height: h, x: (1.5 * scale) - (w / 2), y: (0.75 * scale) - (h / 2) }
                  })(),
                  fill: bale.orientation === 'flat' ? getBaleColor(bale.layer) : undefined,
                  fillPatternImage: (bale.orientation === 'tall' ? hatchPattern : (bale.orientation === 'pillar' ? pillarPattern : undefined)),
                  fillPatternRepeat: 'repeat',
                  stroke: (bale.orientation === 'flat' ? 'black' : (bale.orientation === 'pillar' ? '#d32f2f' : getBaleColor(bale.layer))),
                  strokeWidth: (bale.orientation === 'flat' ? 1 : 2),
                }"
              />
              <v-arrow
                v-if="bale.lean"
                :config="{
                  points: (() => {
                     const dims = getBaleDims(bale)
                     const w = dims.width * scale
                     const h = dims.height * scale
                     const pts = getArrowPoints(w, h, bale.lean)
                     const offsetX = (1.5 * scale) - (w / 2)
                     const offsetY = (0.75 * scale) - (h / 2)
                     return [pts[0]+offsetX, pts[1]+offsetY, pts[2]+offsetX, pts[3]+offsetY]
                  })(),
                  pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4
                }"
              />
            </v-group>

            <v-group v-for="board in mapData.boardEdges" :key="board.id" :config="{ x: board.x * scale, y: board.y * scale, rotation: board.rotation }">
              <v-rect :config="{ width: board.length * scale, height: 6, offsetX: (board.length * scale) / 2, offsetY: 3, fill: '#2e7d32', cornerRadius: 2 }" />
            </v-group>

          </v-layer>
        </v-stage>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-container {
  font-family: sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}
.state-msg.error { color: #d32f2f; }

.view-header {
  background: #fff;
  padding: 10px 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

.map-title { font-size: 1.1rem; color: #333; }

.layer-toggles { display: flex; gap: 5px; }
.layer-toggles button {
  padding: 8px 15px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.layer-toggles button.active {
  background: #2c3e50;
  color: white;
  border-color: #2c3e50;
}

.canvas-scroll {
  flex: 1;
  overflow: auto; /* Allow panning */
  -webkit-overflow-scrolling: touch; /* Smooth iOS scroll */
  display: flex;
  justify-content: center; /* Center map if smaller than screen */
  padding: 20px;
}
</style>
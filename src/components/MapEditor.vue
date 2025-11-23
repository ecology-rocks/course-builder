<template>
  <div class="editor-container">
    <div class="controls">
      <h3>Layer Control</h3>
      <div class="layer-select">
        <button 
          v-for="i in 3" 
          :key="i" 
          @click="store.currentLayer = i"
          :class="{ active: store.currentLayer === i }"
        >
          Layer {{ i }}
        </button>
      </div>
<div class="stats-panel">
        <h4>Bale Inventory</h4>
        
        <div class="stat-row main-stat">
          <span>Total Bales:</span>
          <strong>{{ store.inventory.total }}</strong>
        </div>
        
        <div class="stat-row">
          <span>Base Layer (L1):</span>
          <span>{{ store.inventory.base }}</span>
        </div>

        <div class="stat-row small-text">
          <span>Upper Levels:</span>
          <span>L2: {{ store.inventory.layer2 }} | L3: {{ store.inventory.layer3 }}</span>
        </div>

        <hr>

        <div class="nesting-control">
          <label>Previous Class Count:</label>
          <input 
            type="number" 
            v-model.number="store.previousClassCount" 
            placeholder="e.g. 40"
          >
        </div>
        
        <div class="stat-row delta" :class="{ 'positive': store.inventory.total >= store.previousClassCount }">
          <span>Nesting Delta:</span>
          <strong>{{ store.inventory.deltaString }} bales</strong>
        </div>
      </div>
<div class="instructions">
        <h4>Controls</h4>
        <ul>
          <li><strong>Click Grid:</strong> Add Bale</li>
          <li><strong>Right-Click Bale:</strong> Rotate (45°)</li>
          <li><strong>Shift+Click Bale:</strong> Cycle Type (Flat / Tall / Pillar)</li>
          <li><strong>Dbl-Click Bale:</strong> Delete</li>
          <li><strong>Alt+Click (Flat Only):</strong> Toggle Leaner Arrow</li>
        </ul>
      </div>
    </div>

    <div class="canvas-wrapper">
      <v-stage :config="stageConfig" @mousedown="handleStageClick">
        <v-layer>
          <v-line
            v-for="n in store.ringDimensions.width + 1"
            :key="'v'+n"
            :config="{
              points: [(n-1)*scale, 0, (n-1)*scale, stageConfig.height],
              stroke: '#ddd',
              strokeWidth: 1
            }"
          />
          <v-line
            v-for="n in store.ringDimensions.height + 1"
            :key="'h'+n"
            :config="{
              points: [0, (n-1)*scale, stageConfig.width, (n-1)*scale],
              stroke: '#ddd',
              strokeWidth: 1
            }"
          />

<v-group
            v-for="bale in visibleBales"
            :key="bale.id"
            :config="{
              draggable: true, // <--- ENABLE DRAG
              listening: bale.layer === store.currentLayer,
              // Existing Config...
              x: (bale.x * scale) + (1.5 * scale),
              y: (bale.y * scale) + (0.75 * scale),
              rotation: bale.rotation,
              opacity: getOpacity(bale.layer),
              offsetX: 1.5 * scale,
              offsetY: 0.75 * scale
            }"
            @contextmenu="handleRightClick($event, bale.id)"
            @dblclick="store.removeBale(bale.id)"
            @click="handleLeftClick($event, bale.id)"
            
            @dragend="handleDragEnd($event, bale.id)" 
          >
            <v-rect
              :config="{
                // Recalculate dimensions/offset locally relative to Group center
                ...(() => {
                   const dims = getBaleDims(bale)
                   const w = dims.width * scale
                   const h = dims.height * scale
                   // We position top-left relative to the group's anchor (1.5, 0.75)
                   // To center a dynamic shape in a fixed group anchor:
                   return {
                     width: w,
                     height: h,
                     x: (1.5 * scale) - (w / 2),
                     y: (0.75 * scale) - (h / 2)
                   }
                })(),
                
                // FILL LOGIC:
                // If NOT supported, use Red. 
                // If supported: Flat uses Layer Color, Tall/Pillar uses Transparent (for pattern).
                fill: !bale.supported ? '#ef5350' : (bale.orientation === 'flat' ? getBaleColor(bale.layer) : undefined),

                // PATTERN LOGIC:
                // If Not supported (Red), we usually hide the pattern or blend it. 
                // Let's hide the pattern so the Red error is obvious.
                fillPatternImage: !bale.supported ? undefined : (
                  bale.orientation === 'tall' ? hatchPattern : 
                  (bale.orientation === 'pillar' ? pillarPattern : undefined)
                ),
                fillPatternRepeat: 'repeat',

                // STROKE LOGIC:
                // If invalid, make the border Dark Red and thick.
                stroke: !bale.supported ? '#b71c1c' : (
                  bale.orientation === 'flat' ? 'black' : 
                  (bale.orientation === 'pillar' ? '#d32f2f' : getBaleColor(bale.layer))
                ),
                
                strokeWidth: !bale.supported ? 3 : (bale.orientation === 'flat' ? 1 : 2),
              }"
            />
            
            <v-arrow
              v-if="bale.lean"
              :config="{
                points: (() => {
                   // Calculate points based on the CURRENT bale dimensions
                   const dims = getBaleDims(bale)
                   const w = dims.width * scale
                   const h = dims.height * scale
                   
                   // Adjust for the group positioning offset
                   const pts = getArrowPoints(w, h, bale.lean)
                   const offsetX = (1.5 * scale) - (w / 2)
                   const offsetY = (0.75 * scale) - (h / 2)
                   
                   return [pts[0]+offsetX, pts[1]+offsetY, pts[2]+offsetX, pts[3]+offsetY]
                })(),
                pointerLength: 10,
                pointerWidth: 10,
                fill: 'black',
                stroke: 'black',
                strokeWidth: 4
              }"
            />
          </v-group>
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMapStore } from '../stores/mapStore'

const store = useMapStore()
const scale = 40 // Pixels per foot for display

const stageConfig = computed(() => ({
  width: store.ringDimensions.width * scale,
  height: store.ringDimensions.height * scale
}))

// Only show layers up to the current selected one, or ghost them
const visibleBales = computed(() => {
  // 1. Filter out bales above the current editing layer
  const filtered = store.bales.filter(b => b.layer <= store.currentLayer)

  // 2. Sort to control drawing order (Z-Index)
  return filtered.sort((a, b) => {
    // Priority A: Draw lower layers first (e.g. Layer 1 before Layer 2)
    if (a.layer !== b.layer) {
      return a.layer - b.layer
    }

    // Priority B: On the same layer, draw Leaners LAST (on top)
    const aIsLeaner = a.lean !== null
    const bIsLeaner = b.lean !== null

    if (aIsLeaner && !bIsLeaner) return 1  // A goes after B (Top)
    if (!aIsLeaner && bIsLeaner) return -1 // A goes before B (Bottom)
    
    return 0 // Keep original order
  })
})


function handleDragEnd(e, baleId) {
  // 1. Get the final position in pixels
  const xPixels = e.target.x()
  const yPixels = e.target.y()

  // 2. Convert to Grid Units (Feet)
  // We subtract the offset (1.5, 0.75) because the drag position includes the group's anchor offset,
  // but our store expects the top-left coordinate.
  const rawX = (xPixels / scale) - 1.5
  const rawY = (yPixels / scale) - 0.75

  // 3. Update Store (Store handles the rounding/snapping)
  store.updateBalePosition(baleId, rawX, rawY)
  
  // 4. Visual Reset
  // We force the shape back to the snapped position immediately so it doesn't look "fuzzy"
  // (Vue reactivity will eventually catch up, but this makes it snappy)
  const snappedX = Math.round(rawX * 2) / 2
  const snappedY = Math.round(rawY * 2) / 2
  
  e.target.x((snappedX * scale) + (1.5 * scale))
  e.target.y((snappedY * scale) + (0.75 * scale))
}


function getArrowPoints(width, height, direction) {
  // Define center
  const cx = width / 2
  const cy = height / 2
  
  // Arrow length (approx 60% of the smallest dimension to fit nicely)
  const size = Math.min(width, height) * 0.4

  switch (direction) {
    case 'top':    return [cx, cy + size, cx, cy - size] // Point Up
    case 'bottom': return [cx, cy - size, cx, cy + size] // Point Down
    case 'left':   return [cx + size, cy, cx - size, cy] // Point Left
    case 'right':  return [cx - size, cy, cx + size, cy] // Point Right
    default: return []
  }
}

function handleLeftClick(e, baleId) {
  // Priority 1: Shift (Type Toggle)
  if (e.evt.shiftKey) {
    store.cycleOrientation(baleId)
    return
  }
  
  // Priority 2: Alt/Option (Lean Toggle)
  if (e.evt.altKey) {
    store.cycleLean(baleId)
    return
  }

  // Standard Click (Select - future)
}

// Helper for Pillar "X" pattern
const pillarPattern = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 20
  canvas.height = 20
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)' 
  ctx.fillRect(0,0,20,20)
  
  // X shape
  ctx.strokeStyle = '#d32f2f' // Reddish X
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(20, 20)
  ctx.moveTo(20, 0); ctx.lineTo(0, 20)
  ctx.stroke()
  
  return canvas
})()

// Calculate dimensions based on orientation
function getBaleDims(bale) {
  if (bale.orientation === 'pillar') {
    return { width: 1.5, height: 1.0 } // Smallest footprint
  }
  if (bale.orientation === 'tall') {
    return { width: 3.0, height: 1.0 } // Skinny long footprint
  }
  // Flat (Standard)
  return { width: 3.0, height: 1.5 }
}

// Helper to create a striped pattern for "Tall" bales
function createHatchPattern() {
  const canvas = document.createElement('canvas')
  canvas.width = 20
  canvas.height = 20
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#fff' // Background (transparent-ish or white)
  ctx.fillRect(0,0,20,20)
  
  ctx.strokeStyle = '#333' // Stripe color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 20)
  ctx.lineTo(20, 0)
  ctx.stroke()
  
  return canvas
}

const hatchPattern = createHatchPattern()


function getBaleColor(layer) {
  // Visual distinction for layers
  switch(layer) {
    case 1: return '#e6c200' // Gold/Straw
    case 2: return '#4caf50' // Green tint
    case 3: return '#2196f3' // Blue tint
    return '#ccc'
  }
}

function getOpacity(layer) {
  if (layer === store.currentLayer) return 1
  return 0.5 // Dim lower layers
}

function handleStageClick(e) {
  // Don't add if clicking on an existing shape (simplification)
  if (e.target !== e.target.getStage()) return

  const pointer = e.target.getStage().getPointerPosition()
  const x = pointer.x / scale
  const y = pointer.y / scale
  
  store.addBale(x, y)
}

// NEW FUNCTION: Handles the rotation and prevents the menu
function handleRightClick(e, baleId) {
  // 1. Prevent the browser context menu
  e.evt.preventDefault() 
  
  // 2. Trigger the rotate action in the store
  store.rotateBale(baleId)
}
</script>

<style scoped>
.editor-container {
  display: flex;
  gap: 20px;
}
.controls {
  width: 200px;
  background: #f5f5f5;
  padding: 1rem;
}
.active {
  background: #333;
  color: white;
}
.canvas-wrapper {
  border: 2px solid #333;
}

.instructions ul {
  padding-left: 20px;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
}

.stats-panel {
  background: #fff;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.main-stat {
  font-size: 1.1em;
  color: #2c3e50;
  border-bottom: 2px solid #eee;
  padding-bottom: 5px;
  margin-bottom: 10px;
}

.small-text {
  font-size: 0.85em;
  color: #666;
}

.nesting-control {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.nesting-control input {
  padding: 4px;
  margin-top: 4px;
}

.delta {
  font-weight: bold;
  color: #d32f2f; /* Red for removing bales */
}

.delta.positive {
  color: #388e3c; /* Green for adding bales */
}
</style>
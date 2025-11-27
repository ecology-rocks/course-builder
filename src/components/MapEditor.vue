<template>
  <div class="editor-container">
    <div class="controls">
    <div class="saas-header">
<div v-if="userStore.user" class="user-info">
          <span>👤 {{ userStore.user.email }}</span>
          <button @click="userStore.logout" class="btn-small">Logout</button>
        </div>
<div v-else class="auth-form">
          <input v-model="email" type="email" placeholder="Email" />
          <input v-model="password" type="password" placeholder="Password" />
          
          <div class="auth-buttons">
            <button @click="handleLogin" class="btn-primary">Login</button>
            <button @click="handleRegister" class="btn-secondary">Register</button>
          </div>

          <a href="#" @click.prevent="handleForgotPassword" class="forgot-link">Forgot Password?</a>
          
          <span v-if="userStore.authError" class="error-msg">{{ userStore.authError }}</span>
        </div>

        <div class="file-actions">
          <input v-model="store.mapName" class="map-name-input" placeholder="Map Name" />
          
          <div class="btn-group">
            <button @click="store.saveToCloud" :disabled="!userStore.user">☁️ Save</button>
            <button @click="openLoadModal" :disabled="!userStore.user">📂 Open</button>
          </div>
          
          <div class="btn-group">
            <button @click="store.exportMapToJSON">⬇️ Export</button>
            <button @click="fileInput.click()">⬆️ Import</button>
            <input 
              ref="fileInput" 
              type="file" 
              accept=".json" 
              style="display:none" 
              @change="handleFileImport" 
            />
          </div>
        </div>
      </div>
      
      <hr />

      <div v-if="showLoadModal" class="modal-overlay">
<div v-if="showLoadModal" class="modal-overlay" @click.self="showLoadModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Your Saved Maps</h3>
            <button class="close-btn" @click="showLoadModal = false">×</button>
          </div>
          
          <ul class="map-list">
            <li v-for="map in userMaps" :key="map.id" class="map-item">
              <div class="map-info" @click="selectMap(map)">
                <span class="map-title">{{ map.name }}</span>
                <small>{{ new Date(map.updatedAt.seconds * 1000).toLocaleDateString() }}</small>
              </div>

              <div class="map-actions">
                <button @click.stop="handleRenameMap(map)" title="Rename">✏️</button>
                <button @click.stop="handleDeleteMap(map)" title="Delete" class="delete-btn">🗑️</button>
              </div>
            </li>
          </ul>
          
          <div v-if="userMaps.length === 0" class="empty-state">
            No saved maps found.
          </div>
        </div>
      </div>

      </div>
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

      <h3>Course Settings</h3>
      <div class="level-control">
        <label>Class Level:</label>
        <select v-model="store.classLevel">
          <option value="Instinct">Instinct</option>
          <option value="Novice">Novice</option>
          <option value="Open">Open</option>
          <option value="Senior">Senior</option>
          <option value="Master">Master</option>
          <option value="Crazy8s">Crazy 8s</option>
          <option value="LineDrive">Line Drive</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="ring-controls">
        <label>
          Width (ft):
          <input 
            type="number" 
            :value="store.ringDimensions.width" 
            @change="store.resizeRing($event.target.value, store.ringDimensions.height)"
          />
        </label>
        <label>
          Height (ft):
          <input 
            type="number" 
            :value="store.ringDimensions.height" 
            @change="store.resizeRing(store.ringDimensions.width, $event.target.value)"
          />
        </label>
      </div>
      <hr />

      <div class="toolbox">
        <h4>Tools</h4>
        <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }">
          📦 Bale
        </button>
        <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">
          ➖ Board Edge
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
          <input type="number" v-model.number="store.previousClassCount" placeholder="e.g. 40">
        </div>
        <div class="stat-row delta" :class="{ 'positive': store.inventory.total >= store.previousClassCount }">
          <span>Nesting Delta:</span>
          <strong>{{ store.inventory.deltaString }} bales</strong>
        </div>
      </div>

      <div class="instructions">
        <h4>Controls</h4>
        <ul>
          <li><strong>Click Grid:</strong> Add Item</li>
          <li><strong>Right-Click:</strong> Rotate</li>
          <li><strong>Shift+Click:</strong> Cycle Type</li>
          <li><strong>Alt+Click:</strong> Leaner Arrow</li>
          <li><strong>Drag:</strong> Move Item</li>
          <li><strong>Dbl-Click:</strong> Delete</li>
        </ul>
      </div>
    </div>

    <div class="canvas-wrapper">
      <v-stage :config="stageConfig" @mousedown="handleStageClick">
        
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">

          <v-text
            v-for="n in store.ringDimensions.width + 1"
            :key="'lx'+n"
            :config="{
              x: (n-1) * scale,
              y: -20,
              text: (n-1).toString(),
              fontSize: 12,
              fill: '#666',
              align: 'center',
              width: 10,
              offsetX: 5
            }"
          />

          <v-text
            v-for="n in store.ringDimensions.height + 1"
            :key="'ly'+n"
            :config="{
              x: -25,
              y: (n-1) * scale - 6,
              text: (n-1).toString(),
              fontSize: 12,
              fill: '#666',
              align: 'right',
              width: 20
            }"
          />

          <v-line
            v-for="n in store.ringDimensions.width + 1"
            :key="'v'+n"
            :config="{
              points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height * scale],
              stroke: (n-1) % 5 === 0 ? '#999' : '#ddd',
              strokeWidth: 1
            }"
          />
          <v-line
            v-for="n in store.ringDimensions.height + 1"
            :key="'h'+n"
            :config="{
              points: [0, (n-1)*scale, store.ringDimensions.width * scale, (n-1)*scale],
              stroke: (n-1) % 5 === 0 ? '#999' : '#ddd',
              strokeWidth: 1
            }"
          />

          <v-group
            v-for="bale in visibleBales"
            :key="bale.id"
            :config="{
              draggable: true,
              dragBoundFunc: dragBoundFunc,
              listening: bale.layer === store.currentLayer,
              x: (bale.x * scale) + (1.5 * scale),
              y: (bale.y * scale) + (0.75 * scale),
              rotation: bale.rotation,
              opacity: getOpacity(bale.layer),
              offsetX: 1.5 * scale,
              offsetY: 0.75 * scale
            }"
            @contextmenu="handleRightClick($event, bale.id)"
            @dblclick="handleDblClick($event, bale.id)"
            @click="handleLeftClick($event, bale.id)"
            @dragend="handleDragEnd($event, bale.id)" 
          >
            <v-rect
              :config="{
                ...(() => {
                   const dims = getBaleDims(bale)
                   const w = dims.width * scale
                   const h = dims.height * scale
                   return {
                     width: w,
                     height: h,
                     x: (1.5 * scale) - (w / 2),
                     y: (0.75 * scale) - (h / 2)
                   }
                })(),
                fill: !bale.supported ? '#ef5350' : (bale.orientation === 'flat' ? getBaleColor(bale.layer) : undefined),
                fillPatternImage: !bale.supported ? undefined : (
                  bale.orientation === 'tall' ? hatchPattern : 
                  (bale.orientation === 'pillar' ? pillarPattern : undefined)
                ),
                fillPatternRepeat: 'repeat',
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
                   const dims = getBaleDims(bale)
                   const w = dims.width * scale
                   const h = dims.height * scale
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

<v-group
            v-for="board in store.boardEdges"
            :key="board.id"
            :config="{
              draggable: true,
              dragBoundFunc: dragBoundFunc, // <--- Added Snapping
              
              x: board.x * scale,
              y: board.y * scale,
              rotation: board.rotation
            }"
            @contextmenu="handleRightClickBoard($event, board.id)"
            @dblclick="handleBoardDblClick($event, board.id)" 
          >
            <v-rect
              :config="{
                width: board.length * scale,
                height: 6,
                offsetX: (board.length * scale) / 2,
                offsetY: 3, 
                fill: '#2e7d32',
                cornerRadius: 2
              }"
            />
          </v-group>

        </v-layer> </v-stage>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()
const email = ref('')
const password = ref('')

const store = useMapStore()
const scale = 40 // Pixels per foot for display
const GRID_OFFSET = 30

const fileInput = ref(null)

async function handleLogin() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.login(email.value, password.value)
}

async function handleForgotPassword() {
  if (!email.value) return alert("Please enter your email address first.")
  await userStore.resetPassword(email.value)
}

async function handleRegister() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.register(email.value, password.value)
}

function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => store.importMapFromJSON(e.target.result)
  reader.readAsText(file)
}

async function handleDeleteMap(map) {
  if (confirm(`Are you sure you want to delete "${map.name}"? This cannot be undone.`)) {
    await store.deleteMap(map.id)
    // Refresh the list immediately
    await openLoadModal() 
  }
}

async function handleRenameMap(map) {
  const newName = prompt("Enter new name:", map.name)
  if (newName && newName.trim() !== "") {
    await store.renameMap(map.id, newName.trim())
    // Refresh the list
    await openLoadModal()
  }
}


const showLoadModal = ref(false)
const userMaps = ref([])

async function openLoadModal() {
  userMaps.value = await store.loadUserMaps()
  showLoadModal.value = true
}

function selectMap(map) {
  store.loadMapFromData(map.id, map)
  showLoadModal.value = false
}

const stageConfig = computed(() => ({
  width: (store.ringDimensions.width * scale) + (GRID_OFFSET * 2),
  height: (store.ringDimensions.height * scale) + (GRID_OFFSET * 2)
}))

function handleDblClick(e, baleId) {
  // e.evt.button: 0 = Left, 2 = Right
  if (e.evt.button === 0) {
    store.removeBale(baleId)
  }
}

// Safe delete for Board Edges (Left-click only)
function handleBoardDblClick(e, id) {
  if (e.evt.button === 0) {
    store.removeBoardEdge(id)
  }
}

// Snap the Top-Left corner to the 6-inch grid (0.5 ft)
function dragBoundFunc(pos) {
  // 'this' is the node being dragged
  const node = this
  
  // 1. Get the offset (Pivot point) of the bale
  const offsetX = node.offsetX()
  const offsetY = node.offsetY()
  
  // 2. Calculate where the Top-Left corner is currently hovering
  // (Absolute Position - Grid Gutter - Internal Offset)
  const rawX = pos.x - GRID_OFFSET - offsetX
  const rawY = pos.y - GRID_OFFSET - offsetY
  
  // 3. Snap that Top-Left corner to the nearest 6 inches (20 pixels)
  const step = scale / 2 // 20px
  const snappedX = Math.round(rawX / step) * step
  const snappedY = Math.round(rawY / step) * step
  
  // 4. Return the new Center position
  return {
    x: snappedX + GRID_OFFSET + offsetX,
    y: snappedY + GRID_OFFSET + offsetY
  }
}


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
  // 1. Get the ABSOLUTE position (Screen pixels, ignoring layers)
  // This prevents any confusion about "relative to what?"
  const absPos = e.target.getAbsolutePosition()
  
  // 2. Subtract the Grid Offset (Gutter) manually
  const relX = absPos.x - GRID_OFFSET
  const relY = absPos.y - GRID_OFFSET

  // 3. Convert to Grid Units and subtract the Center Offset (1.5, 0.75)
  // We do this because the "Position" of the group is its center, 
  // but the Store expects the Top-Left corner.
  const rawX = (relX / scale) - 1.5
  const rawY = (relY / scale) - 0.75

  // 4. Update Store (Store handles rounding/snapping)
  store.updateBalePosition(baleId, rawX, rawY)
  
  // 5. Visual Snap (Optional but smooths things out)
  // We let the store update trigger the reactivity, but we can also
  // nudge the node here if we want instant feedback.
  // (Usually not strictly necessary if the store update is fast)
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

// NEW: Specific handler for Board rotation
function handleRightClickBoard(e, id) {
  e.evt.preventDefault()
  store.rotateBoardEdge(id)
}

// UPDATED: Main Click Handler
function handleStageClick(e) {
  if (e.target !== e.target.getStage()) return

  const pointer = e.target.getStage().getPointerPosition()
  
  // Subtract the margin so 0,0 is the corner of the grid, not the corner of the canvas
  const x = (pointer.x - GRID_OFFSET) / scale
  const y = (pointer.y - GRID_OFFSET) / scale

  // Guard: Don't allow clicking in the gutter
  if (x < 0 || y < 0) return

  if (store.activeTool === 'bale') {
    store.addBale(x, y)
  } else if (store.activeTool === 'board') {
    store.addBoardEdge(x, y)
  }
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

.toolbox {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}
.toolbox button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}
.toolbox button.active {
  background: #2c3e50;
  color: white;
  border-color: #2c3e50;
}

.saas-header {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.map-name-input {
  width: 100%;
  padding: 5px;
  margin-bottom: 5px;
  font-weight: bold;
}
.btn-group {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}
.btn-group button {
  flex: 1;
  padding: 5px;
  cursor: pointer;
}
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: white; padding: 20px; border-radius: 8px; min-width: 300px;
}
.modal ul { list-style: none; padding: 0; }
.modal li {
  padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;
}
.modal li:hover { background: #f0f0f0; }

.auth-form {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.auth-form input {
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.auth-buttons {
  display: flex;
  gap: 5px;
}
.error-msg {
  color: red;
  font-size: 0.8em;
  margin-left: 10px;
}
.btn-primary {
  background-color: #4CAF50;
  color: white;
  border: none;
}
.btn-secondary {
  background-color: #008CBA;
  color: white;
  border: none;
}

.password-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
.btn-text {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 5px;
}
.btn-text:hover {
  transform: scale(1.1);
}

.forgot-link {
  font-size: 0.85rem;
  color: #007bff; /* Standard Link Blue */
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap; /* Keep it on one line */
  margin-left: 5px;
}

.forgot-link:hover {
  text-decoration: underline;
  color: #0056b3;
}

.ring-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.ring-controls label {
  font-size: 0.9em;
  display: flex;
  flex-direction: column;
}
.ring-controls input {
  width: 60px;
  padding: 4px;
}

.level-control {
  margin-bottom: 10px;
}
.level-control label {
  display: block;
  font-size: 0.9em;
  margin-bottom: 4px;
}
.level-control select {
  width: 100%;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.close-btn {
  background: none; border: none; font-size: 1.5rem; cursor: pointer;
}
.map-list {
  list-style: none;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}
.map-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.map-item:hover {
  background-color: #f9f9f9;
}
.map-info {
  flex-grow: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}
.map-title {
  font-weight: bold;
}
.map-actions {
  display: flex;
  gap: 5px;
}
.map-actions button {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
}
.map-actions button:hover {
  background: #eee;
}
.delete-btn:hover {
  background: #ffebee !important;
  border-color: #ef5350 !important;
}
.empty-state {
  text-align: center;
  color: #888;
  padding: 20px;
}
</style>
<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useUserStore } from '../stores/userStore'

const store = useMapStore()
const userStore = useUserStore()

// --- CONSTANTS & CONFIG ---
const scale = 40
const GRID_OFFSET = 30 // Space for labels
const stageRef = ref(null) // Reference for printing

const stageConfig = computed(() => ({
  width: (store.ringDimensions.width * scale) + (GRID_OFFSET * 2),
  height: (store.ringDimensions.height * scale) + (GRID_OFFSET * 2)
}))

const visibleBales = computed(() => {
  const filtered = store.bales.filter(b => b.layer <= store.currentLayer)
  return filtered.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer
    const aIsLeaner = a.lean !== null
    const bIsLeaner = b.lean !== null
    if (aIsLeaner && !bIsLeaner) return 1
    if (!aIsLeaner && bIsLeaner) return -1
    return 0
  })
})

function getBaleColor(layer) {
  switch (layer) {
    case 1: return '#e6c200'
    case 2: return '#4caf50'
    case 3: return '#2196f3'
      return '#ccc'
  }
}

function getOpacity(layer) {
  if (layer === store.currentLayer) return 1
  return 0.5
}

// --- PATTERN HELPERS ---
const hatchPattern = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 20; canvas.height = 20
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillRect(0, 0, 20, 20)
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, 0); ctx.stroke()
  return canvas
})()

const pillarPattern = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 20; canvas.height = 20
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillRect(0, 0, 20, 20)
  ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 20); ctx.moveTo(20, 0); ctx.lineTo(0, 20); ctx.stroke()
  return canvas
})()

// --- GEOMETRY HELPERS ---
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
    case 'top': return [cx, cy + size, cx, cy - size]
    case 'bottom': return [cx, cy - size, cx, cy + size]
    case 'left': return [cx + size, cy, cx - size, cy]
    case 'right': return [cx - size, cy, cx + size, cy]
    default: return []
  }
}

// 2. Add Hide Handlers
function handleDblClickHide(e, id) {
  if (e.evt.button === 0) store.removeHide(id)
}

function handleHideClick(e, id) {
  // Desktop Right-Click handled by @contextmenu in template
  
  // Mobile/Action Tool Logic
  if (store.activeTool === 'rotate' || store.activeTool === 'type') {
    store.cycleHideType(id) // Reuse rotate/type tools to cycle color
  }
  if (store.activeTool === 'delete') {
    store.removeHide(id)
  }
  // Standard Click (Cycle)
  if (!store.activeTool || store.activeTool === 'hide') {
    store.cycleHideType(id)
  }
}

// --- MOUSE HANDLERS ---
function handleStageClick(e) {
  if (e.target !== e.target.getStage()) return
  const pointer = e.target.getStage().getPointerPosition()
  const x = (pointer.x - GRID_OFFSET) / scale
  const y = (pointer.y - GRID_OFFSET) / scale

  if (x < 0 || y < 0) return // Clicked in gutter

  if (store.activeTool === 'bale') {
    store.addBale(x, y)
  } else if (store.activeTool === 'board') {
    store.addBoardEdge(x, y)
  } else if (store.activeTool === 'startbox') { 
    store.addStartBox(x, y)
  } else if (store.activeTool === 'dcmat') { 
    store.addDCMat(x, y)
  } else if (store.activeTool === 'hide') { 
    store.addHide(x, y)
  }
}

function handleRightClickDC(e, id) {
  e.evt.preventDefault()
  store.rotateDCMat(id)
}

function handleDblClickDC(e, id) {
  if (e.evt.button === 0) store.removeDCMat(id)
}

function handleRightClick(e, baleId) {
  e.evt.preventDefault()
  store.rotateBale(baleId)
}

function handleRightClickBoard(e, id) {
  e.evt.preventDefault()
  store.rotateBoardEdge(id)
}

function handleLeftClick(e, baleId) {
  // 1. Check for Mobile Action Tools
  if (store.activeTool === 'rotate') {
    store.rotateBale(baleId)
    return
  }
  if (store.activeTool === 'type') {
    store.cycleOrientation(baleId)
    return
  }
  if (store.activeTool === 'lean') {
    store.cycleLean(baleId)
    return
  }
  if (store.activeTool === 'delete') {
    store.removeBale(baleId)
    return
  }

  // 2. Keep existing Desktop Modifiers (Shift/Alt) as backups
  if (e.evt.shiftKey) {
    store.cycleOrientation(baleId)
    return
  }
  if (e.evt.altKey) {
    store.cycleLean(baleId)
    return
  }
}

function handleDblClick(e, baleId) {
  if (e.evt.button === 0) store.removeBale(baleId)
}

function handleBoardDblClick(e, id) {
  if (e.evt.button === 0) store.removeBoardEdge(id)
}

// Example for Boards (add similar logic for DC Mats)
function handleBoardClick(e, id) {
  if (store.activeTool === 'rotate') store.rotateBoardEdge(id)
  if (store.activeTool === 'delete') store.removeBoardEdge(id)
}

function handleDCClick(e, id) {
  if (store.activeTool === 'rotate') store.rotateDCMat(id)
  if (store.activeTool === 'delete') store.removeDCMat(id)
}

function dragBoundFunc(pos) {
  const node = this
  const offsetX = node.offsetX()
  const offsetY = node.offsetY()
  const rawX = pos.x - GRID_OFFSET - offsetX
  const rawY = pos.y - GRID_OFFSET - offsetY
  const step = scale / 2
  const snappedX = Math.round(rawX / step) * step
  const snappedY = Math.round(rawY / step) * step
  return {
    x: snappedX + GRID_OFFSET + offsetX,
    y: snappedY + GRID_OFFSET + offsetY
  }
}

function handleDragEnd(e, baleId) {
  const absPos = e.target.getAbsolutePosition()
  const relX = absPos.x - GRID_OFFSET
  const relY = absPos.y - GRID_OFFSET
  const rawX = (relX / scale) - 1.5
  const rawY = (relY / scale) - 0.75
  store.updateBalePosition(baleId, rawX, rawY)
}

// --- AUTH & FILE HANDLERS ---
const email = ref('')
const password = ref('')
const fileInput = ref(null)
const showLoadModal = ref(false)
const userMaps = ref([])

async function handleLogin() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.login(email.value, password.value)
}

async function handleRegister() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.register(email.value, password.value)
}

async function handleForgotPassword() {
  if (!email.value) return alert("Please enter your email address first.")
  await userStore.resetPassword(email.value)
}

function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => store.importMapFromJSON(e.target.result)
  reader.readAsText(file)
}

// --- LOAD MODAL HANDLERS ---
async function openLoadModal() {
  userMaps.value = await store.loadUserMaps()
  showLoadModal.value = true
}

function selectMap(map) {
  store.loadMapFromData(map.id, map)
  showLoadModal.value = false
}

async function handleDeleteMap(map) {
  if (confirm(`Delete "${map.name}"?`)) {
    await store.deleteMap(map.id)
    await openLoadModal()
  }
}

async function handleRenameMap(map) {
  const newName = prompt("Enter new name:", map.name)
  if (newName && newName.trim() !== "") {
    await store.renameMap(map.id, newName.trim())
    await openLoadModal()
  }
}

// --- PRINTING ---
async function handlePrint() {
  const originalLayer = store.currentLayer
  const images = []
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  for (let i = 1; i <= 3; i++) {
    store.currentLayer = i
    await wait(150)
    const dataUrl = stageRef.value.getStage().toDataURL({ pixelRatio: 2 })
    images.push(dataUrl)
  }
  store.currentLayer = originalLayer

  const win = window.open('', '_blank')
  win.document.write(`
    <html>
      <head>
        <title>Print Map - ${store.mapName}</title>
        <style>
          body { font-family: sans-serif; text-align: center; }
          .page { page-break-after: always; padding: 20px; }
          img { max-width: 100%; border: 1px solid #ccc; }
          .stats { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="stats">
          <strong>${store.mapName} (${store.classLevel})</strong><br>
          Total Bales: ${store.inventory.total} | Base: ${store.inventory.base}
        </div>
        <div class="page"><h2>Layer 1 (Base)</h2><img src="${images[0]}" /></div>
        <div class="page"><h2>Layer 2</h2><img src="${images[1]}" /></div>
        <div class="page"><h2>Layer 3</h2><img src="${images[2]}" /></div>
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
    </html>
  `)
  win.document.close()
}
</script>

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
            <button @click="handlePrint">🖨️ Print</button>
            <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleFileImport" />
          </div>
        </div>
      </div>
      <hr />

      <h3>Layer Control</h3>
      <div class="layer-select">
        <button v-for="i in 3" :key="i" @click="store.currentLayer = i" :class="{ active: store.currentLayer === i }">
          Layer {{ i }}
        </button>
      </div>
      <div class="toolbox">
        <h4>Tools</h4>
        <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }">📦 Bale</button>
        <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Board</button>
        <button @click="store.setTool('startbox')" :class="{ active: store.activeTool === 'startbox' }">🔲
          Start</button>
        <button @click="store.setTool('dcmat')" :class="{ active: store.activeTool === 'dcmat' }">🟧 DC Mat</button>
        <button @click="store.setTool('hide')" :class="{ active: store.activeTool === 'hide' }">🔴 (Rat) Hide</button>
      </div>
      <div class="toolbox action-tools">
        <h4>Action Tools</h4>
        <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }"
          title="Tap item to Rotate">🔄 Rotate</button>
        <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }"
          title="Tap to Toggle Flat/Tall">📐 Type</button>
        <button @click="store.setTool('lean')" :class="{ active: store.activeTool === 'lean' }"
          title="Tap to Toggle Lean">↗️ Lean</button>
        <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }"
          title="Tap to Delete">🗑️ Delete</button>
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
      <div class="guidelines-box" v-if="store.currentGuidelines">
        <h5>{{ store.classLevel }} Guidelines</h5>
        <div class="guide-row">
          <span>Min Bales:</span> <strong>{{ store.currentGuidelines.minBales }}</strong>
        </div>
        <div class="guide-row">
          <span>Max Bales:</span> <strong>{{ store.currentGuidelines.maxBales }}</strong>
        </div>
        <div class="guide-note">
          {{ store.currentGuidelines.notes }}
        </div>

        <div v-if="store.inventory.total < store.currentGuidelines.minBales" class="warning-text">
          ⚠️ Need {{ store.currentGuidelines.minBales - store.inventory.total }} more bales!
        </div>
      </div>
      <div class="ring-controls">
        <label>Width (ft):<input type="number" :value="store.ringDimensions.width"
            @change="store.resizeRing($event.target.value, store.ringDimensions.height)" /></label>
        <label>Height (ft):<input type="number" :value="store.ringDimensions.height"
            @change="store.resizeRing(store.ringDimensions.width, $event.target.value)" /></label>
      </div>

      <div class="stats-panel">
        <h4>Bale Inventory</h4>
        <div class="stat-row main-stat">
          <span>Total Bales:</span><strong>{{ store.inventory.total }}</strong>
        </div>
        <div class="stat-row">
          <span>Base Layer (L1):</span><span>{{ store.inventory.base }}</span>
        </div>
        <div class="stat-row small-text">
          <span>Upper Levels:</span><span>L2: {{ store.inventory.layer2 }} | L3: {{ store.inventory.layer3 }}</span>
        </div>
        <hr>
        <div class="nesting-control">
          <label>Previous Class Count:</label>
          <input type="number" v-model.number="store.previousClassCount" placeholder="e.g. 40">
        </div>
        <div class="stat-row delta" :class="{ 'positive': store.inventory.total >= store.previousClassCount }">
          <span>Nesting Delta:</span><strong>{{ store.inventory.deltaString }} bales</strong>
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
          <li><strong>Dbl-Click (Left):</strong> Delete</li>
        </ul>
      </div>
    </div>

    <div class="canvas-wrapper">
      <v-stage ref="stageRef" :config="stageConfig" @mousedown="handleStageClick">
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">

          <v-text v-for="n in store.ringDimensions.width + 1" :key="'lx' + n"
            :config="{ x: (n - 1) * scale, y: -20, text: (n - 1).toString(), fontSize: 12, fill: '#666', align: 'center', width: 10, offsetX: 5 }" />
          <v-text v-for="n in store.ringDimensions.height + 1" :key="'ly' + n"
            :config="{ x: -25, y: (n - 1) * scale - 6, text: (n - 1).toString(), fontSize: 12, fill: '#666', align: 'right', width: 20 }" />
          <v-line v-for="n in store.ringDimensions.width + 1" :key="'v' + n"
            :config="{ points: [(n - 1) * scale, 0, (n - 1) * scale, store.ringDimensions.height * scale], stroke: (n - 1) % 5 === 0 ? '#999' : '#ddd', strokeWidth: 1 }" />
          <v-line v-for="n in store.ringDimensions.height + 1" :key="'h' + n"
            :config="{ points: [0, (n - 1) * scale, store.ringDimensions.width * scale, (n - 1) * scale], stroke: (n - 1) % 5 === 0 ? '#999' : '#ddd', strokeWidth: 1 }" />

          <v-group v-for="bale in visibleBales" :key="bale.id" :config="{
            draggable: true,
            dragBoundFunc: dragBoundFunc,
            listening: bale.layer === store.currentLayer,
            x: (bale.x * scale) + (1.5 * scale),
            y: (bale.y * scale) + (0.75 * scale),
            rotation: bale.rotation,
            opacity: getOpacity(bale.layer),
            offsetX: 1.5 * scale,
            offsetY: 0.75 * scale
          }" @contextmenu="handleRightClick($event, bale.id)" @dblclick="handleDblClick($event, bale.id)"
            @click="handleLeftClick($event, bale.id)" @tap="handleLeftClick($event, bale.id)"
            @dragend="handleDragEnd($event, bale.id)">
            <v-rect :config="{
              ...(() => {
                const dims = getBaleDims(bale)
                const w = dims.width * scale
                const h = dims.height * scale
                return { width: w, height: h, x: (1.5 * scale) - (w / 2), y: (0.75 * scale) - (h / 2) }
              })(),
              fill: !bale.supported ? '#ef5350' : (bale.orientation === 'flat' ? getBaleColor(bale.layer) : undefined),
              fillPatternImage: !bale.supported ? undefined : (bale.orientation === 'tall' ? hatchPattern : (bale.orientation === 'pillar' ? pillarPattern : undefined)),
              fillPatternRepeat: 'repeat',
              stroke: !bale.supported ? '#b71c1c' : (bale.orientation === 'flat' ? 'black' : (bale.orientation === 'pillar' ? '#d32f2f' : getBaleColor(bale.layer))),
              strokeWidth: !bale.supported ? 3 : (bale.orientation === 'flat' ? 1 : 2),
            }" />
            <v-arrow v-if="bale.lean" :config="{
              points: (() => {
                const dims = getBaleDims(bale)
                const w = dims.width * scale
                const h = dims.height * scale
                const pts = getArrowPoints(w, h, bale.lean)
                const offsetX = (1.5 * scale) - (w / 2)
                const offsetY = (0.75 * scale) - (h / 2)
                return [pts[0] + offsetX, pts[1] + offsetY, pts[2] + offsetX, pts[3] + offsetY]
              })(),
              pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4
            }" />
          </v-group>

<v-group
            v-for="hide in store.hides"
            :key="hide.id"
            :config="{
              draggable: true,
              dragBoundFunc: dragBoundFunc,
              x: hide.x * scale,
              y: hide.y * scale
            }"
            @contextmenu.prevent="store.cycleHideType(hide.id)"
            @dblclick="handleDblClickHide($event, hide.id)"
            @click="handleHideClick($event, hide.id)"
            @tap="handleHideClick($event, hide.id)"
          >
            <v-circle
              :config="{
                radius: 0.3 * scale, // approx 4 inches radius
                fill: hide.type === 'rat' ? '#d32f2f' : (hide.type === 'litter' ? '#388e3c' : '#1976d2'),
                stroke: 'white',
                strokeWidth: 2,
                shadowColor: 'black',
                shadowBlur: 3,
                shadowOpacity: 0.3
              }"
            />
            <v-text
              :config="{
                text: hide.type === 'rat' ? 'R' : (hide.type === 'litter' ? 'L' : 'E'),
                fontSize: 14,
                fontStyle: 'bold',
                fill: 'white',
                align: 'center',
                x: -5,
                y: -6
              }"
            />
          </v-group>

          <v-group v-for="board in store.boardEdges" :key="board.id" :config="{
            draggable: true,
            dragBoundFunc: dragBoundFunc,
            x: board.x * scale,
            y: board.y * scale,
            rotation: board.rotation
          }" @contextmenu="handleRightClickBoard($event, board.id)" @dblclick="handleBoardDblClick($event, board.id)"
            @click="handleBoardClick($event, board.id)" @tap="handleBoardClick($event, board.id)">
            <v-rect
              :config="{ width: board.length * scale, height: 6, offsetX: (board.length * scale) / 2, offsetY: 3, fill: '#2e7d32', cornerRadius: 2 }" />
          </v-group>

          <v-group v-for="mat in store.dcMats" :key="mat.id" :config="{
            draggable: true,
            dragBoundFunc: dragBoundFunc,
            x: mat.x * scale,
            y: mat.y * scale,
            rotation: mat.rotation,
            offsetX: (2 * scale) / 2,
            offsetY: (3 * scale) / 2
          }" @contextmenu="handleRightClickDC($event, mat.id)" @dblclick="handleDblClickDC($event, mat.id)"
            @click="handleDCClick($event, mat.id)" @tap="handleDCClick($event, mat.id)">
            <v-rect :config="{
              width: 2 * scale,
              height: 3 * scale,
              stroke: '#ff9800', // Orange
              strokeWidth: 3,
              fill: 'rgba(255, 152, 0, 0.2)',
              cornerRadius: 2,
              dash: [10, 5] // Dashed line to indicate a 'boundary' feel
            }" />
            <v-text :config="{
              text: 'DC',
              fontSize: 16,
              fontStyle: 'bold',
              fill: '#e65100', // Darker Orange
              width: 2 * scale,
              padding: 0,
              align: 'center',
              y: (3 * scale) / 2 - 8 // Center vertically
            }" />
          </v-group>

          <v-group v-if="store.startBox" :config="{
            draggable: true,
            dragBoundFunc: dragBoundFunc,
            x: store.startBox.x * scale,
            y: store.startBox.y * scale
          }" @dblclick="store.removeStartBox()" @dragend="(e) => {
              // Reuse the existing logic but manually update the specific ref
              const absPos = e.target.getAbsolutePosition()
              const relX = absPos.x - GRID_OFFSET
              const relY = absPos.y - GRID_OFFSET
              const rawX = relX / scale
              const rawY = relY / scale
              store.addStartBox(rawX, rawY) // Re-save position
            }">
            <v-rect :config="{
              width: 4 * scale,
              height: 4 * scale,
              stroke: '#9c27b0', // Purple
              strokeWidth: 4,
              fill: 'rgba(156, 39, 176, 0.1)',
              cornerRadius: 2
            }" />
            <v-text :config="{
              text: 'START',
              fontSize: 14,
              fontStyle: 'bold',
              fill: '#9c27b0',
              width: 4 * scale,
              padding: 5,
              align: 'center',
              y: (4 * scale) / 2 - 7
            }" />
          </v-group>

        </v-layer>
      </v-stage>
    </div>

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
        <div v-if="userMaps.length === 0" class="empty-state">No saved maps found.</div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  gap: 20px;
}

.controls {
  width: 250px;
  background: #f5f5f5;
  padding: 1rem;
  max-height: 90vh;
  overflow-y: auto;
}

.canvas-wrapper {
  border: 2px solid #333;
}

/* SAAS HEADER */
.saas-header {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.auth-form input {
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.auth-buttons {
  display: flex;
  gap: 5px;
  margin-top: 5px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  font-weight: bold;
}

.error-msg {
  color: red;
  font-size: 0.8em;
}

.forgot-link {
  font-size: 0.85rem;
  color: #007bff;
  text-decoration: none;
  cursor: pointer;
  margin-top: 5px;
}

.forgot-link:hover {
  text-decoration: underline;
}

/* FILE ACTIONS */
.file-actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
}

.map-name-input {
  width: 95%;
  padding: 5px;
  font-weight: bold;
}

.btn-group {
  display: flex;
  gap: 5px;
}

.btn-group button {
  flex: 1;
  padding: 5px;
  cursor: pointer;
  font-size: 0.9em;
}

/* GENERAL BUTTONS */
.btn-primary {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  flex: 1;
}

.btn-secondary {
  background-color: #008CBA;
  color: white;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  flex: 1;
}

.btn-small {
  padding: 2px 6px;
  font-size: 0.8em;
  cursor: pointer;
}

/* CONTROLS */
.layer-select button,
.toolbox button {
  margin-right: 5px;
  padding: 5px 10px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: white;
  border-radius: 3px;
}

.layer-select button.active,
.toolbox button.active {
  background: #333;
  color: white;
}

.toolbox {
  margin-bottom: 20px;
  margin-top: 10px;
}

/* SETTINGS */
.level-control {
  margin-bottom: 10px;
}

.level-control select {
  width: 100%;
  padding: 5px;
}

.ring-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.ring-controls input {
  width: 50px;
  padding: 4px;
}

/* STATS */
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

.delta.positive {
  color: #388e3c;
}

.delta {
  color: #d32f2f;
  font-weight: bold;
}

.instructions ul {
  padding-left: 20px;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* MODAL */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 350px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.map-list {
  list-style: none;
  padding: 0;
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

.delete-btn:hover {
  background: #ffebee;
  border-color: red;
}

.empty-state {
  text-align: center;
  color: #888;
  padding: 20px;
}

.guidelines-box {
  background: #e3f2fd;
  /* Light Blue */
  border: 1px solid #90caf9;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 0.9em;
}

.guidelines-box h5 {
  margin: 0 0 5px 0;
  color: #1565c0;
  text-transform: uppercase;
  font-size: 0.85em;
}

.guide-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}

.guide-note {
  margin-top: 5px;
  font-style: italic;
  color: #555;
  font-size: 0.85em;
  line-height: 1.4;
  border-top: 1px solid #bbdefb;
  padding-top: 5px;
}

.warning-text {
  color: #d32f2f;
  font-weight: bold;
  margin-top: 5px;
  text-align: center;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  padding: 2px;
}

/* MOBILE RESPONSIVENESS */
@media (max-width: 768px) {
  .editor-container {
    flex-direction: column;
    /* Stack controls on top of map */
  }

  .controls {
    width: 100%;
    /* Full width */
    max-height: 250px;
    /* Limit height so it doesn't push map off screen */
    overflow-y: auto;
    /* Scrollable controls */
    box-sizing: border-box;
    padding: 10px;
  }

  /* Make the tools grid tighter on mobile */
  .toolbox,
  .file-actions,
  .saas-header {
    display: flex;
    flex-wrap: wrap;
    /* Allow buttons to wrap to next line */
    gap: 8px;
  }

  .canvas-wrapper {
    width: 100%;
    height: 60vh;
    /* Use remaining screen height */
    overflow: auto;
    /* Allow scrolling/panning the map! */
    -webkit-overflow-scrolling: touch;
    /* Smooth scroll on iOS */
    border-top: 2px solid #333;
  }
}

.action-tools button {
  background: #fff3e0;
  /* Different color to distinguish Actions */
  border-color: #ffcc80;
}

.action-tools button.active {
  background: #e65100;
  color: white;
}
</style>
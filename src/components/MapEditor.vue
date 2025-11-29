<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useUserStore } from '../stores/userStore'
import QRCode from 'qrcode'

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

async function toggleShare() {
  if (!store.currentMapId) {
    alert("You must save the map first before sharing.")
    return
  }
  
  // Toggle state locally
  store.isShared = !store.isShared
  
  // Save immediately to update Firestore rules/permissions
  await store.saveToCloud()
}

function getBaleColor(layer) {
  switch(layer) {
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
    case 'top':    return [cx, cy + size, cx, cy - size]
    case 'bottom': return [cx, cy - size, cx, cy + size]
    case 'left':   return [cx + size, cy, cx - size, cy]
    case 'right':  return [cx - size, cy, cx + size, cy]
    default: return []
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

function handleStageMouseDown(e) {
  // Standard boilerplate
  if (e.target !== e.target.getStage()) return
  const pointer = e.target.getStage().getPointerPosition()
  const x = (pointer.x - GRID_OFFSET) / scale
  const y = (pointer.y - GRID_OFFSET) / scale

  if (x < 0 || y < 0) return 

  // Logic Router
  if (store.activeTool === 'bale') {
    store.addBale(x, y)
  } else if (store.activeTool === 'board') {
    store.startDrawingBoard(x, y) // <--- NEW ACTION
  } else if (store.activeTool === 'startbox') {
    store.addStartBox(x, y)
  } else if (store.activeTool === 'dcmat') {
    store.addDCMat(x, y)
  } else if (store.activeTool === 'hide') {
    store.addHide(x, y)
  }
}

function handleStageMouseMove(e) {
  // Only care if we are currently drawing a board
  if (store.activeTool === 'board' && store.isDrawingBoard) {
    const pointer = e.target.getStage().getPointerPosition()
    const x = (pointer.x - GRID_OFFSET) / scale
    const y = (pointer.y - GRID_OFFSET) / scale
    store.updateDrawingBoard(x, y)
  }
}

function handleStageMouseUp() {
  if (store.activeTool === 'board') {
    store.stopDrawingBoard()
  }
}

function handleRightClick(e, baleId) {
  e.evt.preventDefault()
  store.rotateBale(baleId)
}

function handleRightClickBoard(e, id) {
  e.evt.preventDefault()
  store.rotateBoard(id) // Renamed action
}

function handleRightClickDC(e, id) {
  e.evt.preventDefault()
  store.rotateDCMat(id)
}

function handleLeftClick(e, baleId) {
  // Mobile Action Tools
  if (store.activeTool === 'rotate') { store.rotateBale(baleId); return }
  if (store.activeTool === 'type') { store.cycleOrientation(baleId); return }
  if (store.activeTool === 'lean') { store.cycleLean(baleId); return }
  if (store.activeTool === 'delete') { store.removeBale(baleId); return }

  // Desktop Modifiers
  if (e.evt.shiftKey) { store.cycleOrientation(baleId); return }
  if (e.evt.altKey) { store.cycleLean(baleId); return }
}

function handleBoardClick(e, id) {
   if (store.activeTool === 'rotate') store.rotateBoardEdge(id)
   if (store.activeTool === 'delete') store.removeBoardEdge(id)
}

function handleDCClick(e, id) {
  if (store.activeTool === 'rotate') store.rotateDCMat(id)
  if (store.activeTool === 'delete') store.removeDCMat(id)
}

function handleHideClick(e, id) {
  if (store.activeTool === 'delete') { store.removeHide(id); return }
  store.cycleHideType(id)
}

// Double Click Handlers (Left Click Only)
function handleDblClick(e, baleId) { if (e.evt.button === 0) store.removeBale(baleId) }
function handleBoardDblClick(e, id) { if (e.evt.button === 0) store.removeBoardEdge(id) }
function handleDblClickDC(e, id) { if (e.evt.button === 0) store.removeDCMat(id) }
function handleDblClickHide(e, id) { if (e.evt.button === 0) store.removeHide(id) }

function handleBoardHandleDrag(e, boardId, whichPoint) {
  const node = e.target
  // Get absolute position of the handle
  const absPos = node.getAbsolutePosition()
  
  // Convert to Relative Grid Pixels (subtracting the Grid Layer offset)
  const relX = absPos.x - GRID_OFFSET
  const relY = absPos.y - GRID_OFFSET
  
  // Convert to Feet
  const rawX = relX / scale
  const rawY = relY / scale
  
  // Update Store
  store.updateBoardEndpoint(boardId, whichPoint, rawX, rawY)
  
  // Visual Reset (Snap back to exact grid position visually)
  // This prevents "drift" if the math was slightly fuzzy
  const snappedX = (Math.round(rawX * 2) / 2) * scale
  const snappedY = (Math.round(rawY * 2) / 2) * scale
  node.position({ x: snappedX, y: snappedY })
}

function dragBoundFunc(pos) {
  const node = this
  const stage = node.getStage()
  
  // Get the Grid Layer's absolute position (which is 30,30)
  const layer = node.getLayer()
  const layerAbs = layer.getAbsolutePosition()
  
  // Calculate where the node is RELATIVE to the grid (0,0 is top-left of grid)
  // We subtract the Layer's position from the Mouse position
  const relativeX = pos.x - layerAbs.x
  const relativeY = pos.y - layerAbs.y
  
  // We want to snap the TOP-LEFT corner of the bale, not the center.
  // So we subtract the internal offset (center point)
  const topLeftX = relativeX - node.offsetX()
  const topLeftY = relativeY - node.offsetY()
  
  // Snap to 6-inch increments (Scale / 2 = 20px)
  const step = scale / 2
  const snappedTopLeftX = Math.round(topLeftX / step) * step
  const snappedTopLeftY = Math.round(topLeftY / step) * step
  
  // Add the offset back to get the Center position
  const finalRelativeX = snappedTopLeftX + node.offsetX()
  const finalRelativeY = snappedTopLeftY + node.offsetY()
  
  // Convert back to Absolute Position for Konva
  return {
    x: finalRelativeX + layerAbs.x,
    y: finalRelativeY + layerAbs.y
  }
}

function handleDragEnd(e, baleId) {
  const node = e.target
  const layer = node.getLayer()
  const layerAbs = layer.getAbsolutePosition()
  
  // 1. Get absolute position (Center of the bale)
  const absPos = node.getAbsolutePosition()
  const relX = absPos.x - layerAbs.x
  const relY = absPos.y - layerAbs.y
  
  // 2. Determine Visual Dimensions to find Top-Left
  // We can't just use node.offsetX() because that's the internal anchor.
  // We need to know the rotation to subtract the correct amount.
  const bale = store.bales.find(b => b.id === baleId)
  if (!bale) return

  const dims = getBaleDims(bale)
  const isRotated = bale.rotation % 180 !== 0
  
  // Visual distance from Center to Left/Top
  const centerToLeft = (isRotated ? dims.height : dims.width) / 2
  const centerToTop = (isRotated ? dims.width : dims.height) / 2

  // 3. Calculate Raw Grid Coordinates
  const rawX = (relX / scale) - centerToLeft
  const rawY = (relY / scale) - centerToTop
  
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

// --- MODALS (Load & Randomizer) ---
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

const showRandomizerModal = ref(false)
const blindCount = ref(5)

// --- PRINTING ---
async function handlePrint() {
  const originalLayer = store.currentLayer
  const images = []
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // 1. Capture Map Layers
  for (let i = 1; i <= 3; i++) {
    store.currentLayer = i
    await wait(150) 
    const dataUrl = stageRef.value.getStage().toDataURL({ pixelRatio: 2 })
    images.push(dataUrl)
  }
  store.currentLayer = originalLayer

  // 2. Generate QR Code HTML (Only if Shared)
  let qrHtml = ''
  if (store.currentMapId && store.isShared) {
    // Construct the public URL
    const url = `${window.location.origin}/view/${store.currentMapId}`
    
    try {
      // Generate the QR image data
      const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 })
      
      qrHtml = `
        <div class="page break-before" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 90vh;">
          <div style="border: 4px solid #4CAF50; padding: 40px; border-radius: 20px; text-align: center;">
            <h1 style="color: #2c3e50; font-size: 2.5em; margin-bottom: 10px;">Course Builder Access</h1>
            <p style="font-size: 1.2em; color: #666; margin-bottom: 30px;">Scan this code to view interactive map layers on your phone.</p>
            <img src="${qrDataUrl}" style="border: 2px solid #eee; border-radius: 10px;" />
            <p style="margin-top: 30px; font-family: monospace; background: #f5f5f5; padding: 15px; border-radius: 8px; font-size: 0.9em;">
              ${url}
            </p>
          </div>
        </div>
      `
    } catch (e) {
      console.error("QR Generation failed", e)
    }
  }

  // 3. Prepare Confidential Blinds HTML (Master Only)
  let blindsHtml = ''
  if (store.masterBlinds && store.masterBlinds.length > 0) {
    const rows = store.masterBlinds.map((blind, index) => `
      <tr><td class="blind-num">Blind ${index + 1}</td><td class="blind-seq">${blind.join(' - ')}</td></tr>
    `).join('')

    blindsHtml = `
      <div class="page break-before">
        <div class="confidential-header"><h1>CONFIDENTIAL - JUDGE ONLY</h1><p>Master Rat Randomization</p></div>
        <table class="blinds-table"><thead><tr><th>Blind Number</th><th>Rat Locations (1-5)</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="note"><p><strong>Instructions:</strong> Use this sequence to place rats for each blind.</p></div>
      </div>`
  }

  // 4. Generate Print Window
  const win = window.open('', '_blank')
  
  win.document.write(`
    <html>
      <head>
        <title>Print Map - ${store.mapName}</title>
        <style>
          body { font-family: sans-serif; text-align: center; color: #333; }
          .page { padding: 20px; box-sizing: border-box; page-break-after: always; }
          .break-before { page-break-before: always; }
          img { max-width: 100%; border: 1px solid #ccc; margin-bottom: 10px; }
          .stats { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; display: inline-block; background: #f9f9f9; }
          
          /* Blinds Styles */
          .confidential-header { border-bottom: 4px solid #d32f2f; margin-bottom: 30px; }
          .confidential-header h1 { color: #d32f2f; margin: 0; font-size: 24pt; }
          .blinds-table { width: 80%; margin: 0 auto; border-collapse: collapse; font-size: 14pt; }
          .blinds-table th { background: #333; color: white; padding: 10px; text-align: left; }
          .blinds-table td { border-bottom: 1px solid #ccc; padding: 15px 10px; text-align: left; }
          .blind-num { font-weight: bold; width: 30%; }
          .blind-seq { font-family: monospace; font-size: 1.2em; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        ${qrHtml}

        <div class="page">
          <div class="stats"><strong>${store.mapName} (${store.classLevel})</strong><br>Total: ${store.inventory.total}</div>
          <h2>Layer 1 (Base)</h2><img src="${images[0]}" />
        </div>
        
        <div class="page"><h2>Layer 2</h2><img src="${images[1]}" /></div>
        <div class="page"><h2>Layer 3</h2><img src="${images[2]}" /></div>
        
        ${blindsHtml}
        
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
        <div class="nav-row">
          <button @click="$router.push('/dashboard')" class="btn-text">← Dashboard</button>
        </div>
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
            <button 
              @click="store.saveToCloud" 
              :disabled="!userStore.user || !userStore.can('save_cloud')" 
              :title="userStore.can('save_cloud') ? 'Save' : 'Club Upgrade Required'"
            >
              ☁️ Save {{ !userStore.can('save_cloud') ? '🔒' : '' }}
            </button>
            
            <button @click="openLoadModal" :disabled="!userStore.user">📂 Open</button>

            <button 
              @click="toggleShare" 
              :disabled="!userStore.can('save_cloud') || !store.currentMapId"
              :style="{ backgroundColor: store.isShared ? '#4CAF50' : '#f0f0f0', color: store.isShared ? 'white' : '#333' }"
              title="Make this map public via link/QR code"
            >
              {{ store.isShared ? '🔗 Shared' : '🔒 Private' }}
            </button>
          </div>
          <div class="btn-group">
            <button @click="store.exportMapToJSON" :disabled="!userStore.can('export_json')">⬇️ Export {{ !userStore.can('export_json') ? '🔒' : '' }}</button>
            <button @click="fileInput.click()">⬆️ Import</button>
            <button @click="handlePrint">🖨️ Print</button>
            <button v-if="store.classLevel === 'Master'" @click="showRandomizerModal = true" style="background-color: #673ab7; color: white; border: none;">🎲 Randomizer</button>
            <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleFileImport" />
          </div>
        </div>
      </div>
      <hr />

      <h3>Layer Control</h3>
      <div class="layer-select">
        <button v-for="i in 3" :key="i" @click="store.currentLayer = i" :class="{ active: store.currentLayer === i }">Layer {{ i }}</button>
      </div>

      <div class="toolbox">
        <h4>Placement Tools</h4>
        <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }">📦 Bale</button>
        <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Board</button>
        <button @click="store.setTool('startbox')" :class="{ active: store.activeTool === 'startbox' }">🔲 Start</button>
        <button @click="store.setTool('dcmat')" :class="{ active: store.activeTool === 'dcmat' }">🟧 DC Mat</button>
        <button @click="userStore.can('mark_hides') ? store.setTool('hide') : alert('Pro Feature')" :class="{ active: store.activeTool === 'hide', disabled: !userStore.can('mark_hides') }">🔴 Hide {{ !userStore.can('mark_hides') ? '🔒' : '' }}</button>
      </div>

      <div class="toolbox action-tools">
        <h4>Action Tools</h4>
        <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">🔄 Rotate</button>
        <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }">📐 Type</button>
        <button @click="store.setTool('lean')" :class="{ active: store.activeTool === 'lean' }">↗️ Lean</button>
        <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete</button>
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
        <div class="guide-row"><span>Min Bales:</span> <strong>{{ store.currentGuidelines.minBales }}</strong></div>
        <div class="guide-row"><span>Max Bales:</span> <strong>{{ store.currentGuidelines.maxBales }}</strong></div>
        <div class="guide-note">{{ store.currentGuidelines.notes }}</div>
        <div v-if="store.inventory.total < store.currentGuidelines.minBales" class="warning-text">⚠️ Need {{ store.currentGuidelines.minBales - store.inventory.total }} more bales!</div>
      </div>

      <div class="ring-controls">
        <label>Width (ft):<input type="number" :value="store.ringDimensions.width" @change="store.resizeRing($event.target.value, store.ringDimensions.height)" /></label>
        <label>Height (ft):<input type="number" :value="store.ringDimensions.height" @change="store.resizeRing(store.ringDimensions.width, $event.target.value)" /></label>
      </div>

      <div class="stats-panel">
        <h4>Bale Inventory</h4>
        <div class="stat-row main-stat"><span>Total Bales:</span><strong>{{ store.inventory.total }}</strong></div>
        <div class="stat-row"><span>Base Layer (L1):</span><span>{{ store.inventory.base }}</span></div>
        <hr>
        <div class="nesting-control">
          <label>Previous Class Count:</label>
          <input type="number" v-model.number="store.previousClassCount" placeholder="e.g. 40">
        </div>
        <div class="stat-row delta" :class="{ 'positive': store.inventory.total >= store.previousClassCount }">
          <span>Nesting Delta:</span><strong>{{ store.inventory.deltaString }} bales</strong>
        </div>
      </div>
    </div>

    <div class="canvas-wrapper">
      <v-stage 
        ref="stageRef" 
        :config="stageConfig" 
        @mousedown="handleStageMouseDown"
        @mousemove="handleStageMouseMove"
        @mouseup="handleStageMouseUp"
        @touchstart="handleStageMouseDown" 
        @touchmove="handleStageMouseMove"
        @touchend="handleStageMouseUp"
      >
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
          <v-text v-for="n in store.ringDimensions.width + 1" :key="'lx'+n" :config="{ x: (n-1) * scale, y: -20, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'center', width: 10, offsetX: 5 }" />
          <v-text v-for="n in store.ringDimensions.height + 1" :key="'ly'+n" :config="{ x: -25, y: (n-1) * scale - 6, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'right', width: 20 }" />
          <v-line v-for="n in store.ringDimensions.width + 1" :key="'v'+n" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height * scale], stroke: (n-1) % 5 === 0 ? '#999' : '#ddd', strokeWidth: 1 }" />
          <v-line v-for="n in store.ringDimensions.height + 1" :key="'h'+n" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width * scale, (n-1)*scale], stroke: (n-1) % 5 === 0 ? '#999' : '#ddd', strokeWidth: 1 }" />

          <v-group
            v-for="bale in visibleBales"
            :key="bale.id"
            :config="{
              draggable: true,
              dragBoundFunc: dragBoundFunc,
              listening: bale.layer === store.currentLayer,
              rotation: bale.rotation,
              opacity: getOpacity(bale.layer),
              
              // GEOMETRY FIX:
              ...(() => {
                 const dims = getBaleDims(bale) // Get raw dimensions (e.g. 3 x 1.5)
                 
                 // Check if rotated 90 or 270 degrees
                 const isRotated = bale.rotation % 180 !== 0
                 
                 // If rotated, the 'Visual' width is actually the height
                 const visualW = (isRotated ? dims.height : dims.width) * scale
                 const visualH = (isRotated ? dims.width : dims.height) * scale
                 
                 return {
                   // Calculate Center based on VISUAL dimensions
                   x: (bale.x * scale) + (visualW / 2),
                   y: (bale.y * scale) + (visualH / 2),
                   
                   // Offset (Anchor) remains based on INTERNAL dimensions
                   // (Konva rotates around this internal point)
                   offsetX: (dims.width * scale) / 2,
                   offsetY: (dims.height * scale) / 2
                 }
              })()
            }"
            @contextmenu="handleRightClick($event, bale.id)"
            @dblclick="handleDblClick($event, bale.id)"
            @click="handleLeftClick($event, bale.id)"
            @tap="handleLeftClick($event, bale.id)"
            @dragend="handleDragEnd($event, bale.id)" 
          >
            <v-rect
              :config="{
                x: 0, 
                y: 0,
                width: getBaleDims(bale).width * scale,
                height: getBaleDims(bale).height * scale,
                
                fill: !bale.supported ? '#ef5350' : (bale.orientation === 'flat' ? getBaleColor(bale.layer) : undefined),
                fillPatternImage: !bale.supported ? undefined : (bale.orientation === 'tall' ? hatchPattern : (bale.orientation === 'pillar' ? pillarPattern : undefined)),
                fillPatternRepeat: 'repeat',
                stroke: !bale.supported ? '#b71c1c' : (bale.orientation === 'flat' ? 'black' : (bale.orientation === 'pillar' ? '#d32f2f' : getBaleColor(bale.layer))),
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
                   // No extra offset needed now, relative to group 0,0
                   const pts = getArrowPoints(w, h, bale.lean) 
                   return pts
                })(),
                pointerLength: 10,
                pointerWidth: 10,
                fill: 'black',
                stroke: 'black',
                strokeWidth: 4
              }"
            />
          </v-group>

          <v-group v-for="hide in store.hides" :key="hide.id" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: hide.x * scale, y: hide.y * scale }" @contextmenu.prevent="store.cycleHideType(hide.id)" @dblclick="handleDblClickHide($event, hide.id)" @click="handleHideClick($event, hide.id)" @tap="handleHideClick($event, hide.id)">
            <v-circle :config="{ radius: 0.3 * scale, fill: hide.type === 'rat' ? '#d32f2f' : (hide.type === 'litter' ? '#388e3c' : '#1976d2'), stroke: 'white', strokeWidth: 2 }" />
            <v-text :config="{ text: hide.type === 'rat' ? 'R' : (hide.type === 'litter' ? 'L' : 'E'), fontSize: 14, fontStyle: 'bold', fill: 'white', align: 'center', x: -5, y: -6 }" />
          </v-group>

<v-group
            v-for="board in store.boardEdges"
            :key="board.id"
            @dblclick="handleBoardDblClick($event, board.id)"
            @click="handleBoardClick($event, board.id)"
            @tap="handleBoardClick($event, board.id)"
            @contextmenu="handleRightClickBoard($event, board.id)"
          >
            <v-line
              :config="{
                points: [
                  board.x1 * scale, board.y1 * scale,
                  board.x2 * scale, board.y2 * scale
                ],
                stroke: '#2e7d32',
                strokeWidth: 6,
                lineCap: 'round',
                hitStrokeWidth: 20
              }"
            />
            
            <v-circle 
              :config="{ 
                x: board.x1 * scale, 
                y: board.y1 * scale, 
                radius: 6, // Made slightly larger to grab easily
                fill: '#1b5e20',
                draggable: true, // <--- ENABLE DRAG
                dragBoundFunc: dragBoundFunc // <--- SNAP TO GRID
              }" 
              @dragend="handleBoardHandleDrag($event, board.id, 'start')"
            />
            
            <v-circle 
              :config="{ 
                x: board.x2 * scale, 
                y: board.y2 * scale, 
                radius: 6, 
                fill: '#1b5e20',
                draggable: true,
                dragBoundFunc: dragBoundFunc
              }" 
              @dragend="handleBoardHandleDrag($event, board.id, 'end')"
            />
          </v-group>

          <v-group v-for="mat in store.dcMats" :key="mat.id" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: mat.x * scale, y: mat.y * scale, rotation: mat.rotation, offsetX: (2 * scale) / 2, offsetY: (3 * scale) / 2 }" @contextmenu="handleRightClickDC($event, mat.id)" @dblclick="handleDblClickDC($event, mat.id)" @click="handleDCClick($event, mat.id)" @tap="handleDCClick($event, mat.id)">
            <v-rect :config="{ width: 2 * scale, height: 3 * scale, stroke: '#ff9800', strokeWidth: 3, fill: 'rgba(255, 152, 0, 0.2)', cornerRadius: 2, dash: [10, 5] }" />
            <v-text :config="{ text: 'DC', fontSize: 16, fontStyle: 'bold', fill: '#e65100', width: 2 * scale, padding: 0, align: 'center', y: (3 * scale) / 2 - 8 }" />
          </v-group>

          <v-group v-if="store.startBox" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: store.startBox.x * scale, y: store.startBox.y * scale }" @dblclick="store.removeStartBox()" @dragend="(e) => { const absPos = e.target.getAbsolutePosition(); store.addStartBox((absPos.x - GRID_OFFSET)/scale, (absPos.y - GRID_OFFSET)/scale) }">
            <v-rect :config="{ width: 4 * scale, height: 4 * scale, stroke: '#9c27b0', strokeWidth: 4, fill: 'rgba(156, 39, 176, 0.1)', cornerRadius: 2 }" />
            <v-text :config="{ text: 'START', fontSize: 14, fontStyle: 'bold', fill: '#9c27b0', width: 4 * scale, padding: 5, align: 'center', y: (4 * scale) / 2 - 7 }" />
          </v-group>
        </v-layer>
      </v-stage>
    </div>

    <div v-if="showLoadModal" class="modal-overlay" @click.self="showLoadModal = false">
      <div class="modal">
        <div class="modal-header"><h3>Your Saved Maps</h3><button class="close-btn" @click="showLoadModal = false">×</button></div>
        <ul class="map-list">
          <li v-for="map in userMaps" :key="map.id" class="map-item">
            <div class="map-info" @click="selectMap(map)"><span class="map-title">{{ map.name }}</span><small>{{ new Date(map.updatedAt.seconds * 1000).toLocaleDateString() }}</small></div>
            <div class="map-actions"><button @click.stop="handleRenameMap(map)">✏️</button><button @click.stop="handleDeleteMap(map)" class="delete-btn">🗑️</button></div>
          </li>
        </ul>
        <div v-if="userMaps.length === 0" class="empty-state">No saved maps found.</div>
      </div>
    </div>

    <div v-if="showRandomizerModal" class="modal-overlay" @click.self="showRandomizerModal = false">
      <div class="modal">
        <div class="modal-header"><h3>Master Blind Randomizer</h3><button class="close-btn" @click="showRandomizerModal = false">×</button></div>
        <div class="randomizer-controls">
          <label>Number of Blinds:</label><input type="number" v-model.number="blindCount" min="1" max="20" class="small-input">
          <button @click="store.generateMasterBlinds(blindCount)" class="btn-primary">Generate</button>
        </div>
        <p class="small-note">ℹ️ These numbers will be printed on a <strong>separate, confidential page</strong> when you click Print.</p>
        <div v-if="store.masterBlinds.length > 0" class="results-list">
          <div v-for="(blind, index) in store.masterBlinds" :key="index" class="blind-row"><strong>Blind {{ index + 1 }}:</strong><span class="numbers">{{ blind.join(' - ') }}</span></div>
        </div>
        <div v-else class="empty-state">No blinds generated yet.</div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.editor-container { display: flex; gap: 20px; }
.controls { width: 250px; background: #f5f5f5; padding: 1rem; max-height: 90vh; overflow-y: auto; }
.canvas-wrapper { border: 2px solid #333; }
.saas-header { margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px; }
.auth-form { display: flex; flex-direction: column; gap: 5px; }
.auth-form input { padding: 5px; border: 1px solid #ccc; border-radius: 4px; }
.auth-buttons { display: flex; gap: 5px; margin-top: 5px; }
.user-info { display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; font-weight: bold; }
.error-msg { color: red; font-size: 0.8em; }
.forgot-link { font-size: 0.85rem; color: #007bff; text-decoration: none; cursor: pointer; margin-top: 5px; }
.forgot-link:hover { text-decoration: underline; }
.nav-row { margin-bottom: 5px; }
.btn-text { background: none; border: none; color: #666; cursor: pointer; font-weight: bold; padding: 0; }
.btn-text:hover { text-decoration: underline; color: #333; }
.file-actions { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.map-name-input { width: 95%; padding: 5px; font-weight: bold; }
.btn-group { display: flex; gap: 5px; flex-wrap: wrap; }
.btn-group button { flex: 1; padding: 5px; cursor: pointer; font-size: 0.9em; min-width: 60px; }
.btn-primary { background-color: #4CAF50; color: white; border: none; padding: 6px; cursor: pointer; border-radius: 4px; flex: 1; }
.btn-secondary { background-color: #008CBA; color: white; border: none; padding: 6px; cursor: pointer; border-radius: 4px; flex: 1; }
.btn-small { padding: 2px 6px; font-size: 0.8em; cursor: pointer; }
.layer-select button, .toolbox button { margin-right: 5px; padding: 5px 10px; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 3px; }
.layer-select button.active, .toolbox button.active { background: #333; color: white; }
.toolbox { margin-bottom: 20px; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px; }
.level-control { margin-bottom: 10px; }
.level-control select { width: 100%; padding: 5px; }
.ring-controls { display: flex; gap: 10px; margin-bottom: 10px; }
.ring-controls input { width: 50px; padding: 4px; }
.stats-panel { background: #fff; border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
.stat-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
.main-stat { font-size: 1.1em; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
.small-text { font-size: 0.85em; color: #666; }
.nesting-control { display: flex; flex-direction: column; margin-bottom: 8px; }
.delta.positive { color: #388e3c; }
.delta { color: #d32f2f; font-weight: bold; }
.instructions ul { padding-left: 20px; margin: 0; font-size: 0.9rem; line-height: 1.6; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; padding: 20px; border-radius: 8px; min-width: 350px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.map-list { list-style: none; padding: 0; overflow-y: auto; }
.map-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
.map-item:hover { background-color: #f9f9f9; }
.map-info { flex-grow: 1; cursor: pointer; display: flex; flex-direction: column; }
.map-title { font-weight: bold; }
.map-actions { display: flex; gap: 5px; }
.delete-btn:hover { background: #ffebee; border-color: red; }
.empty-state { text-align: center; color: #888; padding: 20px; }
.guidelines-box { background: #e3f2fd; border: 1px solid #90caf9; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; }
.guidelines-box h5 { margin: 0 0 5px 0; color: #1565c0; text-transform: uppercase; font-size: 0.85em; }
.guide-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
.guide-note { margin-top: 5px; font-style: italic; color: #555; font-size: 0.85em; line-height: 1.4; border-top: 1px solid #bbdefb; padding-top: 5px; }
.warning-text { color: #d32f2f; font-weight: bold; margin-top: 5px; text-align: center; background: rgba(255, 255, 255, 0.5); border-radius: 4px; padding: 2px; }
.randomizer-controls { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
.small-input { width: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.results-list { max-height: 300px; overflow-y: auto; }
.blind-row { display: flex; justify-content: space-between; padding: 10px; background: #f9f9f9; margin-bottom: 5px; border-radius: 4px; }
.numbers { font-family: monospace; font-size: 1.2em; color: #673ab7; font-weight: bold; }
.small-note { font-size: 0.85em; color: #666; margin-bottom: 15px; background: #e3f2fd; padding: 8px; border-radius: 4px; }
.action-tools button { background: #fff3e0; border-color: #ffcc80; }
.action-tools button.active { background: #e65100; color: white; }

@media (max-width: 768px) {
  .editor-container { flex-direction: column; }
  .controls { width: 100%; max-height: 250px; overflow-y: auto; padding: 10px; }
  .toolbox, .file-actions, .saas-header { display: flex; flex-wrap: wrap; gap: 8px; }
  .canvas-wrapper { width: 100%; height: 60vh; overflow: auto; -webkit-overflow-scrolling: touch; border-top: 2px solid #333; }
}
</style>
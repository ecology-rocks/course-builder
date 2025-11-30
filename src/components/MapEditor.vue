<script setup>
import { computed, ref, onMounted } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useUserStore } from '../stores/userStore'
import EditorSidebar from './editor/EditorSidebar.vue'
import QRCode from 'qrcode' // Needed for Print logic only
import { useAutosave } from '@/composables/useAutosave' // Import the helper

const store = useMapStore()
const userStore = useUserStore()
const { enableAutosave, checkAutosave, clearAutosave } = useAutosave()
// --- CONSTANTS & CONFIG ---
const scale = 40
const GRID_OFFSET = 30 
const stageRef = ref(null) 

const stageConfig = computed(() => ({
  width: (store.ringDimensions.width * scale) + (GRID_OFFSET * 2),
  height: (store.ringDimensions.height * scale) + (GRID_OFFSET * 2)
}))


onMounted(() => {
  // 1. If we are NOT loading a cloud map (ID is null), check for local work
  if (!store.currentMapId) {
    const savedData = checkAutosave()
    if (savedData) {
      if (confirm("We found unsaved work from your last session. Would you like to restore it?")) {
        store.importMapFromData(savedData) // We need to add this small helper to store
      } else {
        clearAutosave() // User declined, clear the stale data
      }
    }
  }
  
  // 2. Turn on the watcher
  enableAutosave()
})

// --- VISUAL HELPERS ---
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fillRect(0,0,20,20)
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, 0); ctx.stroke()
  return canvas
})()

const pillarPattern = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 20; canvas.height = 20
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fillRect(0,0,20,20)
  ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 20); ctx.moveTo(20, 0); ctx.lineTo(0, 20); ctx.stroke()
  return canvas
})()

// --- GEOMETRY HELPERS ---
function getBaleDims(bale) {
  if (bale.orientation === 'pillar') return { width: 1.5, height: 1.0 }
  if (bale.orientation === 'tall') return { width: 3.0, height: 1.0 }
  return { width: 3.0, height: 1.5 }
}

function getArrowPoints(width, height, direction) {
  const cx = width / 2; const cy = height / 2; const size = Math.min(width, height) * 0.4
  switch (direction) {
    case 'top': return [cx, cy + size, cx, cy - size]
    case 'bottom': return [cx, cy - size, cx, cy + size]
    case 'left': return [cx + size, cy, cx - size, cy]
    case 'right': return [cx - size, cy, cx + size, cy]
    default: return []
  }
}

// --- MOUSE HANDLERS ---
function handleStageMouseDown(e) {
  if (e.target !== e.target.getStage()) return
  const pointer = e.target.getStage().getPointerPosition()
  const x = (pointer.x - GRID_OFFSET) / scale
  const y = (pointer.y - GRID_OFFSET) / scale
  if (x < 0 || y < 0) return 

  if (store.activeTool === 'bale') store.addBale(x, y)
  else if (store.activeTool === 'board') store.startDrawingBoard(x, y)
  else if (store.activeTool === 'startbox') store.addStartBox(x, y)
  else if (store.activeTool === 'dcmat') store.addDCMat(x, y)
  else if (store.activeTool === 'hide') store.addHide(x, y)
}

function handleStageMouseMove(e) {
  if (store.activeTool === 'board' && store.isDrawingBoard) {
    const pointer = e.target.getStage().getPointerPosition()
    store.updateDrawingBoard((pointer.x - GRID_OFFSET)/scale, (pointer.y - GRID_OFFSET)/scale)
  }
}

function handleStageMouseUp() {
  if (store.activeTool === 'board') store.stopDrawingBoard()
}

function handleRightClick(e, baleId) { e.evt.preventDefault(); store.rotateBale(baleId) }
function handleRightClickBoard(e, id) { e.evt.preventDefault(); store.rotateBoard(id) }
function handleRightClickDC(e, id) { e.evt.preventDefault(); store.rotateDCMat(id) }

function handleLeftClick(e, baleId) {
  if (store.activeTool === 'rotate') { store.rotateBale(baleId); return }
  if (store.activeTool === 'type') { store.cycleOrientation(baleId); return }
  if (store.activeTool === 'lean') { store.cycleLean(baleId); return }
  if (store.activeTool === 'delete') { store.removeBale(baleId); return }
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

function handleDblClick(e, baleId) { if (e.evt.button === 0) store.removeBale(baleId) }
function handleBoardDblClick(e, id) { if (e.evt.button === 0) store.removeBoardEdge(id) }
function handleDblClickDC(e, id) { if (e.evt.button === 0) store.removeDCMat(id) }
function handleDblClickHide(e, id) { if (e.evt.button === 0) store.removeHide(id) }

function handleBoardHandleDrag(e, boardId, whichPoint) {
  const node = e.target; const absPos = node.getAbsolutePosition()
  const rawX = (absPos.x - GRID_OFFSET) / scale; const rawY = (absPos.y - GRID_OFFSET) / scale
  store.updateBoardEndpoint(boardId, whichPoint, rawX, rawY)
  node.position({ x: (Math.round(rawX * 2) / 2) * scale + GRID_OFFSET, y: (Math.round(rawY * 2) / 2) * scale + GRID_OFFSET })
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  
  // 1. Calculate Mouse Position relative to the Grid Layer
  const relativeX = pos.x - layerAbs.x
  const relativeY = pos.y - layerAbs.y
  
  // 2. Determine Visual Dimensions (The "Swap")
  const rotation = node.rotation()
  const isRotated = rotation % 180 !== 0
  
  // node.offsetX/Y are the INTERNAL anchors (always width/2, height/2)
  // If rotated, the visual distance to the edge swaps.
  const visualHalfWidth = isRotated ? node.offsetY() : node.offsetX()
  const visualHalfHeight = isRotated ? node.offsetX() : node.offsetY()
  
  // 3. Calculate "Visual Top-Left"
  // This is the actual pixel coordinate of the left edge of the bale
  const visualLeft = relativeX - visualHalfWidth
  const visualTop = relativeY - visualHalfHeight
  
  // 4. Snap that Edge to the Grid (6 inches = 20px)
  const step = scale / 2
  const snappedLeft = Math.round(visualLeft / step) * step
  const snappedTop = Math.round(visualTop / step) * step
  
  // 5. Calculate New Center (based on the snapped edge)
  return {
    x: snappedLeft + visualHalfWidth + layerAbs.x,
    y: snappedTop + visualHalfHeight + layerAbs.y
  }
}

function handleDragEnd(e, baleId) {
  const node = e.target
  const layerAbs = node.getLayer().getAbsolutePosition()
  
  // 1. Get Absolute Center
  const absPos = node.getAbsolutePosition()
  const relX = absPos.x - layerAbs.x
  const relY = absPos.y - layerAbs.y
  
  // 2. Determine Visual Offset
  const bale = store.bales.find(b => b.id === baleId)
  if (!bale) return

  const dims = getBaleDims(bale)
  const isRotated = bale.rotation % 180 !== 0
  
  const centerToLeft = (isRotated ? dims.height : dims.width) / 2
  const centerToTop = (isRotated ? dims.width : dims.height) / 2

  // 3. Calculate Raw Grid Coordinates
  // We pass the RAW coordinate (e.g. 1.25) because the store needs precise data
  // to render rotated items correctly.
  const rawX = (relX / scale) - centerToLeft
  const rawY = (relY / scale) - centerToTop
  
  store.updateBalePosition(baleId, rawX, rawY)
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

  // HTML GENERATION (Same as before, abbreviated here)
  const legendHtml = `<div class="legend-box"><h3>Map Key</h3><div class="l-grid"><div class="l-item"><span class="s s-bale"></span> Bale (Flat)</div><div class="l-item"><span class="s s-tall"></span> Bale (Tall)</div><div class="l-item"><span class="s s-pillar">X</span> Pillar</div><div class="l-item"><span class="s s-board"></span> Board</div><div class="l-item"><span class="s s-start">S</span> Start Box</div><div class="l-item"><span class="s s-dc">DC</span> DC Mat</div><div class="l-item"><span class="s s-rat">R</span> Rat</div><div class="l-item"><span class="s s-lit">L</span> Litter</div><div class="l-item"><span class="s s-emp">E</span> Empty</div></div></div>`
  
  let blindsHtml = ''
  if (store.masterBlinds && store.masterBlinds.length > 0) {
    const rows = store.masterBlinds.map((blind, index) => `<tr><td class="blind-num">Blind ${index + 1}</td><td class="blind-seq">${blind.join(' - ')}</td></tr>`).join('')
    blindsHtml = `<div class="page break-before"><div class="confidential-header"><h1>CONFIDENTIAL - JUDGE ONLY</h1><p>Master Rat Randomization</p></div><table class="blinds-table"><thead><tr><th>Blind Number</th><th>Rat Locations (1-5)</th></tr></thead><tbody>${rows}</tbody></table></div>`
  }

  let qrHtml = ''
  if (store.currentMapId && store.isShared) {
    try {
      const url = `${window.location.origin}/view/${store.currentMapId}`
      const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 })
      qrHtml = `<div class="page break-before" style="display:flex;flex-direction:column;align-items:center;height:90vh;justify-content:center;"><h1>Course Builder Access</h1><img src="${qrDataUrl}" style="width:300px;"/><p>${url}</p></div>`
    } catch(e) {}
  }

  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>${store.mapName}</title><style>body{font-family:sans-serif;text-align:center}.page{padding:20px;page-break-after:always}.break-before{page-break-before:always}img{max-width:90%;border:1px solid #ccc;margin-bottom:10px}.header-table{width:100%;border-collapse:collapse;margin-bottom:20px}.header-table td{border:1px solid #ccc;padding:8px;text-align:left}.header-label{font-weight:bold;background:#f0f0f0;width:15%}.legend-box{border:1px solid #333;padding:10px;margin-bottom:20px;text-align:left;font-size:0.9em}.l-grid{display:flex;flex-wrap:wrap;gap:15px}.l-item{display:flex;align-items:center;width:140px}.s{display:inline-block;width:20px;height:15px;border:1px solid black;margin-right:8px;text-align:center;font-size:10px;line-height:15px}.s-bale{background:#e6c200}.s-tall{background:repeating-linear-gradient(45deg,#fff,#fff 2px,#ccc 2px,#ccc 4px)}.s-pillar{background:white;color:red;font-weight:bold}.s-board{background:#2e7d32;height:6px;border:none}.s-start{border:2px solid #9c27b0;color:#9c27b0;font-weight:bold;background:white}.s-dc{border:2px dashed #ff9800;color:#e65100;font-weight:bold;background:white}.s-rat{background:#d32f2f;border-radius:50%;color:white;width:15px}.s-lit{background:#388e3c;border-radius:50%;color:white;width:15px}.s-emp{background:#1976d2;border-radius:50%;color:white;width:15px}.confidential-header{border-bottom:4px solid #d32f2f;margin-bottom:30px}.confidential-header h1{color:#d32f2f;margin:0;font-size:24pt}.blinds-table{width:80%;margin:0 auto;border-collapse:collapse;font-size:14pt}.blinds-table td,.blinds-table th{border:1px solid #ccc;padding:10px}</style></head><body>${qrHtml}<div class="page"><h1>${store.mapName}</h1><table class="header-table"><tr><td class="header-label">Judge:</td><td>${userStore.judgeName}</td><td class="header-label">Class:</td><td>${store.classLevel}</td><td class="header-label">Date:</td><td>${new Date().toLocaleDateString()}</td></tr><tr><td class="header-label">Total Bales:</td><td>${store.inventory.total}</td><td class="header-label">Base Layer:</td><td>${store.inventory.base}</td><td class="header-label">Nesting:</td><td>${store.inventory.deltaString}</td></tr></table>${legendHtml}<h2>Layer 1 (Base)</h2><img src="${images[0]}" /></div><div class="page break-before"><h2>Layer 2</h2><img src="${images[1]}" /></div><div class="page break-before"><h2>Layer 3</h2><img src="${images[2]}" /></div>${blindsHtml}<script>window.onload=function(){window.print()}<\/script></body></html>`)
  win.document.close()
}
</script>

<template>
  <div class="editor-container">
    
    <EditorSidebar @print="handlePrint" />

    <div class="canvas-wrapper">
      <v-stage ref="stageRef" :config="stageConfig" @mousedown="handleStageMouseDown" @mousemove="handleStageMouseMove" @mouseup="handleStageMouseUp" @touchstart="handleStageMouseDown" @touchmove="handleStageMouseMove" @touchend="handleStageMouseUp">
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
          
          <v-text v-for="n in store.ringDimensions.width + 1" :key="'lx'+n" :config="{ x: (n-1)*scale, y: -20, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'center', width: 10, offsetX: 5 }" />
          <v-text v-for="n in store.ringDimensions.height + 1" :key="'ly'+n" :config="{ x: -25, y: (n-1)*scale-6, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'right', width: 20 }" />
          <v-line v-for="n in store.ringDimensions.width + 1" :key="'v'+n" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height*scale], stroke: (n-1)%5===0?'#999':'#ddd', strokeWidth: 1 }" />
          <v-line v-for="n in store.ringDimensions.height + 1" :key="'h'+n" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width*scale, (n-1)*scale], stroke: (n-1)%5===0?'#999':'#ddd', strokeWidth: 1 }" />

          <v-group v-for="bale in visibleBales" :key="bale.id" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, listening: bale.layer === store.currentLayer, x: (bale.x*scale) + (1.5*scale), y: (bale.y*scale) + (0.75*scale), rotation: bale.rotation, opacity: getOpacity(bale.layer), ...(() => { const dims = getBaleDims(bale); const isRotated = bale.rotation % 180 !== 0; const visualW = (isRotated ? dims.height : dims.width) * scale; const visualH = (isRotated ? dims.width : dims.height) * scale; return { x: (bale.x*scale) + (visualW/2), y: (bale.y*scale) + (visualH/2), offsetX: (dims.width*scale)/2, offsetY: (dims.height*scale)/2 } })() }" @contextmenu="handleRightClick($event, bale.id)" @dblclick="handleDblClick($event, bale.id)" @click="handleLeftClick($event, bale.id)" @tap="handleLeftClick($event, bale.id)" @dragend="handleDragEnd($event, bale.id)">
            <v-rect :config="{ x: 0, y: 0, width: getBaleDims(bale).width*scale, height: getBaleDims(bale).height*scale, fill: !bale.supported ? '#ef5350' : (bale.orientation === 'flat' ? getBaleColor(bale.layer) : undefined), fillPatternImage: !bale.supported ? undefined : (bale.orientation === 'tall' ? hatchPattern : (bale.orientation === 'pillar' ? pillarPattern : undefined)), fillPatternRepeat: 'repeat', stroke: !bale.supported ? '#b71c1c' : (bale.orientation === 'flat' ? 'black' : (bale.orientation === 'pillar' ? '#d32f2f' : getBaleColor(bale.layer))), strokeWidth: !bale.supported ? 3 : (bale.orientation === 'flat' ? 1 : 2) }" />
            <v-arrow v-if="bale.lean" :config="{ points: getArrowPoints(getBaleDims(bale).width*scale, getBaleDims(bale).height*scale, bale.lean), pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4 }" />
          </v-group>

          <v-group v-for="board in store.boardEdges" :key="board.id" @dblclick="handleBoardDblClick($event, board.id)" @click="handleBoardClick($event, board.id)" @tap="handleBoardClick($event, board.id)" @contextmenu="handleRightClickBoard($event, board.id)">
            <v-line :config="{ points: [ board.x1*scale, board.y1*scale, board.x2*scale, board.y2*scale ], stroke: '#2e7d32', strokeWidth: 6, lineCap: 'round', hitStrokeWidth: 20 }" />
            <v-circle :config="{ x: board.x1*scale, y: board.y1*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'start')" />
            <v-circle :config="{ x: board.x2*scale, y: board.y2*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'end')" />
          </v-group>

          <v-group v-if="store.startBox" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: store.startBox.x*scale, y: store.startBox.y*scale }" @dblclick="store.removeStartBox()" @dragend="(e) => { const absPos = e.target.getAbsolutePosition(); const rx = (absPos.x - GRID_OFFSET)/scale; const ry = (absPos.y - GRID_OFFSET)/scale; store.addStartBox(rx, ry) }">
            <v-rect :config="{ width: 4*scale, height: 4*scale, stroke: '#9c27b0', strokeWidth: 4, fill: 'rgba(156, 39, 176, 0.1)', cornerRadius: 2 }" />
            <v-text :config="{ text: 'START', fontSize: 14, fontStyle: 'bold', fill: '#9c27b0', width: 4*scale, padding: 5, align: 'center', y: (4*scale)/2 - 7 }" />
          </v-group>

          <v-group v-for="mat in store.dcMats" :key="mat.id" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: mat.x*scale, y: mat.y*scale, rotation: mat.rotation, offsetX: (2*scale)/2, offsetY: (3*scale)/2 }" @contextmenu="handleRightClickDC($event, mat.id)" @dblclick="handleDblClickDC($event, mat.id)" @click="handleDCClick($event, mat.id)" @tap="handleDCClick($event, mat.id)">
            <v-rect :config="{ width: 2*scale, height: 3*scale, stroke: '#ff9800', strokeWidth: 3, fill: 'rgba(255, 152, 0, 0.2)', cornerRadius: 2, dash: [10, 5] }" />
            <v-text :config="{ text: 'DC', fontSize: 16, fontStyle: 'bold', fill: '#e65100', width: 2*scale, padding: 0, align: 'center', y: (3*scale)/2 - 8 }" />
          </v-group>

          <v-group v-for="hide in store.hides" :key="hide.id" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: hide.x*scale, y: hide.y*scale }" @contextmenu.prevent="store.cycleHideType(hide.id)" @dblclick="handleDblClickHide($event, hide.id)" @click="handleHideClick($event, hide.id)" @tap="handleHideClick($event, hide.id)">
            <v-circle :config="{ radius: 0.3*scale, fill: hide.type === 'rat' ? '#d32f2f' : (hide.type === 'litter' ? '#388e3c' : '#1976d2'), stroke: 'white', strokeWidth: 2, shadowColor: 'black', shadowBlur: 3, shadowOpacity: 0.3 }" />
            <v-text :config="{ text: hide.type === 'rat' ? 'R' : (hide.type === 'litter' ? 'L' : 'E'), fontSize: 14, fontStyle: 'bold', fill: 'white', align: 'center', x: -5, y: -6 }" />
          </v-group>

        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<style scoped>
.editor-container { display: flex; gap: 20px; }
.canvas-wrapper { border: 2px solid #333; }

@media (max-width: 768px) {
  .editor-container { flex-direction: column; }
  .canvas-wrapper { width: 100%; height: 60vh; overflow: auto; -webkit-overflow-scrolling: touch; border-top: 2px solid #333; }
}
</style>
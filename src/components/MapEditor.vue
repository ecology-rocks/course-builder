<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useUserStore } from '../stores/userStore'
import EditorSidebar from './editor/EditorSidebar.vue'
import QRCode from 'qrcode'

const store = useMapStore()
const userStore = useUserStore()

// --- CONSTANTS & CONFIG ---
const scale = ref(40) // Reactive scale
const GRID_OFFSET = 30 
const stageRef = ref(null) 
const wrapperRef = ref(null)
const showHides = ref(true)

const stageConfig = computed(() => ({
  width: (store.ringDimensions.width * scale.value) + (GRID_OFFSET * 2),
  height: (store.ringDimensions.height * scale.value) + (GRID_OFFSET * 2)
}))

// --- ZOOM LOGIC ---
function fitToScreen() {
  if (!wrapperRef.value) return
  
  const availableW = wrapperRef.value.clientWidth - (GRID_OFFSET * 2) - 40
  const availableH = wrapperRef.value.clientHeight - (GRID_OFFSET * 2) - 40
  
  const scaleX = availableW / store.ringDimensions.width
  const scaleY = availableH / store.ringDimensions.height
  
  let newScale = Math.min(scaleX, scaleY)
  newScale = Math.min(Math.floor(newScale), 40) // Cap at 40
  newScale = Math.max(newScale, 5) // Min 5
  
  scale.value = newScale
}

function zoom(delta) {
  const newScale = scale.value + delta
  if (newScale >= 5 && newScale <= 60) {
    scale.value = newScale
  }
}

watch(
  () => [store.sport, store.ringDimensions.width, store.ringDimensions.height],
  () => { nextTick(() => fitToScreen()) },
  { immediate: true }
)

// --- VISUAL COMPUTED ---
const visibleBales = computed(() => {
  if (store.sport !== 'barnhunt') return []
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

const visibleAgilityObstacles = computed(() => {
  if (store.sport !== 'agility') return []
  return store.agilityObstacles
})

// --- HELPERS ---
function getBaleColor(bale) {
  // 1. If unsupported (and NOT dragging), turn RED
  // We check store.activeTool != 'bale' or similar if we want to hide it while dragging, 
  // but showing it immediately is better feedback.
  if (bale.supported === false) return '#ef5350' // Red Warning

  // 2. Otherwise, standard layer colors
  switch(bale.layer) {
    case 1: return '#e6c200' // Yellow
    case 2: return '#4caf50' // Green
    case 3: return '#2196f3' // Blue
    default: return '#ccc'
  }
}

function getOpacity(layer) {
  if (layer === store.currentLayer) return 1
  return 0.5 
}

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
  if (e.evt.button !== 0) return 
  if (e.target !== e.target.getStage()) return
  
  const pointer = e.target.getStage().getPointerPosition()
  const x = (pointer.x - GRID_OFFSET) / scale.value
  const y = (pointer.y - GRID_OFFSET) / scale.value
  
  if (x < 0 || y < 0) return 

  if (store.sport === 'barnhunt') {
    if (store.activeTool === 'bale') store.addBale(x, y)
    else if (store.activeTool === 'board') store.startDrawingBoard(x, y)
    else if (store.activeTool === 'startbox') store.addStartBox(x, y)
    else if (store.activeTool === 'dcmat') store.addDCMat(x, y)
    else if (store.activeTool === 'hide') store.addHide(x, y)
  }
  else if (store.sport === 'agility') {
    if (['jump', 'tunnel', 'weave', 'contact', 'table', 'aframe', 'dogwalk', 'teeter'].includes(store.activeTool)) {
      store.addAgilityObstacle(store.activeTool, x, y)
    }
  }
}

function handleStageMouseMove(e) {
  if (store.activeTool === 'board' && store.isDrawingBoard) {
    const pointer = e.target.getStage().getPointerPosition()
    store.updateDrawingBoard((pointer.x - GRID_OFFSET)/scale.value, (pointer.y - GRID_OFFSET)/scale.value)
  }
}

function handleStageMouseUp() {
  if (store.activeTool === 'board') store.stopDrawingBoard()
}

function handleStageContextMenu(e) {
  e.evt.preventDefault()
}

// Interactions
function handleRightClick(e, id) { e.evt.preventDefault(); store.rotateBale(id) }
function handleRightClickAgility(e, id) { e.evt.preventDefault(); store.rotateAgilityObstacle(id) }
function handleRightClickBoard(e, id) { e.evt.preventDefault(); store.rotateBoard(id) }
function handleRightClickDC(e, id) { e.evt.preventDefault(); store.rotateDCMat(id) }

function handleLeftClick(e, id) {
  // === NEW: Allow placing hides on top of bales ===
  if (store.activeTool === 'hide') {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    
    // Calculate grid coordinates from the mouse pointer
    const x = (pointer.x - GRID_OFFSET) / scale.value
    const y = (pointer.y - GRID_OFFSET) / scale.value
    
    store.addHide(x, y)
    return
  }

  // === Existing Bale Tools ===
  if (store.activeTool === 'rotate') { store.rotateBale(id); return }
  if (store.activeTool === 'type') { store.cycleOrientation(id); return }
  if (store.activeTool === 'lean') { store.cycleLean(id); return }
  if (store.activeTool === 'delete') { store.removeBale(id); return }
  
  // Shortcuts
  if (e.evt.shiftKey) { store.cycleOrientation(id); return }
  if (e.evt.altKey) { store.cycleLean(id); return }
}

function handleAgilityClick(e, id) {
  if (e.evt.button !== 0) return 

  if (store.activeTool === 'delete') {
    store.removeAgilityObstacle(id)
  } else if (store.activeTool === 'rotate') {
    store.rotateAgilityObstacle(id)
  } else if (store.activeTool === 'type' || e.evt.altKey) { 
    const obs = store.agilityObstacles.find(o => o.id === id)
    if (obs) {
      if (obs.type === 'tunnel') store.cycleAgilityShape(id)
      if (obs.type === 'weave') store.cycleAgilityPoles(id)
    }
  } else if (store.activeTool === 'renumber') {
    store.renumberObstacle(id, store.nextNumber)
    store.nextNumber++ 
  }
}

function handleBoardClick(e, id) {
   if (store.activeTool === 'rotate') store.rotateBoardEdge(id)
   if (store.activeTool === 'delete') store.removeBoardEdge(id)
}
function handleDCClick(e, id) {
  if (e.evt.button !== 0) return
  if (store.activeTool === 'rotate') store.rotateDCMat(id)
  if (store.activeTool === 'delete') store.removeDCMat(id)
}
function handleHideClick(e, id) {
  if (e.evt.button !== 0) return
  if (store.activeTool === 'delete') { store.removeHide(id); return }
  store.cycleHideType(id)
}

function handleDblClick(e, id) { if (e.evt.button === 0) store.removeBale(id) }
function handleDblClickAgility(e, id) { if (e.evt.button === 0) store.removeAgilityObstacle(id) }
function handleBoardDblClick(e, id) { if (e.evt.button === 0) store.removeBoardEdge(id) }
function handleDblClickDC(e, id) { if (e.evt.button === 0) store.removeDCMat(id) }
function handleDblClickHide(e, id) { if (e.evt.button === 0) store.removeHide(id) }

// --- SNAPPING LOGIC ---

// 1. Generic Snap
function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const relativeX = pos.x - layerAbs.x
  const relativeY = pos.y - layerAbs.y
  
  const step = scale.value / 2
  let snappedLeft = Math.round(relativeX / step) * step
  let snappedTop = Math.round(relativeY / step) * step
  
  const maxX = store.ringDimensions.width * scale.value
  const maxY = store.ringDimensions.height * scale.value
  
  snappedLeft = Math.max(0, Math.min(snappedLeft, maxX))
  snappedTop = Math.max(0, Math.min(snappedTop, maxY))
  
  return { x: snappedLeft + layerAbs.x, y: snappedTop + layerAbs.y }
}

// 2. Bale Snap
function baleDragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  
  const anchorX = pos.x - layerAbs.x
  const anchorY = pos.y - layerAbs.y
  
  const offsetX = 1.5 * scale.value
  const offsetY = 0.75 * scale.value
  
  const topLeftX = anchorX - offsetX
  const topLeftY = anchorY - offsetY
  
  const step = scale.value / 2
  let snappedX = Math.round(topLeftX / step) * step
  let snappedY = Math.round(topLeftY / step) * step
  
  const maxX = store.ringDimensions.width * scale.value
  const maxY = store.ringDimensions.height * scale.value
  snappedX = Math.max(0, Math.min(snappedX, maxX))
  snappedY = Math.max(0, Math.min(snappedY, maxY))
  
  return { 
    x: snappedX + offsetX + layerAbs.x, 
    y: snappedY + offsetY + layerAbs.y 
  }
}

function handleDragEnd(e, id, type) {
  const node = e.target
  const layerAbs = node.getLayer().getAbsolutePosition()
  const absPos = node.getAbsolutePosition()
  const relX = absPos.x - layerAbs.x
  const relY = absPos.y - layerAbs.y
  
  const rawX = relX / scale.value
  const rawY = relY / scale.value

  if (type === 'agility') {
    const obs = store.agilityObstacles.find(o => o.id === id)
    if (obs) { obs.x = rawX; obs.y = rawY }
  } 
  else if (type === 'bale') {
    const bale = store.bales.find(b => b.id === id)
    if (bale) {
       const finalX = rawX - 1.5
       const finalY = rawY - 0.75
       
       bale.x = Math.round(finalX * 2) / 2
       bale.y = Math.round(finalY * 2) / 2
       store.validateAllBales()
    }
  } 
  else if (type === 'hide') {
    const hide = store.hides.find(h => h.id === id)
    if (hide) { hide.x = rawX; hide.y = rawY }
  } else if (type === 'dcmat') {
    const mat = store.dcMats.find(m => m.id === id)
    if (mat) { mat.x = rawX; mat.y = rawY }
  } else if (type === 'startbox') {
    if (store.startBox) { store.startBox.x = rawX; store.startBox.y = rawY }
  }
}

function handleBoardHandleDrag(e, boardId, whichPoint) {
  const node = e.target; const absPos = node.getAbsolutePosition()
  const rawX = (absPos.x - GRID_OFFSET) / scale.value; const rawY = (absPos.y - GRID_OFFSET) / scale.value
  store.updateBoardEndpoint(boardId, whichPoint, rawX, rawY)
  node.position({ x: (Math.round(rawX * 2) / 2) * scale.value + GRID_OFFSET, y: (Math.round(rawY * 2) / 2) * scale.value + GRID_OFFSET })
}

// --- PRINTING ---
async function handlePrint(withHides = true) {
  showHides.value = withHides
  const originalScale = scale.value
  scale.value = 40 
  await nextTick()
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  await wait(100) 

  const d = new Date().toLocaleDateString()
  const logoHtml = userStore.clubLogoUrl ? `<img src="${userStore.clubLogoUrl}" class="print-logo" />` : ''
  const clubHtml = userStore.clubName ? `<div class="meta"><strong>Club:</strong> ${userStore.clubName}</div>` : ''

  const getHeader = (subtitleSuffix = '') => `
    <div class="header">
      <div class="header-left">
        ${logoHtml}
        <div class="title-block">
          <h1>${store.mapName}</h1>
          <h2>${store.classLevel} ${store.sport === 'agility' ? 'Agility' : 'Barn Hunt'} ${subtitleSuffix}</h2>
        </div>
      </div>
      <div class="header-right">
        <div class="meta"><strong>Judge:</strong> ${userStore.judgeName || '__________________'}</div>
        ${clubHtml}
        <div class="meta"><strong>Date:</strong> ${d}</div>
        <div class="meta"><strong>Size:</strong> ${store.ringDimensions.width}' x ${store.ringDimensions.height}'</div>
        <div class="sub-meta">Generated by K9CourseBuilder.com</div>
      </div>
    </div>
  `

  const printStyles = `
    @page { size: landscape; margin: 0.25in; }
    html, body { margin: 0; padding: 0; width: 100%; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
    .print-page { height: 98vh; width: 100%; display: flex; flex-direction: column; break-after: page; page-break-after: always; }
    .print-page:last-child { break-after: auto; page-break-after: auto; }
    .header { flex: 0 0 auto; display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px; }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .print-logo { height: 60px; width: auto; object-fit: contain; }
    .title-block h1 { margin: 0; font-size: 24px; line-height: 1.2; color: #000; }
    .title-block h2 { margin: 0; font-size: 16px; font-weight: normal; color: #666; }
    .header-right { text-align: right; }
    .meta { font-size: 14px; margin-bottom: 2px; }
    .sub-meta { font-size: 11px; color: #888; margin-top: 4px; }
    .map-container { flex: 1; min-height: 0; display: flex; justify-content: center; align-items: center; overflow: hidden; }
    img.map-img { max-width: 100%; max-height: 100%; object-fit: contain; border: 1px solid #eee; }
  `

  if (store.sport === 'agility') {
    const dataUrl = stageRef.value.getStage().toDataURL({ pixelRatio: 3 })
    scale.value = originalScale 
    showHides.value = true 
    
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>${store.mapName}</title><style>${printStyles}</style></head><body><div class="print-page">${getHeader()}<div class="map-container"><img src="${dataUrl}" class="map-img"/></div></div></body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print(); }, 500);
    return
  }

  const originalLayer = store.currentLayer
  const images = []
  
  store.currentLayer = 1; await wait(150);
  images.push(stageRef.value.getStage().toDataURL({ pixelRatio: 3 }))
  
  store.currentLayer = 2; await wait(150);
  images.push(stageRef.value.getStage().toDataURL({ pixelRatio: 3 }))
  
  store.currentLayer = 3; await wait(150);
  images.push(stageRef.value.getStage().toDataURL({ pixelRatio: 3 }))

  store.currentLayer = originalLayer
  scale.value = originalScale
  showHides.value = true 

  const win = window.open('', '_blank')
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>${store.mapName}</title><style>${printStyles}</style></head>
      <body>
        <div class="print-page">${getHeader('• Layer 1')}<div class="map-container"><img src="${images[0]}" class="map-img" /></div></div>
        <div class="print-page">${getHeader('• Layer 2')}<div class="map-container"><img src="${images[1]}" class="map-img" /></div></div>
        <div class="print-page">${getHeader('• Layer 3')}<div class="map-container"><img src="${images[2]}" class="map-img" /></div></div>
      </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => { win.focus(); win.print(); }, 500);
}
</script>

<template>
  <div class="editor-container">
    <EditorSidebar @print="handlePrint" />

    <div class="canvas-wrapper" ref="wrapperRef">
      
      <Transition name="fade">
        <div v-if="store.notification" class="toast-notification" :class="store.notification.type">
          {{ store.notification.message }}
        </div>
      </Transition>

      <div class="zoom-controls">
        <button @click="zoom(5)" title="Zoom In">+</button>
        <span class="zoom-label">{{ scale }}px</span>
        <button @click="zoom(-5)" title="Zoom Out">-</button>
        <button @click="fitToScreen" class="btn-fit" title="Fit to Screen">⤢ Fit</button>
      </div>

      <v-stage ref="stageRef" :config="stageConfig" @mousedown="handleStageMouseDown" @mousemove="handleStageMouseMove" @mouseup="handleStageMouseUp" @touchstart="handleStageMouseDown" @touchmove="handleStageMouseMove" @touchend="handleStageMouseUp" @contextmenu="handleStageContextMenu">
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
          
          <template v-for="n in store.ringDimensions.width + 1" :key="'v'+n">
            <v-line v-if="(n-1) % 5 === 0" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height*scale], stroke: (n-1)%10===0 ? '#999' : '#ddd', strokeWidth: 1 }" />
          </template>
          
          <template v-for="n in store.ringDimensions.height + 1" :key="'h'+n">
            <v-line v-if="(n-1) % 5 === 0" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width*scale, (n-1)*scale], stroke: (n-1)%10===0 ? '#999' : '#ddd', strokeWidth: 1 }" />
          </template>

          <template v-for="n in store.ringDimensions.width + 1" :key="'lx'+n">
            <v-text v-if="(n-1) % 10 === 0" :config="{ x: (n-1)*scale, y: -20, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'center', width: 10, offsetX: 5 }" />
          </template>
          
          <template v-for="n in store.ringDimensions.height + 1" :key="'ly'+n">
            <v-text v-if="(n-1) % 10 === 0" :config="{ x: -25, y: (n-1)*scale-6, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'right', width: 20 }" />
          </template>

          <v-group v-for="obs in visibleAgilityObstacles" :key="obs.id" 
            :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: obs.x*scale, y: obs.y*scale, rotation: obs.rotation }"
            @contextmenu="handleRightClickAgility($event, obs.id)" 
            @dblclick="handleDblClickAgility($event, obs.id)" 
            @click="handleAgilityClick($event, obs.id)"
            @dragend="handleDragEnd($event, obs.id, 'agility')"
          >
            <v-group v-if="obs.type === 'jump'">
              <v-rect :config="{ x: -2.5*scale, y: -0.5*scale, width: 5*scale, height: 1*scale, fill: 'transparent' }" />
              <v-rect :config="{ x: -2.5*scale, y: -0.05*scale, width: 5*scale, height: 0.1*scale, fill: '#1976d2' }" />
              <v-rect :config="{ x: -2.5*scale, y: -0.25*scale, width: 0.1*scale, height: 0.5*scale, fill: '#0d47a1' }" />
              <v-rect :config="{ x: 2.4*scale, y: -0.25*scale, width: 0.1*scale, height: 0.5*scale, fill: '#0d47a1' }" />
            </v-group>

            <v-group v-if="obs.type === 'tunnel'">
              <v-group v-if="!obs.shape || obs.shape === 'straight'">
                <v-rect :config="{ x: -7.5*scale, y: -1*scale, width: 15*scale, height: 2*scale, fill: '#fff176', stroke: 'black', strokeWidth: 2, cornerRadius: 5 }" />
                <v-line v-for="i in 5" :key="i" :config="{ points: [(-7.5 + (i*2.5))*scale, -1*scale, (-7.5 + (i*2.5))*scale, 1*scale], stroke: '#fbc02d', strokeWidth: 1 }" />
              </v-group>
              <v-group v-else-if="obs.shape === 'L'">
                <v-arc :config="{ x: -10*scale, y: -10*scale, innerRadius: 9*scale, outerRadius: 11*scale, angle: 90, fill: '#fff176', stroke: 'black', strokeWidth: 2, rotation: 0 }" />
              </v-group>
              <v-group v-else-if="obs.shape === 'U'">
                <v-arc :config="{ x: -5*scale, y: 0, innerRadius: 4*scale, outerRadius: 6*scale, angle: 180, fill: '#fff176', stroke: 'black', strokeWidth: 2, rotation: -90 }" />
              </v-group>
            </v-group>

            <v-group v-if="obs.type === 'weave'">
              <v-rect :config="{ x: -(((obs.poleCount || 12) * 2 * scale) / 2), y: -scale, width: (obs.poleCount || 12) * 2 * scale, height: 2 * scale, fill: 'transparent' }" />
              <v-circle v-for="i in (obs.poleCount || 12)" :key="i" :config="{ x: ((i - 1) - ((obs.poleCount || 12) - 1) / 2) * (2 * scale), y: 0, radius: 4, fill: Math.floor((i-1)/2) % 2 === 0 ? 'purple' : '#ab47bc', stroke: 'black', strokeWidth: 1 }" />
              <v-text :config="{ text: (obs.poleCount || 12).toString(), fontSize: 16, fontStyle: 'bold', fill: 'black', stroke: 'white', strokeWidth: 0.5, x: 0, y: 15, width: 40, offsetX: 20, offsetY: 8, align: 'center', rotation: -obs.rotation }" />
            </v-group>

            <v-group v-if="obs.type === 'dogwalk'">
              <v-rect :config="{ x: -12*scale, y: -0.5*scale, width: 24*scale, height: 1*scale, fill: '#81c784', stroke: '#388e3c', strokeWidth: 1 }" />
              <v-rect :config="{ x: -12*scale, y: -0.5*scale, width: 6*scale, height: 1*scale, fill: '#fff59d' }" /> 
              <v-rect :config="{ x: 6*scale, y: -0.5*scale, width: 6*scale, height: 1*scale, fill: '#fff59d' }" />
            </v-group>

            <v-group v-if="obs.type === 'aframe'">
              <v-rect :config="{ x: -4*scale, y: -1.5*scale, width: 8*scale, height: 3*scale, fill: '#81c784', stroke: '#388e3c', strokeWidth: 1 }" />
              <v-rect :config="{ x: -4*scale, y: -1.5*scale, width: 3*scale, height: 3*scale, fill: '#fff59d' }" />
              <v-rect :config="{ x: 1*scale, y: -1.5*scale, width: 3*scale, height: 3*scale, fill: '#fff59d' }" />
              <v-line :config="{ points: [0, -1.5*scale, 0, 1.5*scale], stroke: 'white', strokeWidth: 2 }" />
            </v-group>

            <v-group v-if="obs.type === 'teeter'">
              <v-rect :config="{ x: -6*scale, y: -0.5*scale, width: 12*scale, height: 1*scale, fill: '#81c784', stroke: '#388e3c', strokeWidth: 1 }" />
              <v-rect :config="{ x: -6*scale, y: -0.5*scale, width: 3*scale, height: 1*scale, fill: '#fff59d' }" />
              <v-rect :config="{ x: 3*scale, y: -0.5*scale, width: 3*scale, height: 1*scale, fill: '#fff59d' }" />
              <v-regular-polygon :config="{ x: 0, y: 0, sides: 3, radius: 0.8*scale, fill: '#555' }" />
            </v-group>

            <v-rect v-if="obs.type === 'table'" :config="{ x: -1.5*scale, y: -1.5*scale, width: 3*scale, height: 3*scale, fill: '#ffb74d', stroke: 'black' }" />

            <v-group v-if="obs.number">
              <v-circle :config="{ radius: 10, fill: 'white', stroke: 'black', strokeWidth: 1, rotation: -obs.rotation }" />
              <v-text :config="{ text: obs.number.toString(), fontSize: 12, fontStyle: 'bold', align: 'center', verticalAlign: 'middle', width: 20, height: 20, offsetX: 10, offsetY: 10, rotation: -obs.rotation }" />
            </v-group>
          </v-group>

          <v-group v-if="store.sport === 'barnhunt' && store.startBox" 
            :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: store.startBox.x * scale, y: store.startBox.y * scale }"
            @dragend="handleDragEnd($event, null, 'startbox')"
            @click="store.activeTool === 'delete' ? store.removeStartBox() : null"
          >
             <v-rect :config="{ width: 4 * scale, height: 5 * scale, fill: 'rgba(200, 200, 200, 0.5)', stroke: 'black', dash: [10, 5] }" />
             <v-text :config="{ text: 'START', width: 4 * scale, padding: 5, align: 'center', fontSize: 14 }" />
          </v-group>

          <v-group v-for="mat in store.dcMats" :key="mat.id" v-if="store.sport === 'barnhunt'"
            :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: mat.x * scale, y: mat.y * scale, rotation: mat.rotation }"
            @dragend="handleDragEnd($event, mat.id, 'dcmat')"
            @click="handleDCClick($event, mat.id)"
            @dblclick="handleDblClickDC($event, mat.id)"
            @contextmenu="handleDCClick($event, mat.id)"
          >
             <v-rect :config="{ width: 2 * scale, height: 3 * scale, fill: '#ffcc80', stroke: 'black' }" />
             <v-text :config="{ text: 'DC', fontSize: 12, x: 5, y: 5 }" />
          </v-group>

          <v-group v-for="bale in visibleBales" :key="bale.id" 
            :config="{ 
              draggable: true, 
              dragBoundFunc: baleDragBoundFunc, 
              listening: bale.layer === store.currentLayer, 
              x: (bale.x*scale) + (1.5*scale), 
              y: (bale.y*scale) + (0.75*scale), 
              rotation: bale.rotation, 
              opacity: getOpacity(bale.layer), 
              offsetX: 1.5 * scale, 
              offsetY: 0.75 * scale 
            }" 
            @contextmenu="handleRightClick($event, bale.id)" 
            @dblclick="handleDblClick($event, bale.id)" 
            @click="handleLeftClick($event, bale.id)" 
            @dragend="handleDragEnd($event, bale.id, 'bale')"
          >
            <v-rect :config="{ 
              width: 3*scale, 
              height: 1.5*scale, 
              fill: getBaleColor(bale), 
              stroke: 'black', 
              strokeWidth: 1 
            }" />
            
            <v-arrow v-if="bale.lean" :config="{ points: getArrowPoints(getBaleDims(bale).width*scale, getBaleDims(bale).height*scale, bale.lean), pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4 }" />
          </v-group>

          <v-group v-for="board in store.boardEdges" :key="board.id" @dblclick="handleBoardDblClick($event, board.id)" @click="handleBoardClick($event, board.id)" @contextmenu="handleRightClickBoard($event, board.id)">
            <v-line :config="{ points: [ board.x1*scale, board.y1*scale, board.x2*scale, board.y2*scale ], stroke: '#2e7d32', strokeWidth: 6, lineCap: 'round', hitStrokeWidth: 20 }" />
            <v-circle :config="{ x: board.x1*scale, y: board.y1*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'start')" />
            <v-circle :config="{ x: board.x2*scale, y: board.y2*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'end')" />
          </v-group>

          <v-group v-for="hide in store.hides" :key="hide.id" v-if="store.sport === 'barnhunt' && showHides"
            :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: hide.x * scale, y: hide.y * scale }"
            @dragend="handleDragEnd($event, hide.id, 'hide')"
            @click="handleHideClick($event, hide.id)"
            @dblclick="handleDblClickHide($event, hide.id)"
          >
             <v-circle :config="{ radius: 8, fill: hide.type === 'rat' ? 'red' : (hide.type === 'litter' ? 'yellow' : 'white'), stroke: 'black', strokeWidth: 2 }" />
             <v-text :config="{ text: hide.type === 'rat' ? 'R' : (hide.type === 'litter' ? 'L' : 'E'), fontSize: 10, x: -3, y: -4, fontStyle: 'bold' }" />
          </v-group>

        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<style scoped>
.editor-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: #f0f0f0; }
.canvas-wrapper { flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 40px; background: #e0e0e0; box-shadow: inset 0 0 20px rgba(0,0,0,0.1); position: relative; }
.toast-notification { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; color: white; font-weight: bold; z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: none; }
.toast-notification.error { background-color: #d32f2f; border-left: 5px solid #b71c1c; }
.toast-notification.success { background-color: #388e3c; border-left: 5px solid #1b5e20; }
.toast-notification.info { background-color: #0288d1; border-left: 5px solid #01579b; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, -20px); }
.zoom-controls { position: fixed; bottom: 20px; right: 20px; background: white; padding: 5px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); display: flex; gap: 5px; z-index: 100; }
.zoom-controls button { width: 30px; height: 30px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 4px; font-weight: bold; }
.zoom-controls button:hover { background: #f0f0f0; }
.zoom-controls .btn-fit { width: auto; padding: 0 8px; }
.zoom-label { line-height: 30px; font-size: 0.8rem; color: #666; min-width: 40px; text-align: center; }
</style>
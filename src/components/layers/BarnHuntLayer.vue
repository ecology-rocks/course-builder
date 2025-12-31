<script setup>
import { computed, ref, nextTick } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale', 'showHides', 'GRID_OFFSET'])
const store = useMapStore()

const baleRefs = ref({}) 
const dragStartPos = ref({}) 

// --- COMPUTED ---
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

const isDraggable = computed(() => {
  return store.activeTool === 'select' || store.activeTool === 'bale'
})

// --- HELPERS ---
function getBaleColor(bale) {
  if (bale.supported === false) return '#ef5350'
  switch(bale.layer) {
    case 1: return '#e6c200'; case 2: return '#4caf50'; case 3: return '#2196f3';
    default: return '#ccc'
  }
}
function getOpacity(layer) { return layer === store.currentLayer ? 1 : 0.5 }

// Dimensions based on orientation
function getBaleDims(bale) {
  const L = store.baleConfig.length
  const W = store.baleConfig.width
  const H = store.baleConfig.height

if (bale.orientation === 'pillar') return { width: W, height: H }
  if (bale.orientation === 'tall') return { width: L, height: H }
  return { width: L, height: W } // Flat
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

// Snapping Logic
function baleDragBoundFunc(pos) {
  const node = this
  const baleId = node.attrs.id
  const bale = store.bales.find(b => b.id === baleId)
  
  if (!bale) return pos 

  // 1. Determine Visual Dimensions (Is it rotated?)
const L = store.baleConfig.length
  const W = store.baleConfig.width
  const H = store.baleConfig.height

  let w, h
  if (bale.orientation === 'pillar') { w = W; h = H }
  else if (bale.orientation === 'tall') { w = L; h = H }
  else { w = L; h = W } // Flat
  
  const isRotated = bale.rotation % 180 !== 0
  
  // Swap dimensions if rotated
  const visualW = (isRotated ? h : w) * props.scale
  const visualH = (isRotated ? w : h) * props.scale

  // 2. Define Constraints (Based on the Center point)
  const halfW = visualW / 2
  const halfH = visualH / 2
  
  const minX = halfW
  const maxX = (store.ringDimensions.width * props.scale) - halfW
  const minY = halfH
  const maxY = (store.ringDimensions.height * props.scale) - halfH

  // 3. Snap Logic (3-inch / 0.25ft intervals)
  const layerAbs = node.getLayer().getAbsolutePosition()
  const relX = pos.x - layerAbs.x
  const relY = pos.y - layerAbs.y
  
  const step = props.scale / 4 // <--- 3-inch snapping

  let snappedRelX = Math.round(relX / step) * step
  let snappedRelY = Math.round(relY / step) * step
  
  // 4. Clamp to boundaries
  snappedRelX = Math.max(minX, Math.min(snappedRelX, maxX))
  snappedRelY = Math.max(minY, Math.min(snappedRelY, maxY))
  
  return {
    x: snappedRelX + layerAbs.x,
    y: snappedRelY + layerAbs.y
  }
}
function dragBoundFunc(pos) {
  const node = this; const layerAbs = node.getLayer().getAbsolutePosition(); const step = props.scale / 2
  let x = Math.round((pos.x - layerAbs.x) / step) * step; let y = Math.round((pos.y - layerAbs.y) / step) * step
  return { x: x + layerAbs.x, y: y + layerAbs.y }
}

// --- HANDLERS ---
function handleRightClick(e, id) { e.evt.preventDefault(); store.rotateBale(id) }
function handleDblClick(e, id) { if (e.evt.button === 0) store.removeBale(id) }

function handleLeftClick(e, id) {
  const evt = e.evt 
  
  // 1. Keyboard Shortcuts
  if (evt.altKey) { store.cycleOrientation(id); return }
  if (evt.ctrlKey) { store.cycleLean(id); return }

  // 2. Board Tool
  if (store.activeTool === 'board') {
     const stage = e.target.getStage()
     const p = stage.getPointerPosition()
     const rawX = (p.x - props.GRID_OFFSET) / props.scale
     const rawY = (p.y - props.GRID_OFFSET) / props.scale
     
     if (!store.isDrawingBoard) store.startDrawingBoard(rawX, rawY)
     else store.stopDrawingBoard()
     return
  }

  // 3. Select/Move
  if (store.activeTool === 'select' || store.activeTool === 'bale') {
    const isMulti = evt.shiftKey || evt.ctrlKey || evt.metaKey
    if (!store.selection.includes(id) && !isMulti) store.selectBale(id, false) 
    else if (isMulti) store.selectBale(id, true) 
    return
  }

  // 4. Specific Tools
  if (store.activeTool === 'rotate') { store.rotateBale(id); return }
  if (store.activeTool === 'type' || store.activeTool === 'orientation') { store.cycleOrientation(id); return } 
  if (store.activeTool === 'lean') { store.cycleLean(id); return }        
  if (store.activeTool === 'delete') { store.removeBale(id); return }
}

function handleDragStart(e, id) {
  if (!isDraggable.value) return 
  if (!store.selection.includes(id)) store.selectBale(id, false)
  dragStartPos.value = {}
  store.selection.forEach(selId => {
    const node = baleRefs.value[selId]?.getNode()
    if (node) dragStartPos.value[selId] = { x: node.x(), y: node.y() }
  })
}

function handleDragMove(e, id) {
  const node = e.target
  const startPos = dragStartPos.value[id]
  if (!startPos) return
  const dx = node.x() - startPos.x; const dy = node.y() - startPos.y
  store.selection.forEach(selId => {
    if (selId === id) return
    const peerNode = baleRefs.value[selId]?.getNode()
    const peerStart = dragStartPos.value[selId]
    if (peerNode && peerStart) peerNode.position({ x: peerStart.x + dx, y: peerStart.y + dy })
  })
}

function handleDragEnd(e, id, type) {
  const node = e.target
  const layerAbs = node.getLayer().getAbsolutePosition(); const absPos = node.getAbsolutePosition()
  const rawX = (absPos.x - layerAbs.x) / props.scale; const rawY = (absPos.y - layerAbs.y) / props.scale

  if (type === 'bale') {
    const finalX = rawX - 1.5; const finalY = rawY - 0.75
    nextTick(() => { store.commitDrag(id, finalX, finalY) })
  } 
  else if (type === 'hide') { const h = store.hides.find(h => h.id === id); if (h) { h.x = rawX; h.y = rawY } } 
  else if (type === 'dcmat') { const m = store.dcMats.find(m => m.id === id); if (m) { m.x = rawX; m.y = rawY } } 
  else if (type === 'startbox') { if (store.startBox) { store.startBox.x = rawX; store.startBox.y = rawY } }
}

function handleBoardClick(e, id) {
   if (store.activeTool === 'rotate') store.rotateBoard(id)
   if (store.activeTool === 'delete') store.removeBoardEdge(id)
}
function handleBoardHandleDrag(e, boardId, whichPoint) {
  const node = e.target; const absPos = node.getAbsolutePosition()
  const rawX = (absPos.x - props.GRID_OFFSET) / props.scale; const rawY = (absPos.y - props.GRID_OFFSET) / props.scale
  store.updateBoardEndpoint(boardId, whichPoint, rawX, rawY)
  node.position({ x: (Math.round(rawX * 2) / 2) * props.scale, y: (Math.round(rawY * 2) / 2) * props.scale })
}
function handleDCClick(e, id) { if (e.evt.button !== 0) return; if (store.activeTool === 'rotate') store.rotateDCMat(id); if (store.activeTool === 'delete') store.removeDCMat(id) }
function handleHideClick(e, id) { if (e.evt.button !== 0) return; if (store.activeTool === 'delete') { store.removeHide(id); return }; store.cycleHideType(id) }
</script>

<template>
  <v-group>
    <v-group v-if="store.startBox" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: store.startBox.x * scale, y: store.startBox.y * scale }" @dragend="handleDragEnd($event, null, 'startbox')" @click="store.activeTool === 'delete' ? store.removeStartBox() : null">
       <v-rect :config="{ width: 4 * scale, height: 4 * scale, fill: 'rgba(200, 200, 200, 0.5)', stroke: 'black', dash: [10, 5] }" />
       <v-text :config="{ text: 'START', width: 4 * scale, padding: 5, align: 'center', fontSize: 14 }" />
    </v-group>

    <v-group v-for="mat in store.dcMats" :key="mat.id" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: mat.x * scale, y: mat.y * scale, rotation: mat.rotation }" @dragend="handleDragEnd($event, mat.id, 'dcmat')" @click="handleDCClick($event, mat.id)" @contextmenu="handleDCRightClick($event, mat.id)">
       <v-rect :config="{ width: 2 * scale, height: 3 * scale, fill: '#ffcc80', stroke: 'black' }" />
       <v-text :config="{ text: 'DC', fontSize: 12, x: 5, y: 5 }" />
    </v-group>

    <v-group v-for="bale in visibleBales" :key="bale.id"
      :ref="el => baleRefs[bale.id] = el"
      :config="{ 
        id: bale.id,
        draggable: isDraggable, 
        dragBoundFunc: baleDragBoundFunc, 
        listening: bale.layer === store.currentLayer || store.selection.includes(bale.id),
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
      @dragstart="handleDragStart($event, bale.id)"
      @dragmove="handleDragMove($event, bale.id)"
      @dragend="handleDragEnd($event, bale.id, 'bale')"
    >
      <v-rect :config="{ 
        width: getBaleDims(bale).width * scale, 
        height: getBaleDims(bale).height * scale, 
        fill: getBaleColor(bale), 
        stroke: store.selection.includes(bale.id) ? '#00a1ff' : 'black',
        strokeWidth: store.selection.includes(bale.id) ? 3 : 1,
        shadowColor: '#00a1ff', shadowBlur: store.selection.includes(bale.id) ? 10 : 0, shadowOpacity: 0.5
      }" />

      <v-line v-if="bale.orientation === 'tall'" 
        :config="{ 
          points: [0, 0, getBaleDims(bale).width*scale, getBaleDims(bale).height*scale], 
          stroke: 'black', strokeWidth: 1, opacity: 0.4 
        }" 
      />

      <v-group v-if="bale.orientation === 'pillar'">
        <v-line :config="{ points: [0, 0, getBaleDims(bale).width*scale, getBaleDims(bale).height*scale], stroke: 'black', strokeWidth: 1, opacity: 0.4 }" />
        <v-line :config="{ points: [getBaleDims(bale).width*scale, 0, 0, getBaleDims(bale).height*scale], stroke: 'black', strokeWidth: 1, opacity: 0.4 }" />
      </v-group>

      <v-arrow v-if="bale.lean" :config="{ points: getArrowPoints(getBaleDims(bale).width*scale, getBaleDims(bale).height*scale, bale.lean), pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4 }" />
    </v-group>

    <v-group v-for="board in store.boardEdges" :key="board.id" @click="handleBoardClick($event, board.id)">
      <v-line :config="{ points: [ board.x1*scale, board.y1*scale, board.x2*scale, board.y2*scale ], stroke: store.selection.includes(board.id) ? '#2196f3' : '#2e7d32', strokeWidth: 6, lineCap: 'round', hitStrokeWidth: 20 }" />
      <v-circle :config="{ x: board.x1*scale, y: board.y1*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'start')" />
      <v-circle :config="{ x: board.x2*scale, y: board.y2*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'end')" />
    </v-group>

    <v-group v-for="hide in store.hides" :key="hide.id" v-if="props.showHides" :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: hide.x * scale, y: hide.y * scale }" @dragend="handleDragEnd($event, hide.id, 'hide')" @click="handleHideClick($event, hide.id)">
       <v-circle :config="{ radius: 8, fill: hide.type === 'rat' ? 'red' : (hide.type === 'litter' ? 'yellow' : 'white'), stroke: 'black', strokeWidth: 2 }" />
       <v-text :config="{ text: hide.type === 'rat' ? 'R' : (hide.type === 'litter' ? 'L' : 'E'), fontSize: 10, x: -3, y: -4, fontStyle: 'bold' }" />
    </v-group>
  </v-group>
</template>
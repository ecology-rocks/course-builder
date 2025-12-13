<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'

const props = defineProps(['scale', 'showHides', 'GRID_OFFSET'])
const store = useMapStore()
const userStore = useUserStore()

// --- COMPUTED ---
const visibleBales = computed(() => {
  // Filter bales by layer (only show current layer and below)
  // You could also change this to show all but dim them, depending on preference
  const filtered = store.bales.filter(b => b.layer <= store.currentLayer)
  
  // Sort for proper rendering order (lower layers first)
  return filtered.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer
    // If same layer, leaners usually render on top/after
    const aIsLeaner = a.lean !== null
    const bIsLeaner = b.lean !== null
    if (aIsLeaner && !bIsLeaner) return 1
    if (!aIsLeaner && bIsLeaner) return -1
    return 0
  })
})

// --- VISUAL HELPERS ---
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

function getBaleColor(bale) {
  if (bale.supported === false) return '#ef5350'
  switch(bale.layer) {
    case 1: return '#e6c200'; case 2: return '#4caf50'; case 3: return '#2196f3';
    default: return '#ccc'
  }
}

function getOpacity(layer) {
  // If editing Layer 2, dim Layer 1. If editing Layer 1, hide Layer 2/3 (filtered in computed).
  return layer === store.currentLayer ? 1 : 0.5
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

// --- SNAPPING LOGIC ---
function baleDragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  
  const anchorX = pos.x - layerAbs.x
  const anchorY = pos.y - layerAbs.y
  
  const offsetX = 1.5 * props.scale
  const offsetY = 0.75 * props.scale
  
  const topLeftX = anchorX - offsetX
  const topLeftY = anchorY - offsetY
  
  const step = props.scale / 2
  let snappedX = Math.round(topLeftX / step) * step
  let snappedY = Math.round(topLeftY / step) * step
  
  const maxX = store.ringDimensions.width * props.scale
  const maxY = store.ringDimensions.height * props.scale
  snappedX = Math.max(0, Math.min(snappedX, maxX))
  snappedY = Math.max(0, Math.min(snappedY, maxY))
  
  return { x: snappedX + offsetX + layerAbs.x, y: snappedY + offsetY + layerAbs.y }
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const relativeX = pos.x - layerAbs.x
  const relativeY = pos.y - layerAbs.y
  const step = props.scale / 2
  let snappedLeft = Math.round(relativeX / step) * step
  let snappedTop = Math.round(relativeY / step) * step
  const maxX = store.ringDimensions.width * props.scale
  const maxY = store.ringDimensions.height * props.scale
  snappedLeft = Math.max(0, Math.min(snappedLeft, maxX))
  snappedTop = Math.max(0, Math.min(snappedTop, maxY))
  return { x: snappedLeft + layerAbs.x, y: snappedTop + layerAbs.y }
}

// --- HANDLERS ---

function handleContextMenu(e) { e.evt.preventDefault() }

function handleDCRightClick(e, id) {
  e.evt.preventDefault()
  store.rotateDCMat(id)
}

function handleBoardRightClick(e, id) {
  e.evt.preventDefault()
  store.rotateBoard(id)
}

function handleBaleRightClick(e, id) {
  e.evt.preventDefault()
  store.rotateBale(id)
}

// RESTORED: Double Click to Delete
function handleDblClick(e, id) {
  if (e.evt.button === 0) {
    e.cancelBubble = true
    store.removeBale(id)
  }
}

// UPDATED: Single Click (Tools + Shortcuts)
function handleBaleClick(e, bale) {
  // Stop propagation so we don't trigger "add bale" on the stage
  e.cancelBubble = true
  
  // 1. PLACE HIDE (Special Tool)
  if (store.activeTool === 'hide') {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    const x = (pointer.x - props.GRID_OFFSET) / props.scale
    const y = (pointer.y - props.GRID_OFFSET) / props.scale
    store.addHide(x, y)
    return
  }

  // 2. CHECK MODIFIERS (Native Event Access)
  const isShift = e.evt.shiftKey
  const isAlt = e.evt.altKey || e.evt.metaKey

  // 3. APPLY LOGIC (Tools vs Shortcuts)
  if (store.activeTool === 'delete') {
    store.removeBale(bale.id)
  } 
  else if (store.activeTool === 'rotate') {
    store.rotateBale(bale.id)
  }
  else if (store.activeTool === 'type' || isShift) {
    store.cycleOrientation(bale.id)
  }
  else if (store.activeTool === 'lean' || isAlt) {
    store.cycleLean(bale.id)
  }
  else {
    // Default: Select it
    store.selectedBaleId = bale.id
  }
}

function handleDragEnd(e, id, type) {
  const node = e.target
  const layerAbs = node.getLayer().getAbsolutePosition()
  const absPos = node.getAbsolutePosition()
  const relX = absPos.x - layerAbs.x
  const relY = absPos.y - layerAbs.y
  
  const rawX = relX / props.scale
  const rawY = relY / props.scale

  if (type === 'bale') {
    const bale = store.bales.find(b => b.id === id)
    if (bale) {
       // Offset because bales are anchored at center
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

function handleBoardClick(e, id) {
   if (store.activeTool === 'rotate') store.rotateBoard(id)
   if (store.activeTool === 'delete') store.removeBoardEdge(id)
}

function handleBoardHandleDrag(e, boardId, whichPoint) {
  const node = e.target; 
  const absPos = node.getAbsolutePosition()
  
  // Calculate Logical Position
  const rawX = (absPos.x - props.GRID_OFFSET) / props.scale; 
  const rawY = (absPos.y - props.GRID_OFFSET) / props.scale
  
  store.updateBoardEndpoint(boardId, whichPoint, rawX, rawY)
  
  // Snap Visual Position locally
  node.position({ 
    x: (Math.round(rawX * 2) / 2) * props.scale, 
    y: (Math.round(rawY * 2) / 2) * props.scale 
  })
}

function handleDCClick(e, id) {
  if (e.evt.button !== 0) return
  e.cancelBubble = true
  if (store.activeTool === 'rotate') store.rotateDCMat(id)
  if (store.activeTool === 'delete') store.removeDCMat(id)
}

function handleHideClick(e, id) {
  if (e.evt.button !== 0) return
  e.cancelBubble = true
  if (store.activeTool === 'delete') { store.removeHide(id); return }
  store.cycleHideType(id)
}
</script>

<template>
  <v-group>
    <v-group v-if="store.startBox" 
      :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: store.startBox.x * scale, y: store.startBox.y * scale }"
      @dragend="handleDragEnd($event, null, 'startbox')"
      @click="store.activeTool === 'delete' ? store.removeStartBox() : null"
      @contextmenu="handleContextMenu"
    >
       <v-rect :config="{ width: 4 * scale, height: 5 * scale, fill: 'rgba(200, 200, 200, 0.5)', stroke: 'black', dash: [10, 5] }" />
       <v-text :config="{ text: 'START', width: 4 * scale, padding: 5, align: 'center', fontSize: 14 }" />
    </v-group>

    <v-group v-for="mat in store.dcMats" :key="mat.id"
      :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: mat.x * scale, y: mat.y * scale, rotation: mat.rotation }"
      @dragend="handleDragEnd($event, mat.id, 'dcmat')"
      @click="handleDCClick($event, mat.id)"
      @contextmenu="handleDCRightClick($event, mat.id)"
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
      @contextmenu="handleBaleRightClick($event, bale.id)" 
      @dblclick="handleDblClick($event, bale.id)" 
      @click="handleBaleClick($event, bale)" 
      @dragend="handleDragEnd($event, bale.id, 'bale')"
    >
      <v-rect 
        :config="{ 
          ...(() => {
              const dims = getBaleDims(bale)
              const w = dims.width * scale
              const h = dims.height * scale
              return { width: w, height: h, x: (1.5 * scale) - (w / 2), y: (0.75 * scale) - (h / 2) }
          })(),
          fill: bale.orientation === 'flat' ? getBaleColor(bale) : undefined,
          fillPatternImage: (bale.orientation === 'tall' ? hatchPattern : (bale.orientation === 'pillar' ? pillarPattern : undefined)),
          fillPatternRepeat: 'repeat',
          stroke: (bale.orientation === 'flat' ? 'black' : (bale.orientation === 'pillar' ? '#d32f2f' : getBaleColor(bale))),
          strokeWidth: (bale.id === store.selectedBaleId ? 4 : (bale.orientation === 'flat' ? 1 : 2)),
          shadowBlur: bale.id === store.selectedBaleId ? 15 : 0,
          shadowColor: '#2196f3'
        }"
      />
      <v-arrow v-if="bale.lean" :config="{ points: getArrowPoints(getBaleDims(bale).width*scale, getBaleDims(bale).height*scale, bale.lean), pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4 }" />
    </v-group>

    <v-group v-for="board in store.boardEdges" :key="board.id" 
      @click="handleBoardClick($event, board.id)" 
      @contextmenu="handleBoardRightClick($event, board.id)"
    >
      <v-line :config="{ points: [ board.x1*scale, board.y1*scale, board.x2*scale, board.y2*scale ], stroke: '#2e7d32', strokeWidth: 6, lineCap: 'round', hitStrokeWidth: 20 }" />
      <v-circle :config="{ x: board.x1*scale, y: board.y1*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'start')" />
      <v-circle :config="{ x: board.x2*scale, y: board.y2*scale, radius: 6, fill: '#1b5e20', draggable: true, dragBoundFunc: dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'end')" />
    </v-group>

    <v-group v-for="hide in store.hides" :key="hide.id" v-if="props.showHides"
      :config="{ draggable: true, dragBoundFunc: dragBoundFunc, x: hide.x * scale, y: hide.y * scale }"
      @dragend="handleDragEnd($event, hide.id, 'hide')"
      @click="handleHideClick($event, hide.id)"
      @contextmenu="handleContextMenu"
    >
       <v-circle :config="{ radius: 8, fill: hide.type === 'rat' ? 'red' : (hide.type === 'litter' ? 'yellow' : 'white'), stroke: 'black', strokeWidth: 2 }" />
       <v-text :config="{ text: hide.type === 'rat' ? 'R' : (hide.type === 'litter' ? 'L' : 'E'), fontSize: 10, x: -3, y: -4, fontStyle: 'bold' }" />
    </v-group>
  </v-group>
</template>
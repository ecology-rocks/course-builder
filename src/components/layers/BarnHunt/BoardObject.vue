<script setup>
import { ref, watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['board', 'scale'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

// Expose the node for the Layer to control
defineExpose({ getNode: () => groupRef.value?.getNode() })

watch(() => props.board, () => {
  if (groupRef.value) {
    groupRef.value.getNode().position({ x: 0, y: 0 })
  }
}, { deep: true })

// --- 1. Handle Endpoint Dragging ---
function handleHandleDragStart(e) {
  e.cancelBubble = true // Stop bubble so Group doesn't think IT is starting to drag
}

// [FIX] New function to stop dragmove bubbling
function handleHandleDragMove(e) {
  e.cancelBubble = true // Stop bubble so Group doesn't fire 'dragmove' to the Layer
}

function handleHandleDragEnd(e, whichPoint) {
  e.cancelBubble = true
  const node = e.target
  const layerAbs = node.getLayer().getAbsolutePosition()
  const absPos = node.getAbsolutePosition()
  
  // Calculate raw grid coordinates
  const rawX = (absPos.x - layerAbs.x) / props.scale
  const rawY = (absPos.y - layerAbs.y) / props.scale
  
  // 1. Snap to 2-inch grid
  let snappedX = Math.round(rawX * 6) / 6
  let snappedY = Math.round(rawY * 6) / 6

  // 2. [FIX] Clamp logic ensures points never save outside the ring
  const W = store.ringDimensions.width
  const H = store.ringDimensions.height
  
  snappedX = Math.max(0, Math.min(snappedX, W))
  snappedY = Math.max(0, Math.min(snappedY, H))

  // Update Store
  store.updateBoardEndpoint(props.board.id, whichPoint, snappedX, snappedY)
  
  // Reset visual node to snapped position to prevent drift
  node.position({ x: snappedX * props.scale, y: snappedY * props.scale })
}

function handleGroupDragEnd(e) {
  if (e.target !== groupRef.value.getNode()) return

  // 1. Emit FIRST so the Layer can calculate the full delta 
  // (e.g., "The user dragged this 50px right")
  emit('dragend', e)

  // 2. Reset immediately. 
  // We don't need setTimeout anymore because the 'watch' above 
  // covers us, but this makes the snap-back instant and snappy.
  e.target.position({ x: 0, y: 0 })
}

// --- 2. Handle Whole Board Drag ---
function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch grid
  
  // 1. Calculate Grid-Relative Position
  // Note: For the Group, this is the delta (since it starts at 0,0)
  // For the Circle (Endpoint), this is the actual coordinate
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step

  const W = store.ringDimensions.width * props.scale
  const H = store.ringDimensions.height * props.scale

  // 2. Logic based on Node Type (Endpoint vs Whole Board)
  if (node.getClassName() === 'Circle') {
    // --- ENDPOINT CLAMPING ---
    // Simple: The point itself must be within bounds (0,0) to (W,H)
    relX = Math.max(0, Math.min(relX, W))
    relY = Math.max(0, Math.min(relY, H))
  
  } else {
    // --- GROUP (WHOLE BOARD) CLAMPING ---
    // The Group starts at (0,0). 'relX/Y' represents the translation distance.
    
    // Find bounds of the board shape itself
    const bx1 = props.board.x1 * props.scale
    const bx2 = props.board.x2 * props.scale
    const by1 = props.board.y1 * props.scale
    const by2 = props.board.y2 * props.scale
    
    const minBoardX = Math.min(bx1, bx2)
    const maxBoardX = Math.max(bx1, bx2)
    const minBoardY = Math.min(by1, by2)
    const maxBoardY = Math.max(by1, by2)

    // Calculate allowed translation range
    // e.g. Leftmost point (minBoardX) cannot go below 0 -> minDx = -minBoardX
    // e.g. Rightmost point (maxBoardX) cannot go above W -> maxDx = W - maxBoardX
    const minDx = -minBoardX
    const maxDx = W - maxBoardX
    const minDy = -minBoardY
    const maxDy = H - maxBoardY

    // Clamp the translation delta
    relX = Math.max(minDx, Math.min(relX, maxDx))
    relY = Math.max(minDy, Math.min(relY, maxDy))
  }

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}

// --- 3. Clicks ---
function handleClick(e) {
  if (e.evt.button !== 0) return 

  if (['select', 'bale', 'board'].includes(store.activeTool)) {
    store.selectObject(props.board.id, e.evt.shiftKey || e.evt.ctrlKey)
  }

  if (store.activeTool === 'delete') {
    store.removeBoardEdge(props.board.id)
  }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: board.id,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="handleClick"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleGroupDragEnd"
  >
    <v-line 
      :config="{
        points: [board.x1 * scale, board.y1 * scale, board.x2 * scale, board.y2 * scale],
        stroke: store.selection.includes(board.id) ? '#2196f3' : '#2e7d32',
        strokeWidth: 6,
        lineCap: 'round',
        hitStrokeWidth: 20
      }" 
    />
    
    <v-circle
      :config="{
        x: board.x1 * scale,
        y: board.y1 * scale,
        radius: 6,
        fill: '#1b5e20',
        draggable: true,
        dragBoundFunc: dragBoundFunc
      }"
      @dragstart="handleHandleDragStart"
      @dragmove="handleHandleDragMove" 
      @dragend="handleHandleDragEnd($event, 'start')"
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
      @dragstart="handleHandleDragStart"
      @dragmove="handleHandleDragMove"
      @dragend="handleHandleDragEnd($event, 'end')"
    />
  </v-group>
</template>
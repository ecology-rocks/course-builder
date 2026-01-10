<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['board', 'scale'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

// Expose the node for the Layer to control
defineExpose({ getNode: () => groupRef.value?.getNode() })

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
  
  // Snap to 2-inch grid
const snappedX = Math.round(rawX * 6) / 6
const snappedY = Math.round(rawY * 6) / 6

  // Update Store
  store.updateBoardEndpoint(props.board.id, whichPoint, snappedX, snappedY)
  
  // Reset visual node to snapped position to prevent drift
  node.position({ x: snappedX * props.scale, y: snappedY * props.scale })
}

function handleGroupDragEnd(e) {
  // If the event came from a bubble (endpoint drag), ignore it
  if (e.target !== groupRef.value.getNode()) return

  const node = e.target
  // Calculate delta in Grid Units
  const dx = node.x() / props.scale
  const dy = node.y() / props.scale
  
  // Update Store (both endpoints)
  store.updateBoardEndpoint(props.board.id, 'start', props.board.x1 + dx, props.board.y1 + dy)
  store.updateBoardEndpoint(props.board.id, 'end', props.board.x2 + dx, props.board.y2 + dy)

  // [IMPORTANT] Reset Group Position to (0,0)
  // Since the store now contains the new absolute coordinates, 
  // we must remove the group's offset to prevent double-movement.
  node.position({ x: 0, y: 0 })
  
  emit('dragend', e)
}

// --- 2. Handle Whole Board Drag ---
function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  let x = Math.round((pos.x - layerAbs.x) / step) * step
  let y = Math.round((pos.y - layerAbs.y) / step) * step
  return { x: x + layerAbs.x, y: y + layerAbs.y }
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
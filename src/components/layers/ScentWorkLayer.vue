<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale', 'showHides', 'dragBoundFunc'])
const store = useMapStore()

const visibleObjects = computed(() => store.scentWorkObjects)

// --- INTERACTION ---
function handleRightClick(e, id) { e.evt.preventDefault(); store.rotateScentWorkObject(id) }
function handleDblClick(e, id) { if (e.evt.button === 0) store.removeScentWorkObject(id) }

function handleClick(e, id) {
  if (e.evt.button !== 0) return 

  // 1. DELETE
  if (store.activeTool === 'delete') {
    store.removeScentWorkObject(id)
    return
  }
  
  // 2. MARK HOT (The "Hides" logic)
  if (store.activeTool === 'hot') {
    store.toggleScentWorkHot(id)
    return
  }

  // 3. ROTATE
  if (store.activeTool === 'rotate') {
    store.rotateScentWorkObject(id)
    return
  }
}

function onDragEnd(e, id) {
  const node = e.target
  const layerAbs = node.getLayer().getAbsolutePosition()
  const absPos = node.getAbsolutePosition()
  const relX = absPos.x - layerAbs.x
  const relY = absPos.y - layerAbs.y
  
  const rawX = relX / props.scale
  const rawY = relY / props.scale

  const obj = store.scentWorkObjects.find(o => o.id === id)
  if (obj) { obj.x = rawX; obj.y = rawY }
}

// --- BOARDS (Tape/Walls) ---
function handleBoardClick(e, id) {
   if (store.activeTool === 'rotate') store.rotateBoardEdge(id) // Optional: Rotate walls
   if (store.activeTool === 'delete') store.removeBoardEdge(id)
}
function handleBoardHandleDrag(e, boardId, whichPoint) {
  const node = e.target; 
  const absPos = node.getAbsolutePosition()
  
  // Note: 30 is the hardcoded GRID_OFFSET
  const rawX = (absPos.x - 30) / props.scale; 
  const rawY = (absPos.y - 30) / props.scale
  
  store.updateBoardEndpoint(boardId, whichPoint, rawX, rawY)
  
  // FIX: Removed "+ 30"
  node.position({ 
    x: (Math.round(rawX * 2) / 2) * props.scale, 
    y: (Math.round(rawY * 2) / 2) * props.scale 
  })
}
</script>

<template>
  <v-group>
    <v-group v-for="board in store.boardEdges" :key="board.id" @click="handleBoardClick($event, board.id)" @contextmenu="handleBoardClick($event, board.id)">
      <v-line :config="{ 
        points: [ board.x1*scale, board.y1*scale, board.x2*scale, board.y2*scale ], 
        stroke: '#2979ff', strokeWidth: 4, dash: [10, 5], lineCap: 'round', hitStrokeWidth: 20 
      }" />
      <v-circle :config="{ x: board.x1*scale, y: board.y1*scale, radius: 5, fill: '#2979ff', draggable: true, dragBoundFunc: props.dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'start')" />
      <v-circle :config="{ x: board.x2*scale, y: board.y2*scale, radius: 5, fill: '#2979ff', draggable: true, dragBoundFunc: props.dragBoundFunc }" @dragend="handleBoardHandleDrag($event, board.id, 'end')" />
    </v-group>

    <v-group v-for="obj in visibleObjects" :key="obj.id"
      :config="{ draggable: true, dragBoundFunc: props.dragBoundFunc, x: obj.x*scale, y: obj.y*scale, rotation: obj.rotation }"
      @contextmenu="handleRightClick($event, obj.id)" 
      @dblclick="handleDblClick($event, obj.id)" 
      @click="handleClick($event, obj.id)"
      @dragend="onDragEnd($event, obj.id)"
    >
      
      <v-rect v-if="obj.type === 'box'" :config="{ x: -0.75*scale, y: -0.75*scale, width: 1.5*scale, height: 1.5*scale, fill: '#8d6e63', stroke: 'black', strokeWidth: 1 }" />

      <v-regular-polygon v-if="obj.type === 'cone'" :config="{ sides: 3, radius: 0.8*scale, fill: '#ff9800', stroke: 'black', strokeWidth: 1 }" />

      <v-circle v-if="obj.type === 'container'" :config="{ radius: 0.6*scale, fill: '#bdbdbd', stroke: 'black', strokeWidth: 1 }" />

      <v-group v-if="obj.type === 'luggage'">
        <v-rect :config="{ x: -1*scale, y: -0.6*scale, width: 2*scale, height: 1.2*scale, fill: '#7e57c2', stroke: 'black', strokeWidth: 1, cornerRadius: 5 }" />
        <v-rect :config="{ x: -0.3*scale, y: -0.8*scale, width: 0.6*scale, height: 0.2*scale, fill: 'black' }" />
      </v-group>

      <v-group v-if="obj.type === 'vehicle'">
        <v-rect :config="{ x: -4*scale, y: -1.5*scale, width: 8*scale, height: 3*scale, fill: '#90a4ae', stroke: 'black', cornerRadius: 10 }" />
        <v-rect :config="{ x: -3*scale, y: -1.2*scale, width: 2*scale, height: 2.4*scale, fill: '#cfd8dc' }" />
      </v-group>

      <v-group v-if="obj.type === 'buried'">
        <v-circle :config="{ radius: 0.8*scale, fill: '#e6eea0', stroke: '#9e9d24', strokeWidth: 1, dash: [5, 5] }" />
        <v-circle :config="{ x: -0.3*scale, y: -0.2*scale, radius: 2, fill: '#9e9d24' }" />
        <v-circle :config="{ x: 0.2*scale, y: 0.3*scale, radius: 2, fill: '#9e9d24' }" />
        <v-circle :config="{ x: 0.4*scale, y: -0.3*scale, radius: 2, fill: '#9e9d24' }" />
      </v-group>

      <v-group v-if="obj.isHot && props.showHides">
        <v-circle :config="{ radius: 10, fill: 'red', x: 0, y: 0, opacity: 0.8 }" />
        <v-text :config="{ text: 'HOT', fontSize: 10, fill: 'white', x: -10, y: -5, align: 'center', width: 20 }" />
      </v-group>

    </v-group>
  </v-group>
</template>
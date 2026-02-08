<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['wall', 'scale'])
const store = useMapStore()

// --- SELECTION STATE ---
const isSelected = computed(() => store.selection.includes(props.wall.id))
// Blue highlight when selected, Black otherwise
const baseColor = computed(() => isSelected.value ? '#2196f3' : 'black')

const points = computed(() => {
  return props.wall.points.map(p => ({ x: p.x * props.scale, y: p.y * props.scale }))
})

// --- HANDLERS ---

function handleWallClick(e) {
  // [FIX] If Gate tool is active, let the click pass through to the Stage.
  // This allows 'Place Gate' to work without selecting the wall.
  if (store.activeTool === 'gate') {
    return
  }

  // Prevent Stage Deselect for other tools (Select, Measure, etc)
  e.cancelBubble = true 
  
  if (store.activeTool === 'delete') {
    store.removeWall(props.wall.id)
    return
  }

  // Select the wall (Supports Shift+Click for multi-select)
  const isMulti = e.evt.shiftKey || e.evt.metaKey
  store.selectObject(props.wall.id, isMulti)
}

function handleSegmentContextMenu(index, e) {
  e.evt.preventDefault()
  e.cancelBubble = true // Stop browser menu
  
  // Open Custom Context Menu
  store.activeWallMenu = {
    wallId: props.wall.id,
    segmentIndex: index,
    x: e.evt.clientX,
    y: e.evt.clientY
  }
}

// --- CORNER DRAGGING ---

function handlePointDragMove(index, e) {
  const node = e.target
  // Convert local pixels back to grid units
  const newX = node.x() / props.scale
  const newY = node.y() / props.scale
  
  // Real-time update (so the lines follow the dot)
  store.updateWallPoint(props.wall.id, index, newX, newY)
}

function handlePointDragEnd(e) {
  // Trigger snapshot for undo/redo history
  store.snapshot()
}
</script>

<template>
  <v-group>
    <template v-for="(pt, i) in points" :key="'seg-'+i">
      <v-line :config="{
        points: [
          pt.x, pt.y, 
          points[(i + 1) % points.length].x, 
          points[(i + 1) % points.length].y
        ],
        stroke: baseColor, 
        strokeWidth: wall.segmentTypes[i] === 'solid' ? 6 : 2,
        hitStrokeWidth: 20, // Wide invisible hit area for easier clicking
        shadowColor: isSelected ? '#2196f3' : null,
        shadowBlur: isSelected ? 10 : 0
      }" 
      @click="handleWallClick"
      @contextmenu="handleSegmentContextMenu(i, $event)"
      />
    </template>
    
    <template v-if="isSelected">
      <v-circle v-for="(pt, i) in points" :key="'node-'+i" 
        :config="{ 
          x: pt.x, 
          y: pt.y, 
          radius: 6, 
          fill: 'white',
          stroke: '#2196f3',
          strokeWidth: 2,
          draggable: true 
        }"
        @dragmove="handlePointDragMove(i, $event)"
        @dragend="handlePointDragEnd"
        @click="e => e.cancelBubble = true" 
      />
    </template>
  </v-group>
</template>
<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['wall', 'scale'])
const store = useMapStore()

const isSelected = computed(() => store.selection.includes(props.wall.id))
const points = computed(() => props.wall.points.map(p => ({ x: p.x * props.scale, y: p.y * props.scale })))

// [INSERT] Helper to resolve style per segment type
function getSegmentStyle(index) {
  const type = props.wall.segmentTypes[index] || 'solid'
  const isSolid = type === 'solid'
  
  // Defaults
  const defaults = isSolid 
    ? { color: 'black', width: 6, dash: [] }
    : { color: 'black', width: 2, dash: [] }

  // Custom Overrides (Nested Structure)
  const custom = isSolid 
    ? props.wall.custom?.wall 
    : props.wall.custom?.fence

  // Legacy fallback (if user had old single-color custom)
  const legacyColor = props.wall.custom?.strokeColor

  return {
    stroke: custom?.strokeColor || legacyColor || defaults.color,
    strokeWidth: custom?.strokeWidth || defaults.width,
    dash: custom?.dash || defaults.dash
  }
}

// --- HANDLERS ---
function handleWallClick(e) {
  if (store.activeTool === 'gate') return
  e.cancelBubble = true 
  if (store.activeTool === 'delete') {
    store.removeWall(props.wall.id)
    return
  }
  const isMulti = e.evt.shiftKey || e.evt.metaKey
  store.selectObject(props.wall.id, isMulti)
}

function handleSegmentContextMenu(index, e) {
  e.evt.preventDefault()
  e.cancelBubble = true 
  store.activeWallMenu = {
    wallId: props.wall.id,
    segmentIndex: index,
    x: e.evt.clientX,
    y: e.evt.clientY
  }
}

function handlePointDragMove(index, e) {
  const node = e.target
  const newX = node.x() / props.scale
  const newY = node.y() / props.scale
  store.updateWallPoint(props.wall.id, index, newX, newY)
}

function handlePointDragEnd(e) {
  store.snapshot()
}
</script>

<template>
  <v-group>
    
    <template v-if="isSelected">
      <v-line 
        v-for="(pt, i) in points" 
        :key="'halo-'+i"
        :config="{
          points: [
            pt.x, pt.y, 
            points[(i + 1) % points.length].x, 
            points[(i + 1) % points.length].y
          ],
          stroke: '#2196f3',
          strokeWidth: getSegmentStyle(i).strokeWidth + 8, // 8px wider than the actual wall
          opacity: 0.3,
          lineCap: 'round',
          lineJoin: 'round',
          listening: false
        }" 
      />
    </template>

    <template v-for="(pt, i) in points" :key="'seg-'+i">
      <v-line :config="{
        points: [
          pt.x, pt.y, 
          points[(i + 1) % points.length].x, 
          points[(i + 1) % points.length].y
        ],
        stroke: getSegmentStyle(i).stroke,
        strokeWidth: getSegmentStyle(i).strokeWidth,
        dash: getSegmentStyle(i).dash,
        hitStrokeWidth: 20, 
        lineCap: 'round',
        lineJoin: 'round'
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
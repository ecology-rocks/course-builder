<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['measurement', 'scale'])
const store = useMapStore()

// --- SELECTION STATE ---
const isSelected = computed(() => store.selection.includes(props.measurement.id))
const color = computed(() => isSelected.value ? '#2196f3' : '#d32f2f')

const fmt = (val) => {
  const total = Math.round(val * 12)
  const ft = Math.floor(total / 12)
  const inch = total % 12
  return inch === 0 ? `${ft}'` : `${ft}' ${inch}"`
}

const segments = computed(() => {
  const pts = props.measurement.points
  const results = []
  
  if (!pts || pts.length < 2) return []

  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]; const p2 = pts[i+1]
    const dx = p2.x - p1.x; const dy = p2.y - p1.y
    const dist = Math.sqrt(dx*dx + dy*dy)
    const midX = (p1.x + p2.x) / 2; const midY = (p1.y + p2.y) / 2
    
    results.push({ p1, p2, dist, midX, midY, label: fmt(dist) })
  }
  return results
})

// --- HANDLERS ---

function handleClick(e) {
  // 1. Delete Tool Override
  if (store.activeTool === 'delete') {
    store.removeMeasurement(props.measurement.id)
    return
  }

  // 2. Selection Logic
  e.cancelBubble = true
  const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
  store.selectObject(props.measurement.id, isMulti)
}

function handleDragStart(e) {
  e.cancelBubble = true
  store.snapshot() // Save state before modifying geometry
}

function handlePointDragMove(e, index) {
  e.cancelBubble = true
  const node = e.target // This will be the Group now
  
  // Calculate Grid Coordinates from the Group's position
  const rawX = node.x() / props.scale
  const rawY = node.y() / props.scale
  
  // Snap to 0.5 grid
  const snapX = Math.round(rawX * 2) / 2
  const snapY = Math.round(rawY * 2) / 2
  
  // Update Store (Visual Refresh of lines)
  store.updateMeasurementPoint(props.measurement.id, index, snapX, snapY)
  
  // Keep the Group snapped visually
  node.position({ x: snapX * props.scale, y: snapY * props.scale })
}

// Snapping Logic for the Konva Drag System
function dragBoundFunc(pos) {
  const step = props.scale / 2
  return {
    x: Math.round(pos.x / step) * step,
    y: Math.round(pos.y / step) * step
  }
}
</script>

<template>
  <v-group @click="handleClick">
    
    <template v-for="(seg, i) in segments" :key="'seg-'+i">
      <v-line :config="{
        points: [seg.p1.x * scale, seg.p1.y * scale, seg.p2.x * scale, seg.p2.y * scale],
        stroke: color, 
        strokeWidth: 2, 
        dash: [4, 4], 
        hitStrokeWidth: 20 // [FIX] Easier to click lines
      }" />
      
      <v-label :config="{ x: seg.midX * scale, y: seg.midY * scale }">
        <v-tag :config="{ fill: 'white', opacity: 0.8, cornerRadius: 4 }" />
        <v-text :config="{ 
          text: seg.label, 
          fontSize: 12, 
          fontStyle: 'bold', 
          fill: color, 
          padding: 2, 
          align: 'center' 
        }" />
      </v-label>
    </template>

    <template v-for="(pt, i) in measurement.points" :key="'pt-'+i">
      <v-group
        :config="{
          x: pt.x * scale,
          y: pt.y * scale,
          draggable: true,
          dragBoundFunc: dragBoundFunc
        }"
        @dragstart="handleDragStart"
        @dragmove="handlePointDragMove($event, i)"
      >
        <v-circle :config="{ 
          radius: 6, 
          fill: color,
          stroke: 'white',
          strokeWidth: 2
        }" />
        
        <v-circle :config="{ 
          radius: 15, 
          fill: 'transparent'
        }" />
      </v-group>
    </template>

  </v-group>
</template>
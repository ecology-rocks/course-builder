<script setup>
import { computed, ref, watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['measurement', 'scale', 'opacity'])
const store = useMapStore()

// --- LOCAL STATE ---
// We use a local buffer so the UI is responsive and doesn't conflict with Store updates
const localPoints = ref([])
const isDragging = ref(false)

// Sync Store -> Local (Only if NOT dragging)
watch(() => props.measurement.points, (newPoints) => {
  if (!isDragging.value && newPoints) {
    // Deep copy to break reference
    localPoints.value = newPoints.map(p => ({ x: p.x, y: p.y }))
  }
}, { deep: true, immediate: true })

// --- SELECTION STATE ---
const isSelected = computed(() => store.selection.includes(props.measurement.id))
const color = computed(() => isSelected.value ? '#2196f3' : '#d32f2f')

const fmt = (val) => {
  const total = Math.round(val * 12)
  const ft = Math.floor(total / 12)
  const inch = total % 12
  return inch === 0 ? `${ft}'` : `${ft}' ${inch}"`
}

// Compute segments from LOCAL points (Real-time updates)
const segments = computed(() => {
  const pts = localPoints.value
  const results = []
  if (!pts || pts.length < 2) return []

  let runningTotal = 0 

  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]; const p2 = pts[i+1]
    const dx = p2.x - p1.x; const dy = p2.y - p1.y
    const dist = Math.sqrt(dx*dx + dy*dy)
    
    // Accumulate distance for path measurements
    runningTotal += dist

    const midX = (p1.x + p2.x) / 2; const midY = (p1.y + p2.y) / 2
    
    results.push({ p1, p2, dist, midX, midY, label: fmt(runningTotal) })
  }
  return results
})

// --- HANDLERS ---

function handleClick(e) {
  // [LOCK] Do not allow selecting the measurement while drawing it
  if (store.activeMeasurement && store.activeMeasurement.id === props.measurement.id) return

  if (store.activeTool === 'delete') {
    store.removeMeasurement(props.measurement.id)
    return
  }
  e.cancelBubble = true
  const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
  store.selectObject(props.measurement.id, isMulti)
}

function handlePointDragStart(e) {
  // [LOCK] STRICT IDIOT CHECK: 
  // If this is the measurement currently being drawn, stop the drag immediately.
  // Users must finish the line (Right Click) before they can edit points.
  if (store.activeMeasurement && store.activeMeasurement.id === props.measurement.id) {
    e.target.stopDrag()
    e.cancelBubble = true
    return
  }

  e.cancelBubble = true
  // Lock the local state so incoming store updates don't interrupt the drag
  isDragging.value = true
}

function handlePointDragMove(e, index) {
  e.cancelBubble = true
  const node = e.target 
  
  // 1. Get current visual position (already snapped by dragBoundFunc)
  const currentX = node.x() / props.scale
  const currentY = node.y() / props.scale

  // 2. Update LOCAL state directly
  if (localPoints.value[index]) {
    localPoints.value[index] = { x: currentX, y: currentY }
  }
}

function handlePointDragEnd(e, index) {
  e.cancelBubble = true
  const node = e.target
  
  // 1. Capture final position
  const finalX = node.x() / props.scale
  const finalY = node.y() / props.scale

  // 2. Update Local State one last time
  if (localPoints.value[index]) {
    localPoints.value[index] = { x: finalX, y: finalY }
  }

  // 3. Update Store
  store.updateMeasurementPoint(props.measurement.id, index, finalX, finalY)

  // 4. Unlock
  isDragging.value = false
}

// Snapping Logic
function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch snap
  
  let x = Math.round((pos.x - layerAbs.x) / step) * step
  let y = Math.round((pos.y - layerAbs.y) / step) * step
  
  return { x: x + layerAbs.x, y: y + layerAbs.y }
}
</script>

<template>
  <v-group @click="handleClick" :config="{ opacity: props.opacity || 1 }">
    
    <template v-for="(seg, i) in segments" :key="'seg-'+i">
      <v-line :config="{
        points: [seg.p1.x * scale, seg.p1.y * scale, seg.p2.x * scale, seg.p2.y * scale],
        stroke: color, 
        strokeWidth: 3, 
        dash: [6, 4], 
        hitStrokeWidth: 20,
        listening: false 
      }" />
      
      <v-label :config="{ x: seg.midX * scale, y: seg.midY * scale }">
        <v-tag :config="{ 
          fill: 'white', 
          stroke: color,
          strokeWidth: 1,
          opacity: 0.9, 
          cornerRadius: 4,
          pointerDirection: 'down',
          pointerWidth: 8,
          pointerHeight: 6,
          listening: false
        }" />
        <v-text :config="{ 
          text: seg.label, 
          fontSize: 18, 
          fontStyle: 'bold', 
          fill: color, 
          padding: 4, 
          align: 'center',
          listening: false
        }" />
      </v-label>
    </template>

    <template v-for="(pt, i) in localPoints" :key="'pt-'+i">
      <v-group
        :config="{
          x: pt.x * scale,
          y: pt.y * scale,
          draggable: true,
          dragBoundFunc: dragBoundFunc
        }"
        @dragstart="handlePointDragStart"
        @dragmove="handlePointDragMove($event, i)"
        @dragend="handlePointDragEnd($event, i)"
      >
        <v-circle :config="{ 
          radius: 7, 
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
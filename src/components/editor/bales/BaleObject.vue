<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps({
  bale: Object,
  scale: Number,
  // [FIX] Accept the opacity prop
  opacity: {
    type: Number,
    default: 1
  }
})
const emit = defineEmits(['dragstart', 'dragmove', 'dragend', 'contextmenu', 'click'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({
  getNode: () => groupRef.value?.getNode()
})

// --- 1. Dynamic Dimensions (Based on Settings) ---
const dims = computed(() => {
  // Ensure config exists and default to standard values if missing
  const L = store.baleConfig?.length || 3
  const W = store.baleConfig?.width || 1.5
  const H = store.baleConfig?.height || 1

  const orientation = props.bale?.orientation || 'flat'
  if (orientation === 'pillar') return { width: W, height: H }
  if (orientation === 'tall') return { width: L, height: H }
  return { width: L, height: W } 
})

// --- 2. Dynamic Pivot (Center of the object) ---
const s = computed(() => props.scale || 1)
const halfW = computed(() => (dims.value.width || 0) / 2)
const halfH = computed(() => (dims.value.height || 0) / 2)

// --- 3. Appearance Logic ---
const fillColor = computed(() => {
  if (props.bale.custom?.fillColor) return props.bale.custom.fillColor
  
  switch (props.bale.layer) {
    case 1: return '#e6c200'
    case 2: return '#4caf50'
    case 3: return '#2196f3'
    default: return '#ccc'
  }
})


const strokeColor = computed(() => {
  if (store.selection.includes(props.bale.id)) return '#00a1ff'
  if (props.bale.custom?.strokeColor) return props.bale.custom.strokeColor
  if (props.bale.isAnchor) return '#d32f2f'
  return 'black'
})

const strokeWidth = computed(() => {
  if (store.selection.includes(props.bale.id)) return 3
  // Use a thicker border if a custom color is set so it's visible
  if (props.bale.custom?.strokeColor) return 2
  if (props.bale.isAnchor) return 2
  return 1
})

const shadowBlur = computed(() => {
  return store.selection.includes(props.bale.id) ? 10 : 0
})

// --- 4. Lean Arrow Helper ---
function getArrowPoints(w, h, direction) {
  const cx = w / 2; const cy = h / 2; const size = Math.min(w, h) * 0.4
  switch (direction) {
    case 'top': return [cx, cy + size, cx, cy - size]
    case 'bottom': return [cx, cy - size, cx, cy + size]
    case 'left': return [cx + size, cy, cx - size, cy]
    case 'right': return [cx - size, cy, cx + size, cy]
    default: return []
  }
}

// --- 5. Snapping Logic ---
function baleDragBoundFunc(pos) {
  const node = this
  
  // 1. Get Visual Dimensions
  const visualW = dims.value.width * props.scale
  const visualH = dims.value.height * props.scale

  // 2. Calculate Rotated Bounding Box (to handle diagonals)
  const rad = (props.bale.rotation * Math.PI) / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))

  const bboxW = (visualW * absCos) + (visualH * absSin)
  const bboxH = (visualW * absSin) + (visualH * absCos)

  // 3. Define Constraints (Keep center inside ring padded by half-size)
  const minX = bboxW / 2
  const maxX = (store.ringDimensions.width * props.scale) - (bboxW / 2)
  const minY = bboxH / 2
  const maxY = (store.ringDimensions.height * props.scale) - (bboxH / 2)

  // 4. Calculate Grid Snapping (Edge-Based)
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch grid

  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y

  // [FIX] Snap the VISUAL EDGE (Top-Left) instead of the Center
  // This ensures that objects with odd widths (e.g. 1.5' = 9 inches) 
  // still align their edges to the even grid lines (0", 2", 4"...)
  const halfW = bboxW / 2
  const halfH = bboxH / 2
  
  const leftEdge = relX - halfW
  const topEdge = relY - halfH

  // Snap the edge to the nearest grid line
  const snappedLeft = Math.round(leftEdge / step) * step
  const snappedTop = Math.round(topEdge / step) * step

  // Recalculate center based on the snapped edge
  let newCenterX = snappedLeft + halfW
  let newCenterY = snappedTop + halfH

  // 5. Apply Constraints
  newCenterX = Math.max(minX, Math.min(newCenterX, maxX))
  newCenterY = Math.max(minY, Math.min(newCenterY, maxY))

  return { x: newCenterX + layerAbs.x, y: newCenterY + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: bale.id,
      draggable: store.activeTool !== 'board' && store.activeTool !== 'hide', // Simple draggable (logic handled by Layer if multi-selected)
      dragBoundFunc: baleDragBoundFunc,
      listening: (bale.layer === store.currentLayer || store.selection.includes(bale.id)) && store.activeTool !== 'board' && store.activeTool !== 'hide',
      // [FIX] Dynamic Pivot Positioning
      x: ((bale.x || 0) * s) + (halfW * s),
      y: ((bale.y || 0) * s) + (halfH * s),
      rotation: bale.rotation,
      opacity: props.opacity,
      offsetX: halfW * s,
      offsetY: halfH * s
    }"
    @contextmenu="emit('contextmenu', $event)"
    @click="emit('click', $event)"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
  >
    <v-rect :config="{
      width: dims.width * s,
      height: dims.height * s,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      shadowBlur: shadowBlur,
      shadowColor: '#00a1ff'
    }" />

    <v-line v-if="bale.orientation === 'tall'" :config="{
      points: [0, 0, dims.width * scale, dims.height * scale],
      stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false
    }" />

    <v-group v-if="bale.orientation === 'pillar'">
      <v-line :config="{ points: [0, 0, dims.width * scale, dims.height * scale], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />
      <v-line :config="{ points: [dims.width * scale, 0, 0, dims.height * scale], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />
    </v-group>

    <v-text v-if="bale.isAnchor" :config="{
      text: '⚓',
      fontSize: 20,
      align: 'center',
      width: dims.width * scale,
      y: (dims.height * scale) / 2 - 10,
      listening: false
    }" />

    <v-arrow v-if="bale.lean"
      :config="{ 
        points: getArrowPoints(dims.width * scale, dims.height * scale, bale.lean), 
        pointerLength: 10, 
        pointerWidth: 10, 
        fill: 'black', 
        stroke: 'black', 
        strokeWidth: 4,
        listening: false
      }" 
    />
  </v-group>
</template>
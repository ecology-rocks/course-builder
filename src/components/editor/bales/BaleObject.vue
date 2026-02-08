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

const anchorLines = computed(() => {
  if (!props.bale.isAnchor) return []

  const cx = props.bale.x + dims.value.width / 2
  const cy = props.bale.y + dims.value.height / 2
  
  let candidates = []

  // A. CUSTOM RINGS LOGIC (Measure to Corners)
  // If any custom ring exists, we ONLY measure to its corner nodes.
  // We completely ignore the standard grid edges in this case.
  if (store.customWalls && store.customWalls.length > 0) {
    store.customWalls.forEach(wall => {
      // Iterate through every corner point (vertex) of the polygon
      wall.points.forEach(pt => {
        // Calculate direct distance to the corner
        const dist = Math.sqrt((cx - pt.x) ** 2 + (cy - pt.y) ** 2)
        
        candidates.push({
          x: pt.x,
          y: pt.y,
          dist: dist
        })
      })
    })
  } 
  // B. STANDARD GRID LOGIC (Fallback)
  // Only measure to grid edges if NO custom rings exist.
  else if (store.ringDimensions) {
    const W = store.ringDimensions.width
    const H = store.ringDimensions.height
    
    // Top Edge Point
    candidates.push({ x: cx, y: 0, dist: cy }) 
    // Bottom Edge Point
    candidates.push({ x: cx, y: H, dist: H - cy })
    // Left Edge Point
    candidates.push({ x: 0, y: cy, dist: cx })
    // Right Edge Point
    candidates.push({ x: W, y: cy, dist: W - cx })
  }

  // Sort by distance (shortest first) and take the top 2
  return candidates.sort((a, b) => a.dist - b.dist).slice(0, 2)
})

const fmtDist = (val) => {
  const ft = Math.floor(val)
  const inc = Math.round((val - ft) * 12)
  return inc === 0 ? `${ft}'` : `${ft}' ${inc}"`
}

// --- 1. Dynamic Dimensions (Based on Settings) ---
const dims = computed(() => {
  // Priority: Custom -> Global Config -> Hard Default
  const L = props.bale.custom?.length ?? store.baleConfig?.length ?? 3
  const W = props.bale.custom?.width ?? store.baleConfig?.width ?? 1.5
  const H = props.bale.custom?.height ?? store.baleConfig?.height ?? 1

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
  // Priority: Custom Color > Store Layer Color > Default Gray
  if (props.bale.custom?.fillColor) return props.bale.custom.fillColor
  
  return store.baleColors[props.bale.layer] || '#ccc'
})

const boxDash = computed(() => {
  const style = props.bale.custom?.borderStyle
  if (style === 'dashed') return [10, 5] // standard dash pattern
  return null // null = solid line
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
      draggable: store.activeTool !== 'board' && store.activeTool !== 'hide', 
      dragBoundFunc: baleDragBoundFunc,
      listening: (bale.layer === store.currentLayer || store.selection.includes(bale.id)) && store.activeTool !== 'board' && store.activeTool !== 'hide',
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
      dash: boxDash,
      shadowBlur: shadowBlur,
      shadowColor: '#00a1ff'
    }" />

    <v-group v-if="bale.isAnchor && anchorLines.length">
      <template v-for="(line, i) in anchorLines" :key="'anch-'+i">
        <v-line :config="{
          points: [
            dims.width * s / 2,         // Start: Center of Bale X
            dims.height * s / 2,        // Start: Center of Bale Y
            (line.x - bale.x) * scale,  // End: Wall X (converted to local space)
            (line.y - bale.y) * scale   // End: Wall Y (converted to local space)
          ],
          stroke: '#d32f2f',
          strokeWidth: 3,
          dash: [6, 4],
          listening: false // Click-through
        }" />
        
        <v-label :config="{
          // Position label at midpoint of the line
          x: ((dims.width * s / 2) + ((line.x - bale.x) * scale)) / 2,
          y: ((dims.height * s / 2) + ((line.y - bale.y) * scale)) / 2
        }">
          <v-tag :config="{ 
            fill: 'white', 
            stroke: '#d32f2f', 
            strokeWidth: 1, 
            cornerRadius: 4,
            opacity: 0.9 
          }" />
          <v-text :config="{
            text: fmtDist(line.dist),
            fontSize: 18,
            padding: 4,
            fill: '#d32f2f',
            fontStyle: 'bold'
          }" />
        </v-label>
      </template>
    </v-group>

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
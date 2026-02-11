<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useCustomWalls } from '@/components/editor/walls/useCustomWalls'

const props = defineProps({
  bale: Object,
  scale: Number,
  opacity: {
    type: Number,
    default: 1
  }
})
const emit = defineEmits(['dragstart', 'dragmove', 'dragend', 'contextmenu', 'click'])
const store = useMapStore()
const groupRef = ref(null)

const { getAngleSnapPoint } = useCustomWalls(store)

defineExpose({
  getNode: () => groupRef.value?.getNode()
})

// Safe scale access
const s = computed(() => props.scale || 1)

const dims = computed(() => {
  const L = props.bale.custom?.length ?? store.baleConfig?.length ?? 3
  const W = props.bale.custom?.width ?? store.baleConfig?.width ?? 1.5
  const H = props.bale.custom?.height ?? store.baleConfig?.height ?? 1

  const orientation = props.bale?.orientation || 'flat'
  if (orientation === 'pillar') return { width: W, height: H }
  if (orientation === 'tall') return { width: L, height: H }
  return { width: L, height: W } 
})

// --- HELPER: Get Intersection on Bale Edge ---
function getEdgePoint(localX, localY, w, h) {
  const cx = w / 2
  const cy = h / 2
  const dx = localX - cx
  const dy = localY - cy

  // If center or very close, return center to avoid div-by-zero
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy }

  const halfW = w / 2
  const halfH = h / 2

  // Calculate the factor 't' needed to scale the vector (dx,dy) to hit the box edge
  // tX = distance to vertical edge / dx
  // tY = distance to horizontal edge / dy
  const tX = dx !== 0 ? (dx > 0 ? halfW : -halfW) / dx : Infinity
  const tY = dy !== 0 ? (dy > 0 ? halfH : -halfH) / dy : Infinity

  // The smallest positive 't' is the first wall we hit
  const t = Math.min(Math.abs(tX), Math.abs(tY))

  return {
    x: cx + dx * t,
    y: cy + dy * t
  }
}

// --- COORDINATE TRANSFORMS (Pure Math for Stability) ---
// We use manual trig here because 'computed' props run before the Konva Node exists.
// Using getAbsoluteTransform() here would cause crashes/NaNs on mount.

function worldToLocal(worldPt) {
  // 1. Get Vector from Bale Center to World Point
  const cx = (props.bale.x || 0) + dims.value.width / 2
  const cy = (props.bale.y || 0) + dims.value.height / 2
  const dx = (worldPt.x || 0) - cx
  const dy = (worldPt.y || 0) - cy

  // 2. Rotate Vector by -BaleRotation (Counter-Rotate)
  const rot = props.bale.rotation || 0
  const angleRad = -rot * (Math.PI / 180)
  
  const rdx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
  const rdy = dx * Math.sin(angleRad) + dy * Math.cos(angleRad)

  // 3. Convert to Local Pixels (relative to Group Origin at Top-Left)
  return {
    x: (dims.value.width / 2 + rdx) * s.value,
    y: (dims.value.height / 2 + rdy) * s.value
  }
}

function localToWorld(localPx) {
  // 1. Get Vector from Local Center (in pixels)
  const centerPxX = (dims.value.width / 2) * s.value
  const centerPxY = (dims.value.height / 2) * s.value
  const vx_px = (localPx.x || 0) - centerPxX
  const vy_px = (localPx.y || 0) - centerPxY

  // 2. Unscale to Grid Units
  const safeScale = s.value === 0 ? 1 : s.value
  const vx = vx_px / safeScale
  const vy = vy_px / safeScale

  // 3. Rotate Vector by +BaleRotation (Local -> World)
  const rot = props.bale.rotation || 0
  const angleRad = rot * (Math.PI / 180)

  const rdx = vx * Math.cos(angleRad) - vy * Math.sin(angleRad)
  const rdy = vx * Math.sin(angleRad) + vy * Math.cos(angleRad)

  // 4. Add to World Center
  const cx = (props.bale.x || 0) + dims.value.width / 2
  const cy = (props.bale.y || 0) + dims.value.height / 2

  return {
    x: cx + rdx,
    y: cy + rdy
  }
}

// --- Anchor Line Logic ---
const anchorLines = computed(() => {
  if (!props.bale.isAnchor) return []

  // Safe checks
  const baleX = props.bale.x || 0
  const baleY = props.bale.y || 0
  const cx = baleX + dims.value.width / 2
  const cy = baleY + dims.value.height / 2
  
  // Helper to process a world point into a display line
  const processPoint = (pt, isManual) => {
    // 1. Get Local Point (Center of the anchor circle)
    const local = worldToLocal(pt)
    
    // 2. Get Edge Intersection (Where line connects to bale)
    const edge = getEdgePoint(local.x, local.y, dims.value.width * s.value, dims.value.height * s.value)
    
    // 3. Calculate Distance: World Point <-> World Edge
    // We must convert Edge back to world to get accurate "feet" distance
    const edgeWorld = localToWorld(edge)
    const dist = Math.sqrt(((pt.x || 0) - edgeWorld.x) ** 2 + ((pt.y || 0) - edgeWorld.y) ** 2)

    return { 
      x: pt.x, y: pt.y, 
      localX: local.x, localY: local.y,
      edgeX: edge.x, edgeY: edge.y,
      dist, isManual 
    }
  }

  // 1. MANUAL ANCHORS (Priority)
  if (props.bale.customAnchors && props.bale.customAnchors.length > 0) {
    return props.bale.customAnchors.map(pt => processPoint(pt, true))
  }

  // 2. AUTOMATIC FALLBACK
  if ((!store.customWalls || store.customWalls.length === 0) && store.ringDimensions) {
    const W = store.ringDimensions.width
    const H = store.ringDimensions.height
    
    // Simple Candidates (Center to Wall)
    let candidates = []
    candidates.push({ x: cx, y: 0, dist: cy }) 
    candidates.push({ x: cx, y: H, dist: H - cy })
    candidates.push({ x: 0, y: cy, dist: cx })
    candidates.push({ x: W, y: cy, dist: W - cx })

    return candidates
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2)
      .map(c => processPoint(c, false))
  }

  return []
})

const fmtDist = (val) => {
  if (isNaN(val)) return "0'"
  const ft = Math.floor(val)
  const inc = Math.round((val - ft) * 12)
  return inc === 0 ? `${ft}'` : `${ft}' ${inc}"`
}

// --- Manual Anchor Drag Handlers ---

function handleAnchorMouseDown(e) {
  e.cancelBubble = true
}

function handleAnchorDragStart(e) {
  e.cancelBubble = true
}

function handleAnchorDrag(e, index) {
  e.cancelBubble = true
  
  const node = e.target
  const group = node.getParent()
  const stage = node.getStage()
  
  // 1. Calculate Grid Coordinates from Pointer
  const pointerPos = stage.getPointerPosition() || { x: 0, y: 0 }
  const gridX = (pointerPos.x - store.gridOffset) / s.value
  const gridY = (pointerPos.y - store.gridOffset) / s.value

  // 2. Calculate Bale Center
  const cx = (props.bale.x || 0) + dims.value.width / 2
  const cy = (props.bale.y || 0) + dims.value.height / 2

  // 3. Find Snap Point (World Space)
  const snap = getAngleSnapPoint(
      {x: cx, y: cy}, 
      {x: gridX, y: gridY}, 
      store.ringDimensions.width, 
      store.ringDimensions.height
  )
  
  if (snap) {
    // 4. Convert World Snap -> Local Coordinates
    const local = worldToLocal(snap)
    
    // 5. Update the Drag Handle (Circle)
    node.position({ x: local.x, y: local.y })

    // 6. Direct Node Manipulation: Update Line and Label
    const lineNode = group.findOne(`.anchor-line-${index}`)
    const labelGroup = group.findOne(`.anchor-label-${index}`)
    const textNode = group.findOne(`.anchor-text-${index}`)

    // [NEW] Calculate Edge point for the visual line
    const edge = getEdgePoint(local.x, local.y, dims.value.width * s.value, dims.value.height * s.value)

    if (lineNode) {
      // Draw from Edge -> Anchor Point
      lineNode.points([edge.x, edge.y, local.x, local.y])
    }

    if (labelGroup) {
      labelGroup.position({
        x: (edge.x + local.x) / 2,
        y: (edge.y + local.y) / 2
      })
    }
    
    if (textNode) {
      // Calculate dist from edge for text
      const edgeWorld = localToWorld(edge)
      const newDist = Math.sqrt(((snap.x||0) - edgeWorld.x) ** 2 + ((snap.y||0) - edgeWorld.y) ** 2)
      textNode.text(fmtDist(newDist))
    }
  }
}

function handleAnchorDragEnd(e, index) {
  e.cancelBubble = true
  const node = e.target
  
  const localPos = { x: node.x(), y: node.y() }
  const worldPos = localToWorld(localPos)

  const currentLines = anchorLines.value 
  const newAnchors = currentLines.map(l => ({ x: l.x, y: l.y }))
  
  newAnchors[index] = { x: worldPos.x, y: worldPos.y }
  
  store.setCustomAnchors(props.bale.id, newAnchors)
}

// --- Standard Appearance Logic ---
const halfW = computed(() => (dims.value.width || 0) / 2)
const halfH = computed(() => (dims.value.height || 0) / 2)

const fillColor = computed(() => {
  if (props.bale.custom?.fillColor) return props.bale.custom.fillColor
  return store.baleColors[props.bale.layer] || '#ccc'
})

const boxDash = computed(() => {
  const style = props.bale.custom?.borderStyle
  if (style === 'dashed') return [10, 5]
  return null
})

const strokeColor = computed(() => {
  if (store.selection.includes(props.bale.id)) return '#00a1ff'
  if (props.bale.custom?.strokeColor) return props.bale.custom.strokeColor
  if (props.bale.isAnchor) return '#d32f2f'
  return 'black'
})

const strokeWidth = computed(() => {
  if (store.selection.includes(props.bale.id)) return 3
  if (props.bale.custom?.strokeColor) return 2
  if (props.bale.isAnchor) return 2
  return 1
})

const shadowBlur = computed(() => {
  return store.selection.includes(props.bale.id) ? 10 : 0
})

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

function baleDragBoundFunc(pos) {
  // Use safe access here just in case
  const node = this
  const visualW = dims.value.width * s.value
  const visualH = dims.value.height * s.value
  const rad = ((props.bale.rotation || 0) * Math.PI) / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))
  const bboxW = (visualW * absCos) + (visualH * absSin)
  const bboxH = (visualW * absSin) + (visualH * absCos)
  
  const minX = bboxW / 2
  const maxX = (store.ringDimensions.width * s.value) - (bboxW / 2)
  const minY = bboxH / 2
  const maxY = (store.ringDimensions.height * s.value) - (bboxH / 2)
  
  const layerAbs = node.getLayer() ? node.getLayer().getAbsolutePosition() : {x:0, y:0}
  const step = s.value / 6 
  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y
  const halfW = bboxW / 2
  const halfH = bboxH / 2
  const leftEdge = relX - halfW
  const topEdge = relY - halfH
  const snappedLeft = Math.round(leftEdge / step) * step
  const snappedTop = Math.round(topEdge / step) * step
  let newCenterX = snappedLeft + halfW
  let newCenterY = snappedTop + halfH
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
      draggable: store.activeTool !== 'board' && store.activeTool !== 'hide' && store.activeTool !== 'anchor', 
      dragBoundFunc: baleDragBoundFunc,
      listening: (bale.layer === store.currentLayer || store.selection.includes(bale.id)) && store.activeTool !== 'board' && store.activeTool !== 'hide',
      x: ((bale.x || 0) * s) + (halfW * s),
      y: ((bale.y || 0) * s) + (halfH * s),
      rotation: bale.rotation || 0,
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
          name: `anchor-line-${i}`, 
          points: [
            line.edgeX, 
            line.edgeY,        
            line.localX, 
            line.localY   
          ],
          stroke: '#d32f2f',
          strokeWidth: 3,
          dash: [6, 4],
          listening: false 
        }" />
        
        <v-label :config="{
          name: `anchor-label-${i}`,
          x: (line.edgeX + line.localX) / 2,
          y: (line.edgeY + line.localY) / 2,
          rotation: -(bale.rotation || 0),
          listening: false
        }">
          <v-tag :config="{ 
            fill: 'white', 
            stroke: '#d32f2f', 
            strokeWidth: 1, 
            cornerRadius: 4,
            opacity: 0.9 
          }" />
          <v-text :config="{
            name: `anchor-text-${i}`,
            text: fmtDist(line.dist),
            fontSize: 18,
            padding: 4,
            fill: '#d32f2f',
            fontStyle: 'bold'
          }" />
        </v-label>

        <v-circle v-if="store.activeTool === 'anchor'" :config="{
           x: line.localX,
           y: line.localY,
           radius: 8,
           fill: '#d32f2f',
           stroke: 'white',
           strokeWidth: 2,
           draggable: true
        }" 
        @mousedown="handleAnchorMouseDown"
        @dragmove="handleAnchorDrag($event, i)"
        @dragstart="handleAnchorDragStart"
        @dragend="handleAnchorDragEnd($event, i)"
        />

      </template>
    </v-group>

    <v-line v-if="bale.orientation === 'tall'" :config="{ points: [0, 0, dims.width * s, dims.height * s], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />

    <v-group v-if="bale.orientation === 'pillar'">
      <v-line :config="{ points: [0, 0, dims.width * s, dims.height * s], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />
      <v-line :config="{ points: [dims.width * s, 0, 0, dims.height * s], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />
    </v-group>

    <v-text v-if="bale.isAnchor" :config="{ text: '⚓', fontSize: 20, align: 'center', width: dims.width * s, y: (dims.height * s) / 2 - 10, listening: false }" />

    <v-arrow v-if="bale.lean" :config="{ points: getArrowPoints(dims.width * s, dims.height * s, bale.lean), pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4, listening: false }" />
  </v-group>
</template>
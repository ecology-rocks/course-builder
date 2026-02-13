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

// --- DIMENSIONS & CENTER ---
const dims = computed(() => {
  const L = props.bale.custom?.length ?? store.baleConfig?.length ?? 3
  const W = props.bale.custom?.width ?? store.baleConfig?.width ?? 1.5
  const H = props.bale.custom?.height ?? store.baleConfig?.height ?? 1

  const orientation = props.bale?.orientation || 'flat'
  if (orientation === 'pillar') return { width: W, height: H }
  if (orientation === 'tall') return { width: L, height: H }
  return { width: L, height: W } 
})

// Visual Center in Local Pixels
const localCenter = computed(() => ({
  x: (dims.value.width * s.value) / 2,
  y: (dims.value.height * s.value) / 2
}))

// Visual Center in World Grid
const worldCenter = computed(() => ({
  x: (props.bale.x || 0) + dims.value.width / 2,
  y: (props.bale.y || 0) + dims.value.height / 2
}))

// --- COORDINATE TRANSFORMS ---

function localToWorld(localPx) {
  const dxPx = localPx.x - localCenter.value.x
  const dyPx = localPx.y - localCenter.value.y
  const dx = dxPx / s.value
  const dy = dyPx / s.value
  const rad = (props.bale.rotation || 0) * (Math.PI / 180)
  
  const rdx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const rdy = dx * Math.sin(rad) + dy * Math.cos(rad)

  return {
    x: worldCenter.value.x + rdx,
    y: worldCenter.value.y + rdy
  }
}

function worldToLocal(worldPt) {
  const dx = (worldPt.x || 0) - worldCenter.value.x
  const dy = (worldPt.y || 0) - worldCenter.value.y
  const rad = -(props.bale.rotation || 0) * (Math.PI / 180)
  
  const rdx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const rdy = dx * Math.sin(rad) + dy * Math.cos(rad)
  
  return {
    x: localCenter.value.x + (rdx * s.value),
    y: localCenter.value.y + (rdy * s.value)
  }
}

// --- ANCHOR LINES ---
const anchorLines = computed(() => {
  if (!props.bale.isAnchor || !props.bale.customAnchors) return []

  // Map the saved anchor points (on walls) to visual lines
  return props.bale.customAnchors.map(pt => {
    // 1. Convert Anchor Point (World) to Local Space
    const local = worldToLocal(pt)

    // 2. Find the nearest corner on the bale to start the line from
    const edge = getCornerPoint(local.x, local.y, dims.value.width * s.value, dims.value.height * s.value)
    
    // 3. Calculate distance for the label
    const edgeWorld = localToWorld(edge)
    const dist = Math.sqrt(((pt.x || 0) - edgeWorld.x) ** 2 + ((pt.y || 0) - edgeWorld.y) ** 2)

    return { 
      x: pt.x, y: pt.y, 
      localX: local.x, localY: local.y,       // End of line (Wall)
      edgeX: edge.x, edgeY: edge.y,           // Start of line (Bale Corner)
      dist
    }
  })
})

// --- HELPERS ---

function getCornerPoint(localX, localY, w, h) {
  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ]
  let best = corners[0]
  let minD = Infinity
  corners.forEach(c => {
    const d = (c.x - localX) ** 2 + (c.y - localY) ** 2
    if (d < minD) { minD = d; best = c }
  })
  return best
}

const fmtDist = (val) => {
  if (isNaN(val)) return "0'"
  const ft = Math.floor(val)
  const inc = Math.round((val - ft) * 12)
  return inc === 0 ? `${ft}'` : `${ft}' ${inc}"`
}

// --- DRAG HANDLERS ---

function handleAnchorMouseDown(e) { e.cancelBubble = true }
function handleAnchorDragStart(e) { e.cancelBubble = true }

function handleAnchorDrag(e, index) {
  e.cancelBubble = true
  const node = e.target
  const group = node.getParent()
  const stage = node.getStage()
  
  const pointerPos = stage.getPointerPosition() || { x: 0, y: 0 }
  // Calculate Grid Coordinates
  const gridX = (pointerPos.x - (stage.x() || 0)) / (stage.scaleX() || 1) / s.value
  const gridY = (pointerPos.y - (stage.y() || 0)) / (stage.scaleY() || 1) / s.value

  // Snap to walls/grid
  const snap = getAngleSnapPoint(
      worldCenter.value, 
      {x: gridX, y: gridY}, 
      store.ringDimensions.width, 
      store.ringDimensions.height
  )
  
  if (snap) {
    const local = worldToLocal(snap)
    node.position({ x: local.x, y: local.y })

    // Update Visuals
    const edge = getCornerPoint(local.x, local.y, dims.value.width * s.value, dims.value.height * s.value)
    
    const lineNode = group.findOne(`.anchor-line-${index}`)
    const labelGroup = group.findOne(`.anchor-label-${index}`)
    const textNode = group.findOne(`.anchor-text-${index}`)

    if (lineNode) lineNode.points([edge.x, edge.y, local.x, local.y])
    if (labelGroup) labelGroup.position({ x: (edge.x + local.x) / 2, y: (edge.y + local.y) / 2 })
    if (textNode) {
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

  // Update Store
  const newAnchors = [...(props.bale.customAnchors || [])]
  newAnchors[index] = { x: worldPos.x, y: worldPos.y }
  store.setCustomAnchors(props.bale.id, newAnchors)
}

// --- APPEARANCE ---
const halfW = computed(() => (dims.value.width || 0) / 2)
const halfH = computed(() => (dims.value.height || 0) / 2)

const fillColor = computed(() => {
  if (props.bale.custom?.fillColor) return props.bale.custom.fillColor
  return store.baleColors[props.bale.layer] || '#ccc'
})

const boxDash = computed(() => props.bale.custom?.borderStyle === 'dashed' ? [10, 5] : null)

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

const shadowBlur = computed(() => store.selection.includes(props.bale.id) ? 10 : 0)

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
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

const dims = computed(() => {
  const L = props.bale.custom?.length ?? store.baleConfig?.length ?? 3
  const W = props.bale.custom?.width ?? store.baleConfig?.width ?? 1.5
  const H = props.bale.custom?.height ?? store.baleConfig?.height ?? 1

  const orientation = props.bale?.orientation || 'flat'
  if (orientation === 'pillar') return { width: W, height: H }
  if (orientation === 'tall') return { width: L, height: H }
  return { width: L, height: W } 
})

// --- COORDINATE TRANSFORMS ---
// Because the Group is rotated, we must counter-rotate World points to draw them locally.

function worldToLocal(worldPt) {
  // 1. Get Vector from Bale Center to World Point
  const cx = props.bale.x + dims.value.width / 2
  const cy = props.bale.y + dims.value.height / 2
  const dx = worldPt.x - cx
  const dy = worldPt.y - cy

  // 2. Rotate Vector by -BaleRotation (Counter-Rotate)
  const angleRad = -props.bale.rotation * (Math.PI / 180)
  const rdx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
  const rdy = dx * Math.sin(angleRad) + dy * Math.cos(angleRad)

  // 3. Convert to Local Pixels (relative to Group Origin at Top-Left)
  // Local Center is at (width/2, height/2) * scale
  return {
    x: (dims.value.width / 2 + rdx) * s.value,
    y: (dims.value.height / 2 + rdy) * s.value
  }
}

function localToWorld(localPx) {
  // 1. Get Vector from Local Center (in pixels)
  const centerPxX = (dims.value.width / 2) * s.value
  const centerPxY = (dims.value.height / 2) * s.value
  const vx_px = localPx.x - centerPxX
  const vy_px = localPx.y - centerPxY

  // 2. Unscale to Grid Units
  const vx = vx_px / s.value
  const vy = vy_px / s.value

  // 3. Rotate Vector by +BaleRotation (Local -> World)
  const angleRad = props.bale.rotation * (Math.PI / 180)
  const rdx = vx * Math.cos(angleRad) - vy * Math.sin(angleRad)
  const rdy = vx * Math.sin(angleRad) + vy * Math.cos(angleRad)

  // 4. Add to World Center
  const cx = props.bale.x + dims.value.width / 2
  const cy = props.bale.y + dims.value.height / 2

  return {
    x: cx + rdx,
    y: cy + rdy
  }
}

// --- Anchor Line Logic ---
const anchorLines = computed(() => {
  if (!props.bale.isAnchor) return []

  const cx = props.bale.x + dims.value.width / 2
  const cy = props.bale.y + dims.value.height / 2
  
  // 1. MANUAL ANCHORS (Priority)
  if (props.bale.customAnchors && props.bale.customAnchors.length > 0) {
    return props.bale.customAnchors.map(pt => {
      const dist = Math.sqrt((cx - pt.x) ** 2 + (cy - pt.y) ** 2)
      // Calculate Local Coordinates for rendering
      const local = worldToLocal(pt)
      return { 
        x: pt.x, y: pt.y, // World (for data)
        localX: local.x, localY: local.y, // Local (for render)
        dist: dist, isManual: true 
      }
    })
  }

  // 2. AUTOMATIC FALLBACK
  if ((!store.customWalls || store.customWalls.length === 0) && store.ringDimensions) {
    const W = store.ringDimensions.width
    const H = store.ringDimensions.height
    
    let candidates = []
    candidates.push({ x: cx, y: 0, dist: cy }) 
    candidates.push({ x: cx, y: H, dist: H - cy })
    candidates.push({ x: 0, y: cy, dist: cx })
    candidates.push({ x: W, y: cy, dist: W - cx })

    // Return best 2, marked as automatic
    return candidates.sort((a, b) => a.dist - b.dist).slice(0, 2).map(c => {
       const local = worldToLocal(c)
       return {
         ...c,
         localX: local.x, 
         localY: local.y,
         isManual: false
       }
    })
  }

  return []
})

const fmtDist = (val) => {
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
  
  const node = e.target // The Circle
  const group = node.getParent() // The Bale Group
  const stage = node.getStage()
  
  // 1. Calculate Grid Coordinates from Pointer
  const pointerPos = stage.getPointerPosition()
  const gridX = (pointerPos.x - store.gridOffset) / props.scale
  const gridY = (pointerPos.y - store.gridOffset) / props.scale

  // 2. Calculate Bale Center (Origin)
  const cx = props.bale.x + dims.value.width / 2
  const cy = props.bale.y + dims.value.height / 2

  // 3. Find Snap Point (World Space)
  const snap = getAngleSnapPoint(
      {x: cx, y: cy}, 
      {x: gridX, y: gridY}, 
      store.ringDimensions.width, 
      store.ringDimensions.height
  )
  
  if (snap) {
    // 4. Convert World Snap -> Local Coordinates for the Node
    const local = worldToLocal(snap)
    
    // 5. Update the Drag Handle (Circle)
    node.position({ x: local.x, y: local.y })

    // 6. Direct Node Manipulation: Update Line and Label
    const lineNode = group.findOne(`.anchor-line-${index}`)
    const labelGroup = group.findOne(`.anchor-label-${index}`)
    const textNode = group.findOne(`.anchor-text-${index}`)
    
    const centerX = dims.value.width * s.value / 2
    const centerY = dims.value.height * s.value / 2

    if (lineNode) {
      lineNode.points([centerX, centerY, local.x, local.y])
    }

    if (labelGroup) {
      labelGroup.position({
        x: (centerX + local.x) / 2,
        y: (centerY + local.y) / 2
      })
    }
    
    if (textNode) {
      const newDist = Math.sqrt((cx - snap.x) ** 2 + (cy - snap.y) ** 2)
      textNode.text(fmtDist(newDist))
    }
  }
}

function handleAnchorDragEnd(e, index) {
  e.cancelBubble = true
  const node = e.target
  
  // 1. Get final local position
  const localPos = { x: node.x(), y: node.y() }

  // 2. Convert to World Coordinates
  const worldPos = localToWorld(localPos)

  // 3. Materialize / Update
  const currentLines = anchorLines.value 
  const newAnchors = currentLines.map(l => ({ x: l.x, y: l.y }))
  
  // Update the specific one we moved
  newAnchors[index] = { x: worldPos.x, y: worldPos.y }
  
  store.setCustomAnchors(props.bale.id, newAnchors)
}

// --- Standard Appearance Logic ---
const s = computed(() => props.scale || 1)
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
  const node = this
  const visualW = dims.value.width * props.scale
  const visualH = dims.value.height * props.scale
  const rad = (props.bale.rotation * Math.PI) / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))
  const bboxW = (visualW * absCos) + (visualH * absSin)
  const bboxH = (visualW * absSin) + (visualH * absCos)
  const minX = bboxW / 2
  const maxX = (store.ringDimensions.width * props.scale) - (bboxW / 2)
  const minY = bboxH / 2
  const maxY = (store.ringDimensions.height * props.scale) - (bboxH / 2)
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 
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
          name: `anchor-line-${i}`, 
          points: [
            dims.width * s / 2,         
            dims.height * s / 2,        
            line.localX, // Use transformed local Coords
            line.localY   
          ],
          stroke: '#d32f2f',
          strokeWidth: 3,
          dash: [6, 4],
          listening: false 
        }" />
        
        <v-label :config="{
          name: `anchor-label-${i}`,
          x: ((dims.width * s / 2) + line.localX) / 2,
          y: ((dims.height * s / 2) + line.localY) / 2,
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

    <v-line v-if="bale.orientation === 'tall'" :config="{ points: [0, 0, dims.width * scale, dims.height * scale], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />

    <v-group v-if="bale.orientation === 'pillar'">
      <v-line :config="{ points: [0, 0, dims.width * scale, dims.height * scale], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />
      <v-line :config="{ points: [dims.width * scale, 0, 0, dims.height * scale], stroke: 'black', strokeWidth: 2, opacity: 0.4, listening: false }" />
    </v-group>

    <v-text v-if="bale.isAnchor" :config="{ text: '⚓', fontSize: 20, align: 'center', width: dims.width * scale, y: (dims.height * scale) / 2 - 10, listening: false }" />

    <v-arrow v-if="bale.lean" :config="{ points: getArrowPoints(dims.width * scale, dims.height * scale, bale.lean), pointerLength: 10, pointerWidth: 10, fill: 'black', stroke: 'black', strokeWidth: 4, listening: false }" />
  </v-group>
</template>
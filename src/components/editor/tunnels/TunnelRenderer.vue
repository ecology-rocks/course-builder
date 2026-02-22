<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useTunnelLogic } from './useTunnelLogic'

// [FIX] Add isPrinting prop
const props = defineProps({ 
  scale: Number,
  isPrinting: { type: Boolean, default: false }
})

const store = useMapStore()
const { resolvePathPoints, selectPath, handlePathClick } = useTunnelLogic(store)

// --- MATH HELPERS (Keep existing) ---
function getIntersection(p1, p2, p3, p4) {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)
  if (d === 0) return null
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) }
}

function getOffsetPolyline(points, offset) {
  if (points.length < 2) return []
  const lines = []
  for (let i = 0; i < points.length - 1; i++) {
    const pA = points[i]; const pB = points[i+1];
    const dx = pB.x - pA.x; const dy = pB.y - pA.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) continue;
    const nx = -dy / len; const ny = dx / len;
    lines.push({
      p1: { x: pA.x + nx * offset, y: pA.y + ny * offset },
      p2: { x: pB.x + nx * offset, y: pB.y + ny * offset }
    })
  }
  if (lines.length === 0) return []
  const result = []
  result.push(lines[0].p1)
  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i]; const l2 = lines[i+1];
    const intersect = getIntersection(l1.p1, l1.p2, l2.p1, l2.p2)
    if (intersect) result.push(intersect)
    else result.push(l1.p2) 
  }
  result.push(lines[lines.length - 1].p2)
  return result
}

function getPathLength(points) {
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i+1].x - points[i].x
    const dy = points[i+1].y - points[i].y
    total += Math.sqrt(dx*dx + dy*dy)
  }
  return total
}

function getPathMidpoint(points, totalLength) {
  if (points.length < 2) return points[0]
  let target = totalLength / 2
  let currentDist = 0
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]; const p2 = points[i+1];
    const dx = p2.x - p1.x; const dy = p2.y - p1.y;
    const segLen = Math.sqrt(dx*dx + dy*dy);
    if (currentDist + segLen >= target) {
      const t = (target - currentDist) / segLen
      return { x: p1.x + t * dx, y: p1.y + t * dy }
    }
    currentDist += segLen
  }
  return points[points.length - 1]
}

function formatLength(feet) {
  const f = Math.floor(feet)
  const i = Math.round((feet - f) * 12)
  if (i === 12) return `${f + 1}' 0"`
  return `${f}' ${i}"`
}


// --- COMPUTED STATE ---

const renderedTunnels = computed(() => {
  return store.mapData.tunnelPaths
    .filter(p => p.layer === store.currentLayer)
    .map(path => {
      const pts = resolvePathPoints(path)
      const len = getPathLength(pts)
      const mid = getPathMidpoint(pts, len)
      
      const isSelected = store.selection.includes(path.id)
      const isDrawing = path.id === store.tunnelConfig.activePathId
      
      let stroke = path.custom?.strokeColor || 'blue'
      let dash = path.custom?.dash || [10, 5]

      if (isDrawing) { stroke = '#ff00ff'; dash = [10, 5]; }
      if (isSelected) { stroke = '#fa8c16'; }

      const flatPoints = pts.flatMap(p => [p.x * props.scale, p.y * props.scale])

      let leftGuard = []
      let rightGuard = []

      // [FIX] Check !props.isPrinting to hide guards during print
      if (store.tunnelConfig.showGuardLines && !props.isPrinting) {
        const rawLeft = getOffsetPolyline(pts, 0.75)
        const rawRight = getOffsetPolyline(pts, -0.75)
        
        leftGuard = rawLeft.flatMap(p => [p.x * props.scale, p.y * props.scale])
        rightGuard = rawRight.flatMap(p => [p.x * props.scale, p.y * props.scale])
      }

      return {
        id: path.id,
        flatPoints,
        labelPos: { x: mid.x * props.scale, y: mid.y * props.scale },
        labelText: formatLength(len),
        stroke,
        dash, 
        width: path.custom?.strokeWidth || 2, 
        isSelected,
        leftGuard,
        rightGuard
      }
    })
})

function onLineClick(evt, pathId) {
  // Case 1: Drawing Mode - Clicked existing path -> Merge/Snap
  if (store.activeTool === 'tunnel_path') {
    evt.cancelBubble = true // Stop it from hitting the background and creating a free point
    
    // 1. Calculate grid coordinates from the event
    const stage = evt.target.getStage()
    const ptr = stage.getRelativePointerPosition()
    const GRID_OFFSET = 30
    const rawX = (ptr.x - GRID_OFFSET) / props.scale
    const rawY = (ptr.y - GRID_OFFSET) / props.scale

    // 2. Find the target path object
    const targetPath = store.mapData.tunnelPaths.find(p => p.id === pathId)
    
    // 3. Trigger the branching logic
    if (targetPath) {
      handlePathClick(targetPath, rawX, rawY)
    }
  }
  // Case 2: Selection Mode
  else {
    evt.cancelBubble = true
    selectPath(pathId)
  }
}

function onContextMenu(evt, pathId) {
  evt.evt.preventDefault() 
  store.closeAllMenus()
  const containerRect = evt.target.getStage().container().getBoundingClientRect()
  store.activeTunnelMenu = {
    id: pathId,
    x: containerRect.left + evt.target.getStage().getPointerPosition().x + 10,
    y: containerRect.top + evt.target.getStage().getPointerPosition().y + 10
  }
}
</script>

<template>
  <v-group>
    <v-group v-for="t in renderedTunnels" :key="t.id">
      
      <v-line 
        @click="onLineClick($event, t.id)"
        @tap="onLineClick($event, t.id)"
        @contextmenu="onContextMenu($event, t.id)"
        :config="{
          points: t.flatPoints,
          stroke: t.stroke,
          strokeWidth: t.isSelected ? (t.width + 4) : t.width,
          dash: t.dash,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.8,
          hitStrokeWidth: 20
        }"
        @mouseenter="$event.target.getStage().container().style.cursor = 'pointer'"
        @mouseleave="$event.target.getStage().container().style.cursor = 'default'"
      />

      <v-line 
         v-if="t.leftGuard.length > 0"
         :config="{
           points: t.leftGuard,
           stroke: 'red',
           strokeWidth: 2,
           dash: [4, 4],
           opacity: 0.5,
           lineJoin: 'round',
           listening: false
         }"
      />
      <v-line 
         v-if="t.rightGuard.length > 0"
         :config="{
           points: t.rightGuard,
           stroke: 'red',
           strokeWidth: 2,
           dash: [4, 4],
           opacity: 0.5,
           lineJoin: 'round',
           listening: false
         }"
      />

      <v-group 
        v-if="t.flatPoints.length > 2" 
        :config="{ x: t.labelPos.x, y: t.labelPos.y }"
        @click="onLineClick($event, t.id)"
        @tap="onLineClick($event, t.id)"
      >
        <v-label :config="{ offsetX: 20, offsetY: 10 }">
           <v-tag :config="{ fill: 'white', opacity: 0.8, cornerRadius: 4 }" />
           <v-text :config="{
             text: t.labelText,
             fill: t.stroke,
             fontSize: 14,
             fontStyle: 'bold',
             padding: 4
           }" />
        </v-label>
      </v-group>

    </v-group>
  </v-group>
</template>
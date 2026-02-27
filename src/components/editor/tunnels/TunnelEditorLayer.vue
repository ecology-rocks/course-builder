<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useTunnelLogic } from './useTunnelLogic'

const props = defineProps({ scale: Number })
const store = useMapStore()

const { 
  snapTargets, handleSnapClick, handleFreeClick, handlePathClick,
  freeDrawAnchor, handleFreeEdgeClick, findPathAtPoint, cancelFreeDraw,
  resolvePathPoints
} = useTunnelLogic(store)

const currentMousePos = ref({ x: 0, y: 0 })

const activePathLastPoint = computed(() => {
  if (store.activeTool === 'tunnel_path' && store.tunnelConfig.activePathId) {
    const path = store.mapData.tunnelPaths.find(p => p.id === store.tunnelConfig.activePathId)
    if (path && path.points && path.points.length > 0) {
      const pts = resolvePathPoints(path)
      return pts[pts.length - 1]
    }
  }
  return null
})

// [NEW] Global Escape Key Handler
function handleGlobalKey(e) {
  if (e.key === 'Escape') {
    // If we are currently drawing a board edge (anchor is set), cancel it
    if (freeDrawAnchor.value) {
       e.preventDefault()
       cancelFreeDraw()
    }
  }
}
// [NEW] Attach/Detach Listeners
onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKey))

// Handlers with Stop Propagation
function onHandleClick(evt, handle) {
  evt.cancelBubble = true 
  handleHandleClick(handle)
}
function onSnapClick(evt, targetId) {
  evt.cancelBubble = true
  handleSnapClick(targetId)
}

// Unified Stage Click Handler
function handleStageClick(e) {
  const stage = e.target.getStage()
  const ptr = stage.getRelativePointerPosition()
  const GRID_OFFSET = 30 
  const x = (ptr.x - GRID_OFFSET) / props.scale
  const y = (ptr.y - GRID_OFFSET) / props.scale
  currentMousePos.value = { x, y }

  // Case 1: Drawing Tunnel Path
  if (store.activeTool === 'tunnel_path' && store.tunnelConfig.activePathId) {
    // A. Check if we clicked on an EXISTING path first
    const targetPath = findPathAtPoint(x, y)
    
    if (targetPath) {
      // It's a merge/branch!
      handlePathClick(targetPath, x, y)
    } else {
      // It's a free point
      handleFreeClick(x, y)
    }
  }
  
  // Case 2: Free Drawing Edges (Simplified condition)
  else if (store.activeTool === 'tunnel_edges') {
    handleFreeEdgeClick(x, y)
  }
}

// Track mouse for the rubber-band line
function handleMouseMove(e) {
  if ((store.activeTool === 'tunnel_edges' && freeDrawAnchor.value) || 
      (store.activeTool === 'tunnel_path' && store.tunnelConfig.activePathId)) {
    const stage = e.target.getStage()
    const ptr = stage.getRelativePointerPosition()
    const GRID_OFFSET = 30
    const snap = (v) => Math.round(v * 6) / 6
    currentMousePos.value = {
      x: snap((ptr.x - GRID_OFFSET) / props.scale),
      y: snap((ptr.y - GRID_OFFSET) / props.scale)
    }
  }
}
</script>

<template>
  <v-group>
    
    <v-rect 
      v-if="store.activeTool === 'tunnel_path' || store.activeTool === 'tunnel_edges'"
      :config="{ x: -1000, y: -1000, width: 5000, height: 5000, fill: 'transparent' }"
      @click="handleStageClick"
      @tap="handleStageClick"
      @mousemove="handleMouseMove"
    />

    <v-group v-if="store.activeTool === 'tunnel_edges'">
      <v-line 
        v-if="freeDrawAnchor"
        :config="{
          points: [
            freeDrawAnchor.x * scale, 
            freeDrawAnchor.y * scale, 
            currentMousePos.x * scale, 
            currentMousePos.y * scale
          ],
          stroke: '#2196f3',
          strokeWidth: 2,
          dash: [5, 5],
          listening: false
        }"
      />
    </v-group>

    <v-group v-if="store.activeTool === 'tunnel_path'">
      <v-rect 
        v-for="target in snapTargets"
        :key="target.id"
        @click="onSnapClick($event, target.id)"
        @tap="onSnapClick($event, target.id)"
        :config="{
          x: target.x * scale,
          y: target.y * scale,
          width: 14, height: 14,
          offsetX: 7, offsetY: 7,
          fill: '#00bcd4',
          stroke: 'white',
          strokeWidth: 2,
          cursor: 'pointer',
          rotation: 45
        }"
        @mouseenter="$event.target.scale({x:1.3, y:1.3})"
        @mouseleave="$event.target.scale({x:1, y:1})"
      />

      <v-line 
        v-if="activePathLastPoint"
        :config="{
          points: [
            activePathLastPoint.x * scale, 
            activePathLastPoint.y * scale, 
            currentMousePos.x * scale, 
            currentMousePos.y * scale
          ],
          stroke: '#ff00ff',
          strokeWidth: 2,
          dash: [5, 5],
          listening: false
        }"
      />
    </v-group>

  </v-group>
</template>
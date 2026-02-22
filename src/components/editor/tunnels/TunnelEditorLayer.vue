<script setup>
import { computed, ref } from 'vue' // [UPDATE] Added ref
import { useMapStore } from '@/stores/mapStore'
import { useTunnelLogic } from './useTunnelLogic'

const props = defineProps({ scale: Number })
const store = useMapStore()

// [UPDATE] Destructure new free draw logic
const { 
  pendingHandle, getBaleHandles, handleHandleClick,
  snapTargets, handleSnapClick, handleFreeClick, handlePathClick,
  freeDrawAnchor, handleFreeEdgeClick
} = useTunnelLogic(store)

const currentMousePos = ref({ x: 0, y: 0 })

const allHandles = computed(() => {
  return store.mapData.bales
    .filter(b => b.layer === store.currentLayer)
    .flatMap(bale => getBaleHandles(bale))
})

// Handlers with Stop Propagation
function onHandleClick(evt, handle) {
  evt.cancelBubble = true 
  handleHandleClick(handle)
}
function onSnapClick(evt, targetId) {
  evt.cancelBubble = true
  handleSnapClick(targetId)
}

// [UPDATE] Unified Stage Click Handler
function handleStageClick(e) {
  const stage = e.target.getStage()
  const ptr = stage.getRelativePointerPosition()
  const GRID_OFFSET = 30 
  const x = (ptr.x - GRID_OFFSET) / props.scale
  const y = (ptr.y - GRID_OFFSET) / props.scale

  // Case 1: Drawing Tunnel Path (Existing)
  if (store.activeTool === 'tunnel_path' && store.tunnelConfig.activePathId) {
    handleFreeClick(x, y)
  }
  
  // Case 2: Free Drawing Edges (New)
  if (store.activeTool === 'tunnel_edges' && store.tunnelConfig.edgeMode === 'free') {
    handleFreeEdgeClick(x, y)
  }
}

// [INSERT] Track mouse for the rubber-band line
function handleMouseMove(e) {
  if (store.activeTool === 'tunnel_edges' && freeDrawAnchor.value) {
    const stage = e.target.getStage()
    const ptr = stage.getRelativePointerPosition()
    const GRID_OFFSET = 30
    currentMousePos.value = {
      x: (ptr.x - GRID_OFFSET) / props.scale,
      y: (ptr.y - GRID_OFFSET) / props.scale
    }
  }
}
</script>

<template>
  <v-group>
    
    <v-rect 
      v-if="store.activeTool === 'tunnel_path' || (store.activeTool === 'tunnel_edges' && store.tunnelConfig.edgeMode === 'free')"
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
          dash: [5, 5]
        }"
      />

      <v-circle
        v-for="handle in allHandles"
        :key="handle.id"
        @click="onHandleClick($event, handle)"
        @tap="onHandleClick($event, handle)"
        :config="{
          x: handle.x * scale,
          y: handle.y * scale,
          radius: (pendingHandle && pendingHandle.id === handle.id) ? 7 : 5,
          fill: (pendingHandle && pendingHandle.id === handle.id) ? '#ff0000' : 'white',
          stroke: (pendingHandle && pendingHandle.id === handle.id) ? 'white' : '#2196f3',
          strokeWidth: 2,
          hitStrokeWidth: 15,
          cursor: 'pointer',
          opacity: store.tunnelConfig.edgeMode === 'free' ? 0.3 : 1 // Dim handles in free mode
        }"
        @mouseenter="$event.target.scale({x:1.5, y:1.5})"
        @mouseleave="$event.target.scale({x:1, y:1})"
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
          fill: '#00bcd4', // Cyan
          stroke: 'white',
          strokeWidth: 2,
          cursor: 'pointer',
          rotation: 45
        }"
        @mouseenter="$event.target.scale({x:1.3, y:1.3})"
        @mouseleave="$event.target.scale({x:1, y:1})"
      />

    </v-group>

  </v-group>
</template>
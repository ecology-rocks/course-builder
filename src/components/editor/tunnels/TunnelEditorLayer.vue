<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useTunnelLogic } from './useTunnelLogic'

const props = defineProps({ scale: Number })
const store = useMapStore()
const { 
  pendingHandle, getBaleHandles, handleHandleClick,
  snapTargets, handleSnapClick, handleFreeClick, handlePathClick
} = useTunnelLogic(store)

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
function handleStageClick(e) {
  if (store.activeTool === 'tunnel_path' && store.tunnelConfig.activePathId) {
    const stage = e.target.getStage()
    const ptr = stage.getRelativePointerPosition()
    const GRID_OFFSET = 30 
    const x = (ptr.x - GRID_OFFSET) / props.scale
    const y = (ptr.y - GRID_OFFSET) / props.scale
    handleFreeClick(x, y)
  }
}
</script>

<template>
  <v-group>
    
    <v-group v-if="store.activeTool === 'tunnel_edges'">
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
          cursor: 'pointer'
        }"
        @mouseenter="$event.target.scale({x:1.5, y:1.5})"
        @mouseleave="$event.target.scale({x:1, y:1})"
      />
    </v-group>

    <v-group v-if="store.activeTool === 'tunnel_path'">
      
      <v-rect 
        v-if="store.tunnelConfig.activePathId"
        :config="{ x: -1000, y: -1000, width: 5000, height: 5000, fill: 'transparent' }"
        @click="handleStageClick"
        @tap="handleStageClick"
      />

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
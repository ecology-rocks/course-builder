<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps({ scale: Number })
const store = useMapStore()
let lastEventTime = 0

// Dynamically grab whichever blind we are actively editing
const activeBlind = computed(() => {
  if (!store.mapData.blinds || store.mapData.blinds.length === 0) return null
  return store.mapData.blinds[store.activeBlindIndex || 0]
})

function handleStageClick(e) {
  const now = Date.now()
  if (now - lastEventTime < 300) return
  lastEventTime = now

  // Stop the click from passing through to the base map (prevents Bales from placing!)
  e.cancelBubble = true
  if (e.evt && e.evt.preventDefault) e.evt.preventDefault()

  if (!activeBlind.value) return

  const stage = e.target.getStage()
  const ptr = stage.getPointerPosition()
  if (!ptr) return

  const layerOffset = e.target.getLayer()?.x() || 20
  const x = (ptr.x - layerOffset) / props.scale
  const y = (ptr.y - layerOffset) / props.scale

  if (store.activeTool === 'select') {
    store.clearSelection()
    return
  }

  if (store.activeTool === 'eraser') {
    const idx = activeBlind.value.hides.findIndex(h => Math.abs(h.x - x) < 0.5 && Math.abs(h.y - y) < 0.5)
    if (idx > -1) {
      const newHides = [...activeBlind.value.hides]
      newHides.splice(idx, 1)
      activeBlind.value.hides = newHides
    }
  } else if (['rat', 'litter', 'empty'].includes(store.activeTool)) {
    let nextNumber = null
    if (store.activeTool === 'rat') {
      const max = activeBlind.value.hides
        .filter(h => h.type === 'rat' && typeof h.number === 'number')
        .reduce((m, h) => Math.max(m, h.number), 0)
      nextNumber = max + 1
    }
    
    activeBlind.value.hides = [
      ...activeBlind.value.hides,
      {
        id: String(Date.now()),
        x, y,
        type: store.activeTool,
        location: 'floor',
        elevation: 'regular_over',
        layer: store.currentLayer || 1,
        number: nextNumber
      }
    ]
  }
}
</script>

<template>
  <v-rect 
    :config="{ x: -1000, y: -1000, width: 5000, height: 5000, fill: 'rgba(0,0,0,0)' }"
    @click="handleStageClick"
    @tap="handleStageClick"
    @mousedown="handleStageClick"
    @touchstart="handleStageClick"
  />
</template>
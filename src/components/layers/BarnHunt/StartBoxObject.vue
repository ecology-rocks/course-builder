<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

// EXPOSE NODE
defineExpose({ getNode: () => groupRef.value?.getNode() })

function handleClick(e) {
  if (store.activeTool === 'delete') {
    store.removeStartBox()
  }
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch snap
  
  // 1. Calculate Snapped Position
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step

  // 2. Calculate Bounds (Box is 4x4 feet)
  const boxSize = 4 * props.scale
  const maxX = (store.ringDimensions.width * props.scale) - boxSize
  const maxY = (store.ringDimensions.height * props.scale) - boxSize

  // 3. Clamp
  relX = Math.max(0, Math.min(relX, maxX))
  relY = Math.max(0, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}
</script>

<template>
  <v-group
    v-if="store.startBox"
    ref="groupRef"
    :config="{
      id: store.startBox.id || 'startbox', // Ensure ID exists for registry
      draggable: true,
      dragBoundFunc: dragBoundFunc,
      x: store.startBox.x * scale,
      y: store.startBox.y * scale
    }"
    @click="handleClick"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
  >
    <v-rect 
      :config="{ 
        width: 4 * scale, 
        height: 4 * scale, 
        fill: 'rgba(200, 200, 200, 0.5)', 
        stroke: 'black', 
        dash: [10, 5] 
      }" 
    />
    <v-text 
      :config="{ 
        text: 'START', 
        width: 4 * scale, 
        padding: 5, 
        align: 'center', 
        fontSize: 14 
      }" 
    />
  </v-group>
</template>
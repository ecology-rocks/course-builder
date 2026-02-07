<script setup>
import { ref, computed, watch, nextTick } from 'vue' // Import nextTick
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale', 'isSelected', 'opacity'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend', 'select'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// 1. Reactive Configuration
const rectConfig = computed(() => ({
  width: 4 * props.scale,
  height: 4 * props.scale,
  fill: 'rgba(200, 200, 200, 0.5)',
  stroke: props.isSelected ? '#00a1ff' : 'black',
  strokeWidth: props.isSelected ? 2 : 1,
  dash: [10, 5],
  shadowBlur: props.isSelected ? 10 : 0,
  shadowColor: props.isSelected ? '#00a1ff' : 'black'
}))

// 2. Watch & Wait for Render
watch(() => props.isSelected, async () => {
  // Wait for Vue to update the Konva Node properties first
  await nextTick()
  
  // NOW draw the layer
  const node = groupRef.value?.getNode()
  if (node) {
    node.getLayer()?.batchDraw()
  }
})

function handleClick(e) {
  e.cancelBubble = true
  
  if (store.activeTool === 'delete') {
    store.removeStartBox()
  } else {
    // 3. Emit the ID so Parent handles selection logic properly
    if (store.startBox?.id) {
      emit('select', store.startBox.id)
    }
  }
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  const boxSize = 4 * props.scale
  const maxX = (store.ringDimensions.width * props.scale) - boxSize
  const maxY = (store.ringDimensions.height * props.scale) - boxSize
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
      id: store.startBox.id,
      draggable: true,
      dragBoundFunc: dragBoundFunc,
      x: store.startBox.x * scale,
      y: store.startBox.y * scale,
      opacity: opacity || 1,
    }"
    @click="handleClick"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
  >
    <v-rect :config="rectConfig" />
    
    <v-text :config="{ 
      text: 'START', 
      width: 4 * scale, 
      padding: 5, 
      align: 'center', 
      fontSize: 14,
      fill: 'black',
      listening: false
    }" />
  </v-group>
</template>
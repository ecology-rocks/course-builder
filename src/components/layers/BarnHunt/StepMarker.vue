<script setup>
import { ref } from 'vue'

const props = defineProps(['step', 'isSelected', 'scale'])
// Added 'dragstart' and 'dragmove' to emits
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'rotate'])

const groupRef = ref(null)
const width = 30 
const height = 20

// Expose node for multi-select
defineExpose({ getNode: () => groupRef.value?.getNode() })

const handleClick = (e) => {
  if (e.evt.button === 0) emit('select', props.step.id)
}

const handleContextMenu = (e) => {
  e.evt.preventDefault()
  emit('rotate', props.step.id)
}

function dragBoundFunc(pos) {
  // Simple snapping logic
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  let x = Math.round((pos.x - layerAbs.x) / step) * step
  let y = Math.round((pos.y - layerAbs.y) / step) * step
  return { x: x + layerAbs.x, y: y + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: step.id,
      x: step.x * scale, 
      y: step.y * scale, 
      rotation: step.rotation || 0,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="handleClick"
    @tap="handleClick"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
    @contextmenu="handleContextMenu"
  >
    <v-rect :config="{
      width: width,
      height: height,
      fill: '#8D6E63',
      stroke: isSelected ? '#00a1ff' : 'black',
      strokeWidth: isSelected ? 2 : 1,
      offsetX: width / 2,
      offsetY: height / 2,
      shadowColor: '#00a1ff',
      shadowBlur: isSelected ? 5 : 0
    }" />
    
    <v-text :config="{
      text: 'STEP',
      fontSize: 8,
      fill: 'white',
      offsetX: 10,
      offsetY: 4,
      rotation: 0,
      listening: false
    }" />
  </v-group>
</template>
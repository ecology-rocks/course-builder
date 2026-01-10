<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore() // <--- Initialize Store

const props = defineProps(['step', 'isSelected', 'scale'])
// Added 'dragstart' and 'dragmove' to emits
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'rotate'])

const groupRef = ref(null)
const width = 45 
const height = 30

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
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step

  // Steps are 45x30 pixels centered
  const halfW = 45 / 2
  const halfH = 30 / 2
  
  const maxX = (store.ringDimensions.width * props.scale) - halfW
  const maxY = (store.ringDimensions.height * props.scale) - halfH

  relX = Math.max(halfW, Math.min(relX, maxX))
  relY = Math.max(halfH, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
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
      fontSize: 12,
      fill: 'white',
      offsetX: 15,
      offsetY: 5,
      rotation: 0,
      listening: false
    }" />
  </v-group>
</template>
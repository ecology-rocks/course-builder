<script setup>
import { ref } from 'vue'

const props = defineProps(['step', 'isSelected', 'scale', 'ringDimensions', 'GRID_OFFSET'])
const emit = defineEmits(['select', 'update', 'dragend', 'rotate'])

const groupRef = ref(null)
const width = 30 
const height = 20

// 1. Handle Click (LEFT CLICK ONLY)
const handleClick = (e) => {
  // Only select if it's a Left Click (button 0)
  if (e.evt.button === 0) {
    emit('select', props.step.id)
  }
}

// 2. Handle Context Menu (RIGHT CLICK)
const handleContextMenu = (e) => {
  e.evt.preventDefault() // Stop browser menu
  emit('rotate', props.step.id) // Rotate immediately
}

const handleDragEnd = (e) => {
  emit('dragend', {
    id: props.step.id,
    x: e.target.x() / props.scale,
    y: e.target.y() / props.scale
  })
}

const handleTransformEnd = (e) => {
  emit('update', {
    id: props.step.id,
    rotation: e.target.rotation()
  })
}

const dragBoundFunc = (pos) => {
  const minX = props.GRID_OFFSET
  const minY = props.GRID_OFFSET
  const maxX = props.GRID_OFFSET + (props.ringDimensions.width * props.scale)
  const maxY = props.GRID_OFFSET + (props.ringDimensions.height * props.scale)

  return {
    x: Math.max(minX, Math.min(pos.x, maxX)),
    y: Math.max(minY, Math.min(maxY, pos.y))
  }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      x: step.x * scale, 
      y: step.y * scale, 
      rotation: step.rotation,
      draggable: true,
      id: step.id,
      dragBoundFunc: dragBoundFunc
    }"
    @click="handleClick"
    @tap="handleClick"
    @dragend="handleDragEnd"
    @contextmenu="handleContextMenu"
  >
    <v-rect :config="{
      width: width,
      height: height,
      fill: '#8D6E63',
      stroke: 'black',
      strokeWidth: 1,
      offsetX: width / 2,
      offsetY: height / 2,
      shadowBlur: isSelected ? 5 : 0
    }" />
    
    <v-text :config="{
      text: 'STEP',
      fontSize: 8,
      fill: 'white',
      offsetX: 10,
      offsetY: 4,
      rotation: 0
    }" />
  </v-group>
  
  <v-transformer
    v-if="isSelected"
    :config="{
      nodes: groupRef ? [groupRef.getNode()] : [],
      centeredScaling: true,
      rotateEnabled: true,
      resizeEnabled: false,
      rotationSnaps: [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180],
    }"
    @transformend="handleTransformEnd"
  />
</template>
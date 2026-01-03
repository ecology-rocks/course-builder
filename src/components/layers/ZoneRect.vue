<script setup>
import { ref } from 'vue'

const props = defineProps(['zone', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragend'])

const shapeRef = ref(null)

const handleTransformEnd = () => {
  const node = shapeRef.value.getNode()
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  // Reset scale to 1 to avoid compounding
  node.scaleX(1)
  node.scaleY(1)

  // CONVERT PIXELS -> GRID UNITS
  emit('update', {
    id: props.zone.id,
    x: node.x() / props.scale,
    y: node.y() / props.scale,
    rotation: node.rotation(),
    width: (node.width() * scaleX) / props.scale,
    height: (node.height() * scaleY) / props.scale
  })
}

const handleDragEnd = (e) => {
  // CONVERT PIXELS -> GRID UNITS
  emit('update', { 
    id: props.zone.id, 
    x: e.target.x() / props.scale, 
    y: e.target.y() / props.scale 
  })
}
</script>

<template>
  <v-rect
    ref="shapeRef"
    :config="{
      x: zone.x * scale,          // GRID -> PIXELS
      y: zone.y * scale,          // GRID -> PIXELS
      width: zone.width * scale,  // GRID -> PIXELS
      height: zone.height * scale,// GRID -> PIXELS
      rotation: zone.rotation,
      fill: zone.type === 'dead' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(100, 100, 100, 0.5)',
      stroke: zone.type === 'dead' ? 'red' : 'black',
      strokeWidth: 2,
      dash: [10, 5],
      draggable: true,
      name: 'zone'
    }"
    @click="emit('select', zone.id)"
    @tap="emit('select', zone.id)"
    @dragend="handleDragEnd"
    @transformend="handleTransformEnd"
  />
  
  <v-transformer
    v-if="isSelected"
    :config="{
      nodes: shapeRef ? [shapeRef.getNode()] : [],
      rotateEnabled: true,
      ignoreStroke: true,
      keepRatio: false
    }"
    @transformend="handleTransformEnd"
  />
</template>
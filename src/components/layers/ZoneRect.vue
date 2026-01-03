<script setup>
import { ref, computed } from 'vue'

const props = defineProps(['zone', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragend'])

const groupRef = ref(null)

// 1. Determine Label Text
const labelText = computed(() => {
  return props.zone.type === 'dead' ? 'DEAD ZONE' : 'OBSTRUCTION'
})

// 2. Determine Text Color
const textColor = computed(() => {
  return props.zone.type === 'dead' ? '#b71c1c' : '#424242'
})

const handleTransformEnd = () => {
  const group = groupRef.value.getNode()
  const scaleX = group.scaleX()
  const scaleY = group.scaleY()

  // 3. Reset Group scale to 1 immediately to prevent distortion
  group.scaleX(1)
  group.scaleY(1)

  // 4. Calculate new Dimensions based on the scale that WAS applied
  // New Grid Width = Old Grid Width * Scale Factor
  const newGridWidth = props.zone.width * scaleX
  const newGridHeight = props.zone.height * scaleY

  emit('update', {
    id: props.zone.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
    width: newGridWidth,
    height: newGridHeight
  })
}

const handleDragEnd = (e) => {
  emit('update', { 
    id: props.zone.id, 
    x: e.target.x() / props.scale, 
    y: e.target.y() / props.scale 
  })
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      x: zone.x * scale,
      y: zone.y * scale,
      rotation: zone.rotation,
      draggable: true,
      name: 'zone-group'
    }"
    @click="emit('select', zone.id)"
    @tap="emit('select', zone.id)"
    @dragend="handleDragEnd"
    @transformend="handleTransformEnd"
  >
    <v-rect
      :config="{
        width: zone.width * scale,
        height: zone.height * scale,
        fill: zone.type === 'dead' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(100, 100, 100, 0.5)',
        stroke: zone.type === 'dead' ? 'red' : 'black',
        strokeWidth: 2,
        dash: [10, 5]
      }"
    />

    <v-text
      :config="{
        text: labelText,
        width: zone.width * scale,
        height: zone.height * scale,
        fontSize: 14,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: textColor,
        align: 'center',
        verticalAlign: 'middle',
        listening: false // Allows clicks to pass through to the group for selection
      }"
    />
  </v-group>
  
  <v-transformer
    v-if="isSelected"
    :config="{
      nodes: groupRef ? [groupRef.getNode()] : [],
      rotateEnabled: true,
      ignoreStroke: true,
      keepRatio: false
    }"
    @transformend="handleTransformEnd"
  />
</template>
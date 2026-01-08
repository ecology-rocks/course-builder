<script setup>
import { ref, computed } from 'vue'

const props = defineProps(['zone', 'isSelected', 'scale'])
// Added 'dragstart' and 'dragmove'
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend'])

const groupRef = ref(null)
defineExpose({ getNode: () => groupRef.value?.getNode() })

const labelText = computed(() => props.zone.type === 'dead' ? 'DEAD ZONE' : 'OBSTRUCTION')
const textColor = computed(() => props.zone.type === 'dead' ? '#b71c1c' : '#424242')

const handleTransformEnd = () => {
  const group = groupRef.value.getNode()
  const scaleX = group.scaleX(); const scaleY = group.scaleY()
  group.scaleX(1); group.scaleY(1)
  
  emit('update', {
    id: props.zone.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
    width: props.zone.width * scaleX,
    height: props.zone.height * scaleY
  })
}

const handleDragEnd = (e) => {
  emit('update', { id: props.zone.id, x: e.target.x() / props.scale, y: e.target.y() / props.scale })
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: zone.id,
      x: zone.x * scale,
      y: zone.y * scale,
      rotation: zone.rotation,
      draggable: true
    }"
    @click="emit('select', zone.id)"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleDragEnd"
    @transformend="handleTransformEnd"
  >
    <v-rect
      :config="{
        width: zone.width * scale,
        height: zone.height * scale,
        fill: zone.type === 'dead' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(100, 100, 100, 0.5)',
        stroke: isSelected ? '#00a1ff' : (zone.type === 'dead' ? 'red' : 'black'),
        strokeWidth: isSelected ? 3 : 2,
        dash: [10, 5]
      }"
    />

    <v-text
      :config="{
        text: labelText,
        width: zone.width * scale,
        height: zone.height * scale,
        fontSize: 14,
        fontStyle: 'bold',
        fill: textColor,
        align: 'center',
        verticalAlign: 'middle',
        listening: false
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
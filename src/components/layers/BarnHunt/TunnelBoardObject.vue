<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['board', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// Counter-scaling logic to prevent distortion during resize
function handleTransform() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.board-shape')
  const scaleX = group.scaleX()
  const scaleY = group.scaleY()

  group.scaleX(1)
  group.scaleY(1)

  const newWidth = Math.max(10, rect.width() * scaleX)
  const newHeight = Math.max(10, rect.height() * scaleY)

  rect.width(newWidth)
  rect.height(newHeight)
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.board-shape')
  
  emit('update', {
    id: props.board.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
    width: rect.width() / props.scale,
    height: rect.height() / props.scale
  })
}

function handleDragEnd(e) {
  emit('update', { id: props.board.id, x: e.target.x() / props.scale, y: e.target.y() / props.scale })
}

function dragBoundFunc(pos) {
  const layerAbs = this.getLayer().getAbsolutePosition()
  const maxX = (store.ringDimensions.width * props.scale) - (props.board.width * props.scale)
  const maxY = (store.ringDimensions.height * props.scale) - (props.board.height * props.scale)
  
  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y
  
  relX = Math.max(0, Math.min(relX, maxX))
  relY = Math.max(0, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: board.id,
      x: board.x * scale,
      y: board.y * scale,
      rotation: board.rotation,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="emit('select', board.id)"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleDragEnd"
    @transform="handleTransform"
    @transformend="handleTransformEnd"
  >
    <v-rect
      :config="{
        name: 'board-shape',
        width: board.width * scale,
        height: board.height * scale,
        cornerRadius: 10,
        fill: 'rgba(139, 69, 19, 0.4)', // Semi-transparent brown
        stroke: isSelected ? '#00a1ff' : '#5D4037',
        strokeWidth: isSelected ? 2 : 2,
      }"
    />

    <v-text
      :config="{
        text: 'BOARD',
        width: board.width * scale,
        height: board.height * scale,
        fontSize: 12,
        fill: '#3e2723',
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
    @transform="handleTransform"
    @transformend="handleTransformEnd"
  />
</template>
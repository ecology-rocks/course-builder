<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['board', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// [FIXED] Match NoteObject Logic
// 1. Do NOT touch the rect (stroke/corners) during drag. This causes shrinking.
// 2. DO update text width/height so centering works.
function handleTransform() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.board-shape')
  const text = group.findOne('.board-text')

  const sx = group.scaleX()
  const sy = group.scaleY()

  if (Math.abs(sx) < 0.001 || Math.abs(sy) < 0.001) return

  if (text) {
    // Counter-scale text to keep font size constant
    text.scaleX(1 / sx)
    text.scaleY(1 / sy)

    // Update dimensions to match the scaled group 
    // (This ensures align='center' still works on the larger box)
    text.width(rect.width() * sx)
    text.height(rect.height() * sy)
  }
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.board-shape')
  const text = group.findOne('.board-text')
  
  // 1. Calculate final dimensions
  const finalW = rect.width() * group.scaleX()
  const finalH = rect.height() * group.scaleY()

  // 2. RESET Group Scale to 1
  group.scaleX(1)
  group.scaleY(1)
  
  // 3. Reset Children
  if (text) { 
    text.scaleX(1)
    text.scaleY(1)
    text.width(finalW)
    text.height(finalH)
  }
  
  // Reset visual properties (Snaps them back to perfect 2px / 10px)
  rect.strokeWidth(2)
  rect.cornerRadius(10)

  // 4. Commit new Width/Height
  rect.width(finalW)
  rect.height(finalH)
  
  emit('update', {
    id: props.board.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
    width: finalW / props.scale,
    height: finalH / props.scale
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
        fill: 'rgba(139, 69, 19, 0.4)',
        stroke: isSelected ? '#00a1ff' : '#5D4037',
        strokeWidth: isSelected ? 2 : 2,
      }"
    />

    <v-text
      :config="{
        name: 'board-text',
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
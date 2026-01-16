<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['note', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

function handleDblClick(e) {
  e.cancelBubble = true
  store.openNoteEditor(props.note.id)
}

// [FIX] Counter-Scaling Pattern
function handleTransform() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.note-bg')
  const text = group.findOne('.note-text')
  
  const sx = group.scaleX()
  const sy = group.scaleY()

  // 1. Counter-scale Text so font size looks invariant
  text.scaleX(1 / sx)
  text.scaleY(1 / sy)

  // 2. Adjust Text Width so it wraps correctly in the new visual space
  //    (Rect Width * Group Scale = Visual Width)
  text.width(rect.width() * sx)
  text.height(rect.height() * sy)
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.note-bg')
  const text = group.findOne('.note-text')
  
  // 1. Calculate final dimensions
  const finalW = rect.width() * group.scaleX()
  const finalH = rect.height() * group.scaleY()

  // 2. Reset Scales
  group.scaleX(1); group.scaleY(1)
  text.scaleX(1); text.scaleY(1)

  // 3. Commit Geometry
  rect.width(finalW)
  rect.height(finalH)
  text.width(finalW)
  text.height(finalH)

  emit('update', {
    id: props.note.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
    width: finalW / props.scale,
    height: finalH / props.scale
  })
}

function handleDragEnd(e) {
  emit('update', { id: props.note.id, x: e.target.x() / props.scale, y: e.target.y() / props.scale })
}

function dragBoundFunc(pos) {
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch snap

  const maxX = (store.ringDimensions.width * props.scale) - (props.note.width * props.scale)
  const maxY = (store.ringDimensions.height * props.scale) - (props.note.height * props.scale)
  
  // 1. Snap
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  
  // 2. Clamp
  relX = Math.max(0, Math.min(relX, maxX))
  relY = Math.max(0, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: note.id,
      x: note.x * scale,
      y: note.y * scale,
      rotation: note.rotation,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="emit('select', note.id)"
    @dblclick="handleDblClick"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleDragEnd"
    @transform="handleTransform"
    @transformend="handleTransformEnd"
  >
    <v-rect
      :config="{
        name: 'note-bg', 
        width: note.width * scale,
        height: note.height * scale,
        fill: 'transparent', 
        stroke: isSelected ? '#00a1ff' : '#333',
        strokeWidth: isSelected ? 2 : 1,
      }"
    />

    <v-text
      :config="{
        name: 'note-text',
        text: note.text,
        width: note.width * scale,
        height: note.height * scale,
        fontSize: note.fontSize || 14,
        padding: 5,
        fill: '#000',
        align: 'left',
        verticalAlign: 'top',
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
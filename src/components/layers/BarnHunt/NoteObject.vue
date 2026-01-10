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

// [FIX] Live Resizing Logic
function handleTransform() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.note-bg')
  const text = group.findOne('.note-text')

  const scaleX = group.scaleX()
  const scaleY = group.scaleY()

  // 1. Reset Scale to 1 (Prevents distortion)
  group.scaleX(1)
  group.scaleY(1)

  // 2. Calculate new dimensions based on the scale that WAS applied
  const newWidth = Math.max(20, rect.width() * scaleX)
  const newHeight = Math.max(20, rect.height() * scaleY)

  // 3. Apply new dimensions directly to children
  rect.width(newWidth)
  rect.height(newHeight)
  
  text.width(newWidth)
  text.height(newHeight)
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.note-bg')

  // Read the FINAL width/height from the rect (since scale is always 1 now)
  emit('update', {
    id: props.note.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
    width: rect.width() / props.scale,   // Convert back to grid units
    height: rect.height() / props.scale
  })
}

function handleDragEnd(e) {
  emit('update', { id: props.note.id, x: e.target.x() / props.scale, y: e.target.y() / props.scale })
}

function dragBoundFunc(pos) {
  const layerAbs = this.getLayer().getAbsolutePosition()
  const maxX = (store.ringDimensions.width * props.scale) - (props.note.width * props.scale)
  const maxY = (store.ringDimensions.height * props.scale) - (props.note.height * props.scale)
  
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
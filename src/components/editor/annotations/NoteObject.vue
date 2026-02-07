<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['note', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'contextmenu'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// ## COMPUTED STYLES
const textValue = computed(() => props.note.custom?.textValue || props.note.text || 'New Note, Right Click To Edit')
const fillColor = computed(() => props.note.custom?.fillColor || 'transparent')
const strokeColor = computed(() => props.note.custom?.strokeColor || '#333')
const textColor = computed(() => props.note.custom?.textColor || '#000')
const fontSize = computed(() => props.note.custom?.fontSize || 14)
const dashArray = computed(() => props.note.custom?.borderStyle === 'dashed' ? [10, 5] : null)

function onRightClick(e) {
  e.evt.preventDefault()
  e.cancelBubble = true
  store.openNoteMenu(props.note.id, e.evt.clientX, e.evt.clientY)
}

function handleTransform() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.note-bg')
  const text = group.findOne('.note-text')
  
  const sx = group.scaleX()
  const sy = group.scaleY()

  // Counter-scale Text
  text.scaleX(1 / sx)
  text.scaleY(1 / sy)

  text.width(rect.width() * sx)
  text.height(rect.height() * sy)
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.note-bg')
  const text = group.findOne('.note-text')
  
  const finalW = rect.width() * group.scaleX()
  const finalH = rect.height() * group.scaleY()

  group.scaleX(1); group.scaleY(1)
  text.scaleX(1); text.scaleY(1)

  rect.width(finalW); rect.height(finalH)
  text.width(finalW); text.height(finalH)

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
  emit('dragend', e)
}

function dragBoundFunc(pos) {
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6 

  const maxX = (store.ringDimensions.width * props.scale) - (props.note.width * props.scale)
  const maxY = (store.ringDimensions.height * props.scale) - (props.note.height * props.scale)
  
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  
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
    @contextmenu="onRightClick"
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
        fill: fillColor, 
        stroke: isSelected ? '#00a1ff' : strokeColor,
        strokeWidth: isSelected ? 2 : 1,
        dash: dashArray,
        shadowColor: 'black',
        shadowBlur: isSelected ? 10 : 0,
        shadowOpacity: 0.3
      }"
    />

    <v-text
      :config="{
        name: 'note-text',
        text: textValue,
        width: note.width * scale,
        height: note.height * scale,
        fontSize: fontSize,
        padding: 5,
        fill: textColor,
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
<script setup>
import { ref, computed} from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['board', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'contextmenu'])

const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })


// --- CUSTOM STYLES ---

const finalWidth = computed(() => {
  return props.board.custom?.width != null ? props.board.custom.width : props.board.width
})

const finalHeight = computed(() => {
  return props.board.custom?.height != null ? props.board.custom.height : props.board.height
})

const finalFill = computed(() => {
  return props.board.custom?.fillColor || '#8B4513' // Original Brown
})

const finalStroke = computed(() => {
  if (props.isSelected) return '#00a1ff'
  return props.board.custom?.strokeColor || '#5D4037'
})

const finalTextColor = computed(() => {
  return props.board.custom?.textColor || '#3e2723' // Original Dark Brown Text
})

// --- HANDLERS ---

function handleContextMenu(e) {
  e.evt.preventDefault()
  e.cancelBubble = true
  emit('contextmenu', { e: e.evt, id: props.board.id })
}

function handleClick(e) {
  e.cancelBubble = true
  emit('select', props.board.id)
}

function handleDragEnd(e) {
  emit('dragend', e)
}

// [RESTORED] Your original dragBoundFunc
// src/components/editor/boards/TunnelBoxObject.vue

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 
  
  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y
  
  // Snap Position to Grid
  relX = Math.round(relX / step) * step
  relY = Math.round(relY / step) * step

  // [FIX] Calculate Max Bounds based on Object Size
  // Since TunnelBoxes use Top-Left anchors (x,y is top-left),
  // we must ensure x + width <= mapWidth.
  
  // Get current dimensions (accounting for scale)
  const currentW = finalWidth.value * props.scale
  const currentH = finalHeight.value * props.scale

  const mapW = store.ringDimensions.width * props.scale
  const mapH = store.ringDimensions.height * props.scale
  
  const minX = 0
  const maxX = mapW - currentW // Subtract width
  const minY = 0
  const maxY = mapH - currentH // Subtract height

  // Apply Constraints
  relX = Math.max(minX, Math.min(relX, maxX))
  relY = Math.max(minY, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}

// [RESTORED] Handle Transform Logic
function handleTransform() {
  // We keep this to satisfy the @transform event, 
  // but we do the heavy lifting in transformEnd to avoid visual glitches
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  
  const scaleX = group.scaleX()
  const scaleY = group.scaleY()
  
  // 1. Calculate new dimensions
  const newW = finalWidth.value * scaleX
  const newH = finalHeight.value * scaleY

  // 2. Reset Scale to 1 (Standard Konva Pattern)
  group.scaleX(1)
  group.scaleY(1)
  group.rotation(group.rotation())

  // 3. Update Store
  const updates = {
    id: props.board.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation()
  }

  // Update Custom Width/Height if they exist, otherwise standard
  if (props.board.custom?.width != null) {
    updates.custom = { ...props.board.custom, width: newW }
  } else {
    updates.width = newW
  }

  if (props.board.custom?.height != null) {
    const baseCustom = updates.custom || props.board.custom
    updates.custom = { ...baseCustom, height: newH }
  } else {
    updates.height = newH
  }

  emit('update', updates)
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: board.id,
      x: board.x * scale,
      y: board.y * scale,
      rotation: board.rotation || 0,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleDragEnd"
    @transform="handleTransform"
    @transformend="handleTransformEnd"
  >
    <v-rect
      :config="{
        name: 'board-shape',
        width: finalWidth * scale,
        height: finalHeight * scale,
        cornerRadius: 10,
        fill: finalFill,
        opacity: 0.5,
        stroke: finalStroke,
        strokeWidth: isSelected ? 4 : 2,
      }"
    />

    <v-text
      :config="{
        name: 'board-text',
        text: 'BOARD',
        width: finalWidth * scale,
        height: finalHeight * scale,
        fontSize: 12,
        fill: finalTextColor,
        fontStyle: 'bold',
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
      keepRatio: false,
    }"
    @transformend="handleTransformEnd"
  />
</template>
<script setup>
import { ref, computed} from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['board', 'isSelected', 'scale', 'opacity'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'contextmenu', 'click'])

const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })


// --- CUSTOM STYLES ---

const finalWidth = computed(() => {
  const val = props.board.custom?.width != null ? props.board.custom.width : props.board.width
  return Number(val) || 2 // Default to 2ft if invalid
})

const finalHeight = computed(() => {
  const val = props.board.custom?.height != null ? props.board.custom.height : props.board.height
  return Number(val) || 2 // Default to 2ft if invalid
})

const finalFill = computed(() => {
  return props.board.custom?.fillColor || '#8B4513' 
})

const finalStroke = computed(() => {
  if (props.isSelected) return '#00a1ff'
  return props.board.custom?.strokeColor || '#5D4037'
})

const finalTextColor = computed(() => {
  return props.board.custom?.textColor || '#ffffff' 
})

const finalOpacity = computed(() => {
  // 1. If multi-layer view is OFF, everything is standard opacity (0.5)
  if (!store.multiLayerView) return 1

  // 2. If this board is on the current layer, standard opacity
  // (We default to layer 1 if undefined to support legacy boards)
  const boardLayer = props.board.layer || 1
  if (boardLayer === store.currentLayer) return 1

  // 3. Otherwise, use the "ghost" opacity from the store
  return store.layerOpacity
})

// --- HANDLERS ---

function handleContextMenu(e) {
  e.evt.preventDefault()
  e.cancelBubble = true
  emit('contextmenu', { e: e.evt, id: props.board.id })
}

function handleClick(e) {
  e.cancelBubble = true
  // [FIX] Emit the raw click event so parent can use it for measuring
  emit('click', e)
  
  // Selection logic
  if (store.activeTool !== 'measure' && store.activeTool !== 'measurePath') {
     emit('select', props.board.id)
  }
}

function handleDragEnd(e) {
  emit('dragend', e)
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 
  
  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y
  
  relX = Math.round(relX / step) * step
  relY = Math.round(relY / step) * step

  const currentW = finalWidth.value * props.scale
  const currentH = finalHeight.value * props.scale

  const mapW = store.ringDimensions.width * props.scale
  const mapH = store.ringDimensions.height * props.scale
  
  const minX = 0
  const maxX = mapW - currentW 
  const minY = 0
  const maxY = mapH - currentH 

  relX = Math.max(minX, Math.min(relX, maxX))
  relY = Math.max(minY, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}

function handleTransform() {
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  
  const scaleX = group.scaleX()
  const scaleY = group.scaleY()
  
  const newW = finalWidth.value * scaleX
  const newH = finalHeight.value * scaleY

  group.scaleX(1)
  group.scaleY(1)
  group.rotation(group.rotation())

  const updates = {
    id: props.board.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation()
  }

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
        opacity: finalOpacity,
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
        listening: false,
        opacity: finalOpacity
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
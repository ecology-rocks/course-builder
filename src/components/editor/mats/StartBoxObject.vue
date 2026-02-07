<script setup>
import { ref, computed, watch, nextTick } from 'vue' // Import nextTick
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale', 'isSelected', 'opacity'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend', 'select', 'contextmenu'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// 2. Watch & Wait for Render
watch(() => props.isSelected, async () => {
  // Wait for Vue to update the Konva Node properties first
  await nextTick()
  
  // NOW draw the layer
  const node = groupRef.value?.getNode()
  if (node) {
    node.getLayer()?.batchDraw()
  }
})


const boxFill = computed(() => {
  return store.startBox.custom?.fillColor || 'rgba(200, 200, 200, 0.5)'
})

const boxStroke = computed(() => {
  if (props.isSelected) return '#00a1ff'
  return store.startBox.custom?.strokeColor || 'black'
})

const boxDash = computed(() => {
  const style = store.startBox.custom?.borderStyle
  // Default is dashed [10, 5], but user can set solid
  if (style === 'solid') return null
  return [10, 5]
})

const textFill = computed(() => {
  return store.startBox.custom?.textColor || 'black'
})

// [NEW] Handle Context Menu
function handleContextMenu(e) {
  e.evt.preventDefault()
  emit('contextmenu', { e: e.evt, id: store.startBox.id })
}

function handleClick(e) {
  e.cancelBubble = true
  
  if (store.activeTool === 'delete') {
    store.removeStartBox()
  } else {
    // 3. Emit the ID so Parent handles selection logic properly
    if (store.startBox?.id) {
      emit('select', store.startBox.id)
    }
  }
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  const boxSize = 4 * props.scale
  const maxX = (store.ringDimensions.width * props.scale) - boxSize
  const maxY = (store.ringDimensions.height * props.scale) - boxSize
  relX = Math.max(0, Math.min(relX, maxX))
  relY = Math.max(0, Math.min(relY, maxY))
  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}
</script>

<template>
  <v-group
    v-if="store.startBox"
    ref="groupRef"
    :config="{
      id: store.startBox.id,
      draggable: true,
      dragBoundFunc: dragBoundFunc,
      x: store.startBox.x * scale,
      y: store.startBox.y * scale,
      opacity: opacity || 1,
      rotation: store.startBox.rotation || 0,
      offsetX: (4 * scale) / 2,
      offsetY: (4 * scale) / 2
    }"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
  >
    <v-rect :config="{
      width: 4 * scale,
      height: 4 * scale,
      fill: boxFill,
      stroke: boxStroke,
      strokeWidth: isSelected ? 4 : 2,
      dash: boxDash,
      shadowBlur: isSelected ? 10 : 0,
      shadowColor: isSelected ? '#00a1ff' : 'black'
    }" />
    
    <v-text :config="{ 
      text: 'START', 
      width: 4 * scale, 
      padding: 5, 
      align: 'center', 
      verticalAlign: 'middle', // Ensure centered text
      fontSize: 14,
      fill: textFill,
      listening: false
    }" />
  </v-group>
</template>
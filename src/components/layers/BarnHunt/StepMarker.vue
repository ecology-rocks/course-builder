<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()
const props = defineProps(['step', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'rotate'])

const groupRef = ref(null)

// [FIX] Use Grid Units (Feet) instead of fixed pixels
// This ensures the object scales up on print, matching the map view.
const UNIT_W = 2   // 2 feet wide
const UNIT_H = 1.5 // 1.5 feet deep

defineExpose({ getNode: () => groupRef.value?.getNode() })

const handleClick = (e) => {
  if (e.evt.button === 0) emit('select', props.step.id)
}

const handleContextMenu = (e) => {
  e.evt.preventDefault()
  emit('rotate', props.step.id)
}

// [FIX] Smart Edge Snapping (matches Bales/Mats)
function dragBoundFunc(pos) {
  const node = this
  
  // 1. Visual Dimensions
  const visualW = UNIT_W * props.scale
  const visualH = UNIT_H * props.scale

  // 2. Rotated Bounding Box
  const rad = (props.step.rotation || 0) * Math.PI / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))

  const bboxW = (visualW * absCos) + (visualH * absSin)
  const bboxH = (visualW * absSin) + (visualH * absCos)

  // 3. Constraints
  const minX = bboxW / 2
  const maxX = (store.ringDimensions.width * props.scale) - (bboxW / 2)
  const minY = bboxH / 2
  const maxY = (store.ringDimensions.height * props.scale) - (bboxH / 2)

  // 4. Snap Top-Left Edge
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch grid

  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y

  const halfW = bboxW / 2
  const halfH = bboxH / 2
  
  const leftEdge = relX - halfW
  const topEdge = relY - halfH

  const snappedLeft = Math.round(leftEdge / step) * step
  const snappedTop = Math.round(topEdge / step) * step

  let newCenterX = snappedLeft + halfW
  let newCenterY = snappedTop + halfH

  // 5. Apply Constraints
  newCenterX = Math.max(minX, Math.min(newCenterX, maxX))
  newCenterY = Math.max(minY, Math.min(newCenterY, maxY))

  return { x: newCenterX + layerAbs.x, y: newCenterY + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: step.id,
      x: step.x * scale, 
      y: step.y * scale, 
      rotation: step.rotation || 0,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="handleClick"
    @tap="handleClick"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
    @contextmenu="handleContextMenu"
  >
    <v-rect :config="{
      width: UNIT_W * scale,
      height: UNIT_H * scale,
      fill: '#8D6E63',
      stroke: isSelected ? '#00a1ff' : 'black',
      strokeWidth: isSelected ? 3 : 2,
      offsetX: (UNIT_W * scale) / 2,
      offsetY: (UNIT_H * scale) / 2,
      shadowColor: '#00a1ff',
      shadowBlur: isSelected ? 5 : 0,
      cornerRadius: 5
    }" />
    
    <v-text :config="{
      text: 'STEP',
      fontSize: scale * 0.45, 
      fontStyle: 'bold',
      fill: 'white',
      width: UNIT_W * scale,
      height: UNIT_H * scale,
      offsetX: (UNIT_W * scale) / 2,
      offsetY: (UNIT_H * scale) / 2,
      align: 'center',
      verticalAlign: 'middle',
      rotation: 0,
      listening: false
    }" />
  </v-group>
</template>
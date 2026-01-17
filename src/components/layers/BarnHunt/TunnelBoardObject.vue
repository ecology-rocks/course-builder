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

// --- 2. Handle Drag Constraints (Grid Snap + Ring Bounds) ---
// [FIXED] Handle Drag Constraints for Box Objects
function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch grid
  
  // 1. Calculate Grid-Relative Position
  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y
  
  // Snap to grid
  relX = Math.round(relX / step) * step
  relY = Math.round(relY / step) * step

  // 2. Calculate Bounds
  const mapW = store.ringDimensions.width * props.scale
  const mapH = store.ringDimensions.height * props.scale
  
  // Get object dimensions
  const w = props.board.width * props.scale
  const h = props.board.height * props.scale

  // Handle Rotation to find visual bounding box relative to pivot (Top-Left)
  // (We need to ensure no corner of the rotated box leaves the ring)
  const rad = (props.board.rotation || 0) * (Math.PI / 180)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  
  // Calculate the 4 corners relative to the pivot (0,0)
  // P1 is 0,0. P2 is Top-Right. P3 is Bottom-Right. P4 is Bottom-Left.
  const cornersX = [
    0, 
    w * cos, 
    w * cos - h * sin, 
    -h * sin
  ]
  const cornersY = [
    0, 
    w * sin, 
    w * sin + h * cos, 
    h * cos
  ]
  
  const minRx = Math.min(...cornersX)
  const maxRx = Math.max(...cornersX)
  const minRy = Math.min(...cornersY)
  const maxRy = Math.max(...cornersY)

  // 3. Clamp Pivot Position
  // The pivot (relX) must be positioned such that:
  // relX + minRx >= 0      => relX >= -minRx
  // relX + maxRx <= mapW   => relX <= mapW - maxRx
  
  const minX = -minRx
  const maxX = mapW - maxRx
  const minY = -minRy
  const maxY = mapH - maxRy

  relX = Math.max(minX, Math.min(relX, maxX))
  relY = Math.max(minY, Math.min(relY, maxY))

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
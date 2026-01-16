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
function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch grid
  
  // 1. Calculate Grid-Relative Position
  // Note: For the Group, this is the delta (since it starts at 0,0)
  // For the Circle (Endpoint), this is the actual coordinate
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step

  const W = store.ringDimensions.width * props.scale
  const H = store.ringDimensions.height * props.scale

  // 2. Logic based on Node Type (Endpoint vs Whole Board)
  if (node.getClassName() === 'Circle') {
    // --- ENDPOINT CLAMPING ---
    // Simple: The point itself must be within bounds (0,0) to (W,H)
    relX = Math.max(0, Math.min(relX, W))
    relY = Math.max(0, Math.min(relY, H))
  
  } else {
    // --- GROUP (WHOLE BOARD) CLAMPING ---
    // The Group starts at (0,0). 'relX/Y' represents the translation distance.
    // We must ensure that moving the board by this distance keeps ALL points inside.
    
    // Find bounds of the board shape itself
    const bx1 = props.board.x1 * props.scale
    const bx2 = props.board.x2 * props.scale
    const by1 = props.board.y1 * props.scale
    const by2 = props.board.y2 * props.scale
    
    const minBoardX = Math.min(bx1, bx2)
    const maxBoardX = Math.max(bx1, bx2)
    const minBoardY = Math.min(by1, by2)
    const maxBoardY = Math.max(by1, by2)

    // Calculate allowed translation range
    // e.g. Leftmost point (minBoardX) cannot go below 0 -> minDx = -minBoardX
    // e.g. Rightmost point (maxBoardX) cannot go above W -> maxDx = W - maxBoardX
    const minDx = -minBoardX
    const maxDx = W - maxBoardX
    const minDy = -minBoardY
    const maxDy = H - maxBoardY

    // Clamp the translation delta
    relX = Math.max(minDx, Math.min(relX, maxDx))
    relY = Math.max(minDy, Math.min(relY, maxDy))
  }

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
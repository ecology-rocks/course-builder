<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['gate', 'scale', 'ringDimensions'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({
  getNode: () => groupRef.value?.getNode()
})

const isSelected = computed(() => store.selection.includes(props.gate.id))
const strokeColor = computed(() => isSelected.value ? '#2196f3' : 'black')
const strokeWidth = computed(() => isSelected.value ? 3 : 2)

// --- HANDLERS ---

// [FIX 1] Stop Mousedown propagation immediately so the Stage doesn't try to "Place" a new gate
function handleMouseDown(e) {
  e.cancelBubble = true
}

function handleDragStart(e) { 
  emit('dragstart', e) 
}

// [FIX 2] Handle Rotation here, not in dragBoundFunc
function handleDragMove(e) {
  emit('dragmove', e)
  
  const node = e.target
  const rawX = node.x() / props.scale
  const rawY = node.y() / props.scale

  // A. Check Custom Walls for Rotation (Priority 1)
  if (store.customWalls && store.customWalls.length > 0 && store.getNearestWallPoint) {
    const { dist, angle } = store.getNearestWallPoint(rawX, rawY)
    
    // If snapped to custom wall (approx 2ft threshold matching dragBoundFunc)
    if (dist < 2) {
      node.rotation(angle)
      return
    }
  }

  // B. Fallback to Standard Grid Rotation (Priority 2)
  if (!props.ringDimensions) return
  
  const W = props.ringDimensions.width
  const H = props.ringDimensions.height

  // Calculate which wall we are closest to (using snapped coordinates)
  const distTop = Math.abs(rawY)
  const distBottom = Math.abs(rawY - H)
  const distLeft = Math.abs(rawX)
  const distRight = Math.abs(rawX - W)

  // Find the winner
  const min = Math.min(distTop, distBottom, distLeft, distRight)

  // Determine Target Rotation based on "Winner"
  // Priority MUST match dragBoundFunc: Top -> Bottom -> Left -> Right
  let targetRot = 0
  if (min === distTop || min === distBottom) {
    targetRot = 0 
  } else {
    targetRot = 90
  }

  // Apply rotation if different (removed the < 91 restriction)
  if (Math.abs(node.rotation() - targetRot) > 0.1) {
    node.rotation(targetRot)
  }
}

function handleDragEnd(e) { 
  const node = e.target
  store.setGate({
    ...props.gate,
    x: node.x() / props.scale,
    y: node.y() / props.scale,
    rotation: node.rotation()
  })
  emit('dragend', e) 
}

function handleClick(e) {
  e.cancelBubble = true
  if (store.activeTool === 'delete') {
    store.removeGate()
    return
  }
  const isMulti = e.evt.shiftKey || e.evt.metaKey
  store.selectObject(props.gate.id, isMulti)
}

function handleDblClick(e) {
  e.cancelBubble = true
  store.removeGate()
}

// --- CONSTRAINTS (Position Only) ---
function dragBoundFunc(pos) {
  const node = groupRef.value ? groupRef.value.getNode() : null
  if (!node) return pos

  const layerAbs = node.getLayer().getAbsolutePosition()
  const rawX = (pos.x - layerAbs.x) / props.scale
  const rawY = (pos.y - layerAbs.y) / props.scale
  
  // 1. Custom Wall Snap
  if (store.customWalls && store.customWalls.length > 0 && store.getNearestWallPoint) {
    const { point, dist } = store.getNearestWallPoint(rawX, rawY)
    if (dist < 2) {
      // Return position ONLY. Rotation is handled in dragMove.
      return {
        x: point.x * props.scale + layerAbs.x,
        y: point.y * props.scale + layerAbs.y
      }
    }
  }

  // 2. Standard Grid Snap
  if (!props.ringDimensions) return pos
  const W = props.ringDimensions.width
  const H = props.ringDimensions.height
  const margin = 1.5 
  const snap = (val) => Math.round(val * 6) / 6

  const distTop = Math.abs(rawY)
  const distBottom = Math.abs(rawY - H)
  const distLeft = Math.abs(rawX)
  const distRight = Math.abs(rawX - W)
  const min = Math.min(distTop, distBottom, distLeft, distRight)

  let finalX = rawX
  let finalY = rawY

  if (min === distTop) {
    finalY = 0
    finalX = Math.max(margin, Math.min(snap(finalX), W - margin))
  } else if (min === distBottom) {
    finalY = H
    finalX = Math.max(margin, Math.min(snap(finalX), W - margin))
  } else if (min === distLeft) {
    finalX = 0
    finalY = Math.max(margin, Math.min(snap(finalY), H - margin))
  } else { 
    finalX = W
    finalY = Math.max(margin, Math.min(snap(finalY), H - margin))
  }

  return {
    x: finalX * props.scale + layerAbs.x,
    y: finalY * props.scale + layerAbs.y
  }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      x: gate.x * scale,
      y: gate.y * scale,
      rotation: gate.rotation,
      draggable: true,
      dragBoundFunc: dragBoundFunc,
      name: 'gate'
    }"
    @mousedown="handleMouseDown"
    @click="handleClick"
    @dblclick="handleDblClick"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
  >
    <v-rect :config="{ 
      width: 3 * scale, 
      height: 30, 
      offsetX: (3 * scale) / 2, 
      offsetY: 15, 
      fill: 'transparent'
    }" />

    <v-rect :config="{ 
      width: 3 * scale, 
      height: 6, 
      offsetX: (3 * scale) / 2, 
      offsetY: 3, 
      fill: 'white', 
      stroke: strokeColor, 
      strokeWidth: strokeWidth 
    }" />
    
    <v-text :config="{ 
      text: 'GATE', 
      fontSize: 12, 
      fontStyle: 'bold', 
      offsetX: 15, 
      offsetY: -5,
      listening: false 
    }" />
  </v-group>
</template>
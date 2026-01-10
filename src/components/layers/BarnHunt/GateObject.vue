<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['gate', 'scale', 'ringDimensions'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

// --- EXPOSE KONVA NODE ---
// This is required for the BarnHuntLayer to calculate multi-object drags correctly.
defineExpose({
  getNode: () => groupRef.value?.getNode()
})

// --- SELECTION STATE ---
const isSelected = computed(() => store.selection.includes(props.gate.id))
const strokeColor = computed(() => isSelected.value ? '#2196f3' : 'black')
const strokeWidth = computed(() => isSelected.value ? 3 : 2)

// --- HANDLERS ---
// [FIX] Use explicit functions instead of inline $emit to prevent "handler.call" errors
function handleDragStart(e) { emit('dragstart', e) }
function handleDragMove(e) { emit('dragmove', e) }
function handleDragEnd(e) { emit('dragend', e) }

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
  if (store.activeTool === 'delete') {
    store.removeGate()
  }
}

// --- CONSTRAINTS ---
// Keeps the gate glued to the perimeter walls
function dragBoundFunc(pos) {
  // NOTE: In Konva, 'this' inside dragBoundFunc refers to the Node being dragged.
  // We capture it here to calculate offsets.
  const node = this 
  const layerAbs = node.getLayer().getAbsolutePosition()
  
  if (!props.ringDimensions) return pos

  // 1. Convert absolute pointer position to grid coordinates
  const rawX = (pos.x - layerAbs.x) / props.scale
  const rawY = (pos.y - layerAbs.y) / props.scale

  const W = props.ringDimensions.width
  const H = props.ringDimensions.height

  // 2. Find distance to each wall
  const distTop = Math.abs(rawY)
  const distBottom = Math.abs(rawY - H)
  const distLeft = Math.abs(rawX)
  const distRight = Math.abs(rawX - W)

  // 3. Snap to closest wall
  const min = Math.min(distTop, distBottom, distLeft, distRight)

  let finalX = rawX
  let finalY = rawY

  if (min === distTop) {
    finalY = 0
    finalX = Math.max(0, Math.min(finalX, W)) // Clamp to width
  } else if (min === distBottom) {
    finalY = H
    finalX = Math.max(0, Math.min(finalX, W))
  } else if (min === distLeft) {
    finalX = 0
    finalY = Math.max(0, Math.min(finalY, H)) // Clamp to height
  } else { // Right
    finalX = W
    finalY = Math.max(0, Math.min(finalY, H))
  }

  // 4. Return absolute position
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
    @click="handleClick"
    @dblclick="handleDblClick"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
  >
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
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['mat', 'scale', 'opacity'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend', 'update'])
const store = useMapStore()
const groupRef = ref(null)
const textRef = ref(null) // [NEW] Ref for the text node

defineExpose({ getNode: () => groupRef.value?.getNode() })

// [INSERT] Track Ctrl Key for Rotation Snapping
const isCtrlPressed = ref(false)

const rotationSnaps = computed(() => {
  if (!isCtrlPressed.value) return [] 
  return Array.from({ length: 24 }, (_, i) => i * 15) // [0, 15, 30... 345]
})

const fillColor = computed(() => props.mat.custom?.fillColor || '#d1c4e9')

const strokeColor = computed(() => {
  if (isSelected.value) return '#00a1ff'
  return props.mat.custom?.strokeColor || 'black'
})

const textColor = computed(() => props.mat.custom?.textColor || 'black')

const displayLabel = computed(() => props.mat.custom?.textValue || 'DC')

const dimensions = computed(() => {
  const w = props.mat.custom?.width || props.mat.width || store.dcMatConfig.width
  const h = props.mat.custom?.height || props.mat.height || store.dcMatConfig.height
  return {
    width: w * props.scale,
    height: h * props.scale,
    rawW: w,
    rawH: h
  }
})

function handleKeyDown(e) {
  if (e.key === 'Control' || e.metaKey) isCtrlPressed.value = true
}

function handleKeyUp(e) {
  if (e.key === 'Control' || e.metaKey) isCtrlPressed.value = false
}

// src/components/editor/mats/DCMatObject.vue

function onRightClick(e) {
  e.evt.preventDefault()
  e.cancelBubble = true
  
  // This is what triggers the menu in MapEditor
  store.activeDCMatMenu = { 
    id: props.mat.id, 
    x: e.evt.clientX, 
    y: e.evt.clientY 
  }
}


onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})



const isSelected = computed(() => store.selection.includes(props.mat.id))

function handleClick(e) {
  if (store.activeTool === 'delete') {
    store.removeDCMat(props.mat.id)
    return
  }
  if (['select', 'bale', 'dcmat'].includes(store.activeTool)) {
    const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
    store.selectObject(props.mat.id, isMulti)
  }
}

// --- FIX: Counter-Scale Text during Transform ---
function handleTransform() {
  const group = groupRef.value.getNode()
  const text = textRef.value.getNode()
  
  if (group && text) {
    // Invert the group's scale so the text stays 1:1 visually
    text.scaleX(1 / group.scaleX())
    text.scaleY(1 / group.scaleY())
  }
}

function handleTransformEnd() {
  const node = groupRef.value.getNode()
  
  // 1. Calculate New Dimensions
  const currentW = props.mat.width || store.dcMatConfig.width
  const currentH = props.mat.height || store.dcMatConfig.height
  
  const newW = Math.max(0.5, currentW * node.scaleX())
  const newH = Math.max(0.5, currentH * node.scaleY())

  // 2. Calculate New Top-Left
  const newX = (node.x() / props.scale) - (newW / 2)
  const newY = (node.y() / props.scale) - (newH / 2)

  // 3. Reset Group Scale
  node.scaleX(1)
  node.scaleY(1)
  
  // 4. Reset Text Scale (Since group is back to 1)
  if (textRef.value) {
    textRef.value.getNode().scale({ x: 1, y: 1 })
  }

  // 5. Update Store
  emit('update', {
    id: props.mat.id,
    x: newX,
    y: newY,
    rotation: node.rotation(),
    width: newW,
    height: newH
  })
}

function handleDragEnd(e) {
  emit('dragend', e)
  
  const node = e.target
  const currentW = props.mat.width || store.dcMatConfig.width
  const currentH = props.mat.height || store.dcMatConfig.height

  // Convert Center (node.x) back to Top-Left (store.x)
  const newX = (node.x() / props.scale) - (currentW / 2)
  const newY = (node.y() / props.scale) - (currentH / 2)

  emit('update', {
    id: props.mat.id,
    x: newX,
    y: newY
  })
}

function dcMatDragBoundFunc(pos) {
  const node = this
  
  // 1. Get Visual Dimensions
  const W = props.mat.width || store.dcMatConfig.width
  const H = props.mat.height || store.dcMatConfig.height
  const visualW = W * props.scale
  const visualH = H * props.scale

  // 2. Calculate Rotated Bounding Box
  const rad = (props.mat.rotation * Math.PI) / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))

  const bboxW = (visualW * absCos) + (visualH * absSin)
  const bboxH = (visualW * absSin) + (visualH * absCos)

  // 3. Constraints
  const minX = bboxW / 2
  const maxX = (store.ringDimensions.width * props.scale) - (bboxW / 2)
  const minY = bboxH / 2
  const maxY = (store.ringDimensions.height * props.scale) - (bboxH / 2)

  // 4. Smart Edge Snapping
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch grid

  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y

  // Calculate top-left edge of the bounding box
  const halfW = bboxW / 2
  const halfH = bboxH / 2
  const leftEdge = relX - halfW
  const topEdge = relY - halfH

  // Snap the edge
  const snappedLeft = Math.round(leftEdge / step) * step
  const snappedTop = Math.round(topEdge / step) * step

  // Recalculate center
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
      id: mat.id,
      draggable: true,
      dragBoundFunc: dcMatDragBoundFunc,
      x: (mat.x * scale) + ((dimensions.rawW / 2) * scale),
      y: (mat.y * scale) + ((dimensions.rawH / 2) * scale),
      offsetX: (dimensions.rawW / 2) * scale,
      offsetY: (dimensions.rawH / 2) * scale,
      opacity: opacity || 1,
      rotation: mat.rotation
    }"
    @click="handleClick"
    @contextmenu="onRightClick"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleDragEnd"
    @transform="handleTransform" 
    @transformend="handleTransformEnd"
  >
    <v-rect 
      :config="{ 
        width: dimensions.width, 
        height: dimensions.height, 
        fill: fillColor, 
        stroke: strokeColor,
        strokeWidth: isSelected ? 3 : 1,
        shadowColor: '#00a1ff',
        shadowBlur: isSelected ? 10 : 0
      }" 
    />
    <v-text 
      ref="textRef"
      :config="{ 
        text: displayLabel, 
        fontSize: 12, 
        fill: textColor,
        x: 5, 
        y: 5 
      }" 
    />
  </v-group>

<v-transformer
    v-if="isSelected"
    :config="{
      nodes: groupRef ? [groupRef.getNode()] : [],
      rotateEnabled: true,
      ignoreStroke: true,
      keepRatio: false,
      rotationSnaps: rotationSnaps,   rotationSnapTolerance: 15       }"
    @transformend="handleTransformEnd"
  />
</template>
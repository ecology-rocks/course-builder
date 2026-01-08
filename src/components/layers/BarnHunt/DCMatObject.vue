<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['mat', 'scale'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend', 'update'])
const store = useMapStore()
const groupRef = ref(null)
const textRef = ref(null) // [NEW] Ref for the text node

defineExpose({ getNode: () => groupRef.value?.getNode() })

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

function handleContextMenu(e) {
  e.evt.preventDefault()
  store.rotateDCMat(props.mat.id)
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
  const W = props.mat.width || store.dcMatConfig.width
  const H = props.mat.height || store.dcMatConfig.height
  
  const rad = (props.mat.rotation * Math.PI) / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))

  const visualW = ((W * absCos) + (H * absSin)) * props.scale
  const visualH = ((W * absSin) + (H * absCos)) * props.scale

  const minX = visualW / 2
  const maxX = (store.ringDimensions.width * props.scale) - (visualW / 2)
  const minY = visualH / 2
  const maxY = (store.ringDimensions.height * props.scale) - (visualH / 2)

  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6

  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y

  let snappedRelX = Math.round(relX / step) * step
  let snappedRelY = Math.round(relY / step) * step

  snappedRelX = Math.max(minX, Math.min(snappedRelX, maxX))
  snappedRelY = Math.max(minY, Math.min(snappedRelY, maxY))

  return { x: snappedRelX + layerAbs.x, y: snappedRelY + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: mat.id,
      draggable: true,
      dragBoundFunc: dcMatDragBoundFunc,
      x: (mat.x * scale) + (((mat.width || store.dcMatConfig.width) / 2) * scale),
      y: (mat.y * scale) + (((mat.height || store.dcMatConfig.height) / 2) * scale),
      offsetX: ((mat.width || store.dcMatConfig.width) / 2) * scale,
      offsetY: ((mat.height || store.dcMatConfig.height) / 2) * scale,
      rotation: mat.rotation
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
        width: (mat.width || store.dcMatConfig.width) * scale, 
        height: (mat.height || store.dcMatConfig.height) * scale, 
        fill: '#d1c4e9', 
        stroke: isSelected ? '#00a1ff' : 'black',
        strokeWidth: isSelected ? 3 : 1,
        shadowColor: '#00a1ff',
        shadowBlur: isSelected ? 10 : 0
      }" 
    />
    <v-text 
      ref="textRef"
      :config="{ text: 'DC', fontSize: 12, x: 5, y: 5 }" 
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
    @transformend="handleTransformEnd"
  />
</template>
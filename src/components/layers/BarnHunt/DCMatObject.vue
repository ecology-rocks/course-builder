<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['mat', 'scale'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend'])
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// --- Selection State ---
const isSelected = computed(() => store.selection.includes(props.mat.id))

function handleClick(e) {
  // 1. Delete Tool
  if (store.activeTool === 'delete') {
    store.removeDCMat(props.mat.id)
    return
  }

  // 2. Select Tool (or standard pointer behavior)
  // Allow selection if tool is 'select', 'bale', or 'dcmat'
  if (['select', 'bale', 'dcmat'].includes(store.activeTool)) {
    const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
    store.selectObject(props.mat.id, isMulti)
  }
}

function handleContextMenu(e) {
  e.evt.preventDefault()
  store.rotateDCMat(props.mat.id)
}

function dcMatDragBoundFunc(pos) {
  const node = this
  const W = store.dcMatConfig.width
  const H = store.dcMatConfig.height
  const rad = (props.mat.rotation * Math.PI) / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))

  const visualW = ((W * absCos) + (H * absSin)) * props.scale
  const visualH = ((W * absSin) + (H * absCos)) * props.scale

  const halfW = visualW / 2
  const halfH = visualH / 2

  const minX = halfW
  const maxX = (store.ringDimensions.width * props.scale) - halfW
  const minY = halfH
  const maxY = (store.ringDimensions.height * props.scale) - halfH

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
      x: (mat.x * scale) + ((store.dcMatConfig.width / 2) * scale),
      y: (mat.y * scale) + ((store.dcMatConfig.height / 2) * scale),
      offsetX: (store.dcMatConfig.width / 2) * scale,
      offsetY: (store.dcMatConfig.height / 2) * scale,
      rotation: mat.rotation
    }"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
  >
    <v-rect 
      :config="{ 
        width: store.dcMatConfig.width * scale, 
        height: store.dcMatConfig.height * scale, 
        fill: '#d1c4e9', 
        stroke: isSelected ? '#00a1ff' : 'black',
        strokeWidth: isSelected ? 3 : 1,
        shadowColor: '#00a1ff',
        shadowBlur: isSelected ? 10 : 0
      }" 
    />
    <v-text :config="{ text: 'DC', fontSize: 12, x: 5, y: 5 }" />
  </v-group>
</template>
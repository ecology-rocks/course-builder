<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()
const props = defineProps(['zone', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'contextmenu'])

const groupRef = ref(null)
defineExpose({ getNode: () => groupRef.value?.getNode() })

// [INSERT] Track Ctrl Key for Rotation Snapping
const isCtrlPressed = ref(false)

const rotationSnaps = computed(() => {
  if (!isCtrlPressed.value) return [] 
  return Array.from({ length: 24 }, (_, i) => i * 15) // [0, 15, 30... 345]
})

function handleKeyDown(e) {
  if (e.key === 'Control' || e.metaKey) isCtrlPressed.value = true
}

function handleKeyUp(e) {
  if (e.key === 'Control' || e.metaKey) isCtrlPressed.value = false
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})



const finalWidth = computed(() => {
  // [FIX] Force Number casting to prevent NaN from 'custom' prop
  const val = props.zone.custom?.width != null 
    ? props.zone.custom.width 
    : props.zone.width
  return Number(val) || 0
})

const finalHeight = computed(() => {
  // [FIX] Force Number casting
  const val = props.zone.custom?.height != null 
    ? props.zone.custom.height 
    : props.zone.height
  return Number(val) || 0
})

const labelText = computed(() => {
  return props.zone.custom?.textValue || (props.zone.type === 'dead' ? 'DEAD ZONE' : 'OBSTRUCTION')
})

const textColor = computed(() => {
  return props.zone.custom?.textColor || (props.zone.type === 'dead' ? '#b71c1c' : '#424242')
})

const zoneFill = computed(() => {
  return props.zone.custom?.fillColor || (props.zone.type === 'dead' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(100, 100, 100, 0.5)')
})

const zoneStroke = computed(() => {
  if (props.isSelected) return '#00a1ff'
  return props.zone.custom?.strokeColor || (props.zone.type === 'dead' ? 'red' : 'black')
})

const handleTransformEnd = () => {
  const group = groupRef.value.getNode()
  const scaleX = group.scaleX(); const scaleY = group.scaleY()
  group.scaleX(1); group.scaleY(1)
  
  const currentW = finalWidth.value
  const currentH = finalHeight.value
  const newW = currentW * scaleX
  const newH = currentH * scaleY
  
  const updates = {
    id: props.zone.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
  }

  // [UPDATED] Smart Update: Write to 'custom' if it exists, otherwise write to standard props
  // Check Width
  if (props.zone.custom?.width != null) {
      updates.custom = { ...props.zone.custom, width: newW }
  } else {
      updates.width = newW
  }

  // Check Height (Merge into updates.custom if we just created it)
  if (props.zone.custom?.height != null) {
      const baseCustom = updates.custom || props.zone.custom
      updates.custom = { ...baseCustom, height: newH }
  } else {
      updates.height = newH
  }
  
  emit('update', updates)
}

function handleContextMenu(e) {
  e.evt.preventDefault() // Stop browser context menu
  e.cancelBubble = true // <--- ADD THIS
  emit('contextmenu', { e: e.evt, id: props.zone.id })
}

function handleDragEnd(e) {
  // Was: emit('update', { ... })
  emit('dragend', e)
}

function dragBoundFunc(pos) {
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6 
  
  // [UPDATED] Use finalWidth/Height for boundary calculations
  const zW = finalWidth.value * props.scale
  const zH = finalHeight.value * props.scale

  const maxX = (store.ringDimensions.width * props.scale) - zW
  const maxY = (store.ringDimensions.height * props.scale) - zH

  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step

  relX = Math.max(0, Math.min(relX, maxX))
  relY = Math.max(0, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: zone.id,
      x: zone.x * (scale || 1),
      y: zone.y * (scale || 1),
      rotation: zone.rotation,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="emit('select', zone.id)"
    @contextmenu="handleContextMenu"
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleDragEnd"
    @transformend="handleTransformEnd"
  >
<v-rect
      :config="{
        width: finalWidth * (scale || 1),
        height: finalHeight * (scale || 1),
        fill: zoneFill,
        stroke: zoneStroke,
        strokeWidth: isSelected ? 3 : 2,
        dash: [10, 5]
      }"
    />

    <v-text
      :config="{
        text: labelText,
        width: finalWidth * scale,
        height: finalHeight * scale,
        fontSize: 14,
        fontStyle: 'bold',
        fill: textColor,
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
      keepRatio: false,
      rotationSnaps: rotationSnaps,   rotationSnapTolerance: 15       }"
    @transformend="handleTransformEnd"
  />
</template>
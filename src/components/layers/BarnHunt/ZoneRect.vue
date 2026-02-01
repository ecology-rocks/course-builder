<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()
const props = defineProps(['zone', 'isSelected', 'scale'])
// Added 'dragstart' and 'dragmove'
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend'])

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



const labelText = computed(() => props.zone.type === 'dead' ? 'DEAD ZONE' : 'OBSTRUCTION')
const textColor = computed(() => props.zone.type === 'dead' ? '#b71c1c' : '#424242')

const handleTransformEnd = () => {
  const group = groupRef.value.getNode()
  const scaleX = group.scaleX(); const scaleY = group.scaleY()
  group.scaleX(1); group.scaleY(1)
  
  emit('update', {
    id: props.zone.id,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: group.rotation(),
    width: props.zone.width * scaleX,
    height: props.zone.height * scaleY
  })
}

function handleDragEnd(e) {
  // Was: emit('update', { ... })
  emit('dragend', e)
}

function dragBoundFunc(pos) {
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6 // 2-inch snap
  
  // Calculate Zone Dimensions in Pixels
  const zW = props.zone.width * props.scale
  const zH = props.zone.height * props.scale

  const maxX = (store.ringDimensions.width * props.scale) - zW
  const maxY = (store.ringDimensions.height * props.scale) - zH

  // 1. Snap
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step

  // 2. Clamp
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
    @dragstart="emit('dragstart', $event)"
    @dragmove="emit('dragmove', $event)"
    @dragend="handleDragEnd"
    @transformend="handleTransformEnd"
  >
    <v-rect
      :config="{
        width: (zone.width || 0) * (scale || 1),
    height: (zone.height || 0) * (scale || 1),
        fill: zone.type === 'dead' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(100, 100, 100, 0.5)',
        stroke: isSelected ? '#00a1ff' : (zone.type === 'dead' ? 'red' : 'black'),
        strokeWidth: isSelected ? 3 : 2,
        dash: [10, 5]
      }"
    />

    <v-text
      :config="{
        text: labelText,
        width: zone.width * scale,
        height: zone.height * scale,
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
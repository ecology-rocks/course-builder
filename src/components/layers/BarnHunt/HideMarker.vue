<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['hide', 'scale'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend']) 
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

const fillColor = computed(() => {
  switch (props.hide.type) {
    case 'rat': return '#ef5350'    // Red
    case 'litter': return '#ffee58' // Yellow
    case 'empty': return '#fff'     // White
    default: return '#fff'
  }
})

const label = computed(() => {
  switch (props.hide.type) {
    case 'rat': return 'R'; case 'litter': return 'L'; case 'empty': return 'E'; default: return '?'
  }
})

function handleClick(e) {
  e.cancelBubble = true
  if (store.activeTool === 'delete') {
    store.removeHide(props.hide.id)
  } else {
    store.cycleHideType(props.hide.id)
  }
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  
  // Radius is 8px
  const r = 8
  const maxX = (store.ringDimensions.width * props.scale) - r
  const maxY = (store.ringDimensions.height * props.scale) - r

  relX = Math.max(r, Math.min(relX, maxX))
  relY = Math.max(r, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      id: hide.id,
      x: hide.x * scale,
      y: hide.y * scale,
      draggable: true,
      dragBoundFunc: dragBoundFunc
    }"
    @click="handleClick"
    @dragstart="emit('dragstart', $event)" 
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
  >
    <v-circle :config="{ radius: 8, fill: fillColor, stroke: 'black', strokeWidth: 2, shadowColor: 'black', shadowBlur: 2, shadowOpacity: 0.3 }" />
    <v-text :config="{ text: label, fontSize: 10, fontStyle: 'bold', fill: 'black', x: -3.5, y: -4.5 }" />
  </v-group>
</template>
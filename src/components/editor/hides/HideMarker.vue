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
    case 'rat': return '#ef5350'    
    case 'litter': return '#ffee58' 
    case 'empty': return '#fff'     
    default: return '#fff'
  }
})

// [NEW] Stroke color reacts to selection
const strokeColor = computed(() => {
  if (store.selection.includes(props.hide.id)) return '#00a1ff' // Blue highlight
  return 'black'
})

// [NEW] Stroke width increases slightly on selection for visibility
const strokeWidth = computed(() => {
  const base = borderConfig.value.strokeWidth
  return store.selection.includes(props.hide.id) ? base + 1 : base
})

const label = computed(() => {
  const typeMap = { rat: 'R', litter: 'L', empty: 'E' }
  const typeChar = typeMap[props.hide.type] || '?'
  return props.hide.number ? `${typeChar}${props.hide.number}` : typeChar
})

const borderConfig = computed(() => {
  const elevation = props.hide.elevation || 'regular_over'
  
  if (elevation === 'under') {
    return { strokeWidth: 2, dash: [4, 3] } // Dashed = Under
  } else {
    return { strokeWidth: 2, dash: null }   // Solid = Regular/Over
  }
})

function onLeftClick(e) {
  e.cancelBubble = true
  
  if (store.activeTool === 'delete') {
    store.removeHide(props.hide.id)
    return
  }

  // Allow Alt+Click to still cycle elevation
  if (e.evt.altKey) {
    store.cycleHideElevation(props.hide.id)
    return
  }

  // Select logic (supports Shift+Click for multi-select via store logic if added, 
  // but for now simple select)
  store.selectHide(props.hide.id) 
}

function onRightClick(e) {
  e.evt.preventDefault()
  e.cancelBubble = true 
  store.openHideMenu(props.hide.id, e.evt.clientX, e.evt.clientY)
}

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  
  const r = 12
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
    @click="onLeftClick" 
    @contextmenu="onRightClick"
    @dragstart="emit('dragstart', $event)" 
    @dragmove="emit('dragmove', $event)"
    @dragend="emit('dragend', $event)"
  >
    <v-rect 
      :config="{ 
        width: props.hide.number ? 32 : 24, 
        height: 24,
        x: props.hide.number ? -16 : -12,
        y: -12,
        cornerRadius: 12,
        fill: fillColor, 
        stroke: strokeColor, 
        strokeWidth: strokeWidth,
        dash: borderConfig.dash,
        shadowBlur: store.selection.includes(hide.id) ? 10 : 2,
        shadowColor: store.selection.includes(hide.id) ? '#00a1ff' : 'black'
      }" 
    />
    <v-text 
      :config="{ 
        text: label, 
        fontSize: 13, 
        fontStyle: 'bold', 
        fill: 'black', 
        width: props.hide.number ? 32 : 24,
        x: props.hide.number ? -16 : -12,
        y: -6,
        align: 'center',
        listening: false
      }" 
    />
  </v-group>
</template>
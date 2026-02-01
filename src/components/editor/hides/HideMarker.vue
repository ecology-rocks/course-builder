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

const label = computed(() => {
  switch (props.hide.type) {
    case 'rat': return 'R'; case 'litter': return 'L'; case 'empty': return 'E'; default: return '?'
  }
})

// [NEW] Visual styles for elevation
// [UPDATED] Default is now 'regular_over', 'floor' is removed
const borderConfig = computed(() => {
  const elevation = props.hide.elevation || 'regular_over'
  
  if (elevation === 'under') {
    return { strokeWidth: 2, dash: [4, 3] } // Dashed = Under
  } else {
    return { strokeWidth: 2, dash: null }   // Solid = Regular/Over
  }
})
// [UPDATED] Left Click: Handle Delete OR Select
function onLeftClick(e) {
  e.cancelBubble = true
  
  if (store.activeTool === 'delete') {
    store.removeHide(props.hide.id)
    return
  }

  // Allow Alt+Click to still cycle elevation if you want a mouse shortcut
  if (e.evt.altKey) {
    store.cycleHideElevation(props.hide.id)
    return
  }

  // MAIN FIX: Select the hide so keyboard shortcuts (like 'U') work
  store.selectHide(props.hide.id) 
}

// [NEW] Right Click: Cycles Type (R/L/E)
function onRightClick(e) {
  e.evt.preventDefault() // Prevents browser context menu
  store.cycleHideType(props.hide.id)
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
    <v-circle 
      :config="{ 
        radius: 12, 
        fill: fillColor, 
        stroke: 'black', 
        strokeWidth: borderConfig.strokeWidth,
        dash: borderConfig.dash,
        shadowColor: 'black', 
        shadowBlur: 2, 
        shadowOpacity: 0.3 
      }" 
    />
    
    <v-text 
      :config="{ 
        text: label, 
        fontSize: 14, 
        fontStyle: 'bold', 
        fill: 'black', 
        x: -5, 
        y: -6,
        listening: false
      }" 
    />
  </v-group>
</template>
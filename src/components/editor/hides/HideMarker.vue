<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['hide', 'scale'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend']) 
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// ## COMPUTED VALUES

const fillColor = computed(() => {
  // Priority: Custom Color > Type Default
  if (props.hide.custom?.fillColor) return props.hide.custom.fillColor
  
  switch (props.hide.type) {
    case 'rat': return '#ef5350'    
    case 'litter': return '#ffee58' 
    case 'empty': return '#fff'     
    default: return '#fff'
  }
})

const strokeColor = computed(() => {
  if (store.selection.includes(props.hide.id)) return '#00a1ff'
  return props.hide.custom?.strokeColor || 'black'
})

// [UPDATED] Dimensions now calculated in FEET and multiplied by scale
const dimensions = computed(() => {
  const isNumbered = !!props.hide.number
  
  // Default sizes in FEET (World Units)
  // 0.75 ft (9 inches) for standard, 1.0 ft for numbered
  const defaultW = isNumbered ? 1.0 : 0.75
  const defaultH = 0.75
  
  // Use custom feet value if set, otherwise default
  const widthFt = props.hide.custom?.width != null ? props.hide.custom.width : defaultW
  const heightFt = props.hide.custom?.height != null ? props.hide.custom.height : defaultH

  return {
    width: widthFt * props.scale,
    height: heightFt * props.scale
  }
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
  const customStyle = props.hide.custom?.borderStyle
  const elevation = props.hide.elevation || 'regular_over'
  
  // If explicitly custom dashed OR elevation is under, use dashed
  if (customStyle === 'dashed' || elevation === 'under') {
    return { strokeWidth: 2, dash: [4, 3] }
  }

  // Otherwise solid
  return { strokeWidth: 2, dash: null }
})

const textColor = computed(() => {
  return props.hide.custom?.textColor || 'black'
})

// ## FUNCTIONS

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
  // [UPDATED] Use dynamic dimensions for boundary check
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  
  const w = dimensions.value.width
  const h = dimensions.value.height
  const halfW = w / 2
  const halfH = h / 2
  
  // Clamp so the center point respects the boundary minus size
  // (Adjust logic if you want the EDGE to hit the wall, currently ensuring center stays somewhat in bounds)
  const maxX = (store.ringDimensions.width * props.scale) - halfW
  const maxY = (store.ringDimensions.height * props.scale) - halfH

  relX = Math.max(halfW, Math.min(relX, maxX))
  relY = Math.max(halfH, Math.min(relY, maxY))

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
    width: dimensions.width, 
    height: dimensions.height,
    x: -(dimensions.width / 2),
    y: -(dimensions.height / 2),
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
    fill: textColor, 
    width: dimensions.width,
    x: -(dimensions.width / 2),
    y: -6,
    align: 'center',
    listening: false
  }" 
/>
  </v-group>
</template>
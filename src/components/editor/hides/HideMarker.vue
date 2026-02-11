<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['hide', 'scale', 'locked'])
const emit = defineEmits(['dragstart', 'dragmove', 'dragend']) 
const store = useMapStore()
const groupRef = ref(null)

defineExpose({ getNode: () => groupRef.value?.getNode() })

// ## COMPUTED VALUES

const fillColor = computed(() => {
  if (props.hide.custom?.fillColor) return props.hide.custom.fillColor
  switch (props.hide.type) {
    case 'rat': return '#ef5350'    
    case 'litter': return '#ffee58' 
    case 'empty': return '#fff'     
    default: return '#fff'
  }
})

const borderConfig = computed(() => {
  const customStyle = props.hide.custom?.borderStyle
  const elevation = props.hide.elevation || 'regular_over'
  const ratio = props.scale / 20
  
  if (customStyle === 'dashed' || elevation === 'under') {
    return { strokeWidth: 2, dash: [4 * ratio, 3 * ratio] }
  }
  return { strokeWidth: 2, dash: null }
})

const strokeColor = computed(() => {
  if (store.selection.includes(props.hide.id)) return '#00a1ff'
  return props.hide.custom?.strokeColor || 'black'
})

const dimensions = computed(() => {
  const isNumbered = !!props.hide.number
  const defaultW = isNumbered ? 1.0 : 0.75
  const defaultH = 0.75
  
  const widthFt = props.hide.custom?.width != null ? props.hide.custom.width : defaultW
  const heightFt = props.hide.custom?.height != null ? props.hide.custom.height : defaultH

  return {
    width: widthFt * props.scale,
    height: heightFt * props.scale
  }
})

const strokeWidth = computed(() => {
  const base = borderConfig.value.strokeWidth
  const ratio = props.scale / 20
  return store.selection.includes(props.hide.id) ? (base + 1) * ratio : base * ratio
})

const scaledCornerRadius = computed(() => {
  const ratio = props.scale / 20
  const maxRadius = Math.min(dimensions.value.width, dimensions.value.height) / 2
  return Math.min(12 * ratio, maxRadius)
})

const label = computed(() => {
  const typeMap = { rat: 'R', litter: 'L', empty: 'E' }
  const typeChar = typeMap[props.hide.type] || '?'
  return props.hide.number ? `${typeChar}${props.hide.number}` : typeChar
})

const textColor = computed(() => {
  return props.hide.custom?.textColor || 'black'
})

const textConfig = computed(() => ({
  text: label.value,
  fontSize: props.scale * 0.45,
  fontStyle: 'bold',
  fill: textColor.value,
  width: dimensions.value.width,
  height: dimensions.value.height,
  x: -(dimensions.value.width / 2),
  y: -(dimensions.value.height / 2),
  align: 'center',
  verticalAlign: 'middle', 
  listening: false
}))

// ## FUNCTIONS

function onLeftClick(e) {
  e.cancelBubble = true
  if (store.activeTool === 'delete') {
    store.removeHide(props.hide.id)
    return
  }
  if (e.evt.altKey) {
    store.cycleHideElevation(props.hide.id)
    return
  }
  store.selectHide(props.hide.id) 
}

function onRightClick(e) {
  // [FIX] Always prevent default browser menu
  e.evt.preventDefault()
  
  // [FIX] If locked, STOP propagation so Stage menu doesn't open either
  if (props.locked) {
    e.cancelBubble = true
    return
  }
  
  e.cancelBubble = true 
  store.openHideMenu(props.hide.id, e.evt.clientX, e.evt.clientY)
}

function dragBoundFunc(pos) {
  const layerAbs = this.getLayer().getAbsolutePosition()
  const step = props.scale / 6
  
  let relX = Math.round((pos.x - layerAbs.x) / step) * step
  let relY = Math.round((pos.y - layerAbs.y) / step) * step
  
  const w = dimensions.value.width
  const h = dimensions.value.height
  const halfW = w / 2
  const halfH = h / 2
  
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
      id: String(hide.id),
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
        cornerRadius: scaledCornerRadius,
        fill: fillColor, 
        stroke: strokeColor, 
        strokeWidth: strokeWidth,
        dash: borderConfig.dash,
        shadowBlur: store.selection.includes(hide.id) ? 10 : 2,
        shadowColor: store.selection.includes(hide.id) ? '#00a1ff' : 'black'
      }" 
    />
    <v-text :config="textConfig" />
  </v-group>
</template>
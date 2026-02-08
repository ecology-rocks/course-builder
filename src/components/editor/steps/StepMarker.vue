<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['step', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'contextmenu'])

const store = useMapStore()
const groupRef = ref(null)

// Expose node so Parent can access it if needed
defineExpose({ getNode: () => groupRef.value?.getNode() })

// --- 1. Rotation Snapping Logic ---
const isCtrlPressed = ref(false)

const finalWidth = computed(() => {
  return props.step.custom?.width != null ? props.step.custom.width : props.step.width
})

const finalHeight = computed(() => {
  return props.step.custom?.height != null ? props.step.custom.height : props.step.height
})

const fillColor = computed(() => {
  return props.step.custom?.fillColor || '#8D6E63'
})

const strokeColor = computed(() => {
  if (props.isSelected) return '#00a1ff'
  return props.step.custom?.strokeColor || 'black'
})

const labelText = computed(() => {
  return props.step.custom?.textValue || 'STEP'
})

const labelColor = computed(() => {
  return props.step.custom?.textColor || 'white'
})

const rotationSnaps = computed(() => {
  if (!isCtrlPressed.value) return []
  
  // Generate angles from -360 to 360 in 15-degree steps
  // This ensures it snaps correctly whether you rotate left or right
  const snaps = []
  for (let i = -24; i <= 24; i++) {
    snaps.push(i * 15)
  }
  return snaps
})

function handleKeyDown(e) {
  if (e.key === 'Control' || e.metaKey) isCtrlPressed.value = true
}

function handleKeyUp(e) {
  if (e.key === 'Control' || e.metaKey) isCtrlPressed.value = false
}

function handleContextMenu(e) {
  // Prevent the browser menu
  e.evt.preventDefault()
  e.cancelBubble = true // <--- ADD THIS
  
  // 2. Emit an OBJECT with 'e' (the native event) and 'id'
  emit('contextmenu', { e: e.evt, id: props.step.id })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

// --- 2. Transform Logic ---

function handleTransform() {
  const group = groupRef.value.getNode()
  const text = group.findOne('.step-text')
  const rect = group.findOne('.step-rect')
  
  const sx = group.scaleX()
  const sy = group.scaleY()

  // Optional: Counter-scale text so it stays sharp and doesn't stretch
  if (text) {
    text.scaleX(1 / sx)
    text.scaleY(1 / sy)
    
    // Update dimensions so the text stays centered in the growing/shrinking box
    text.width(group.width() * sx)
    text.height(group.height() * sy)
  }
}

function handleTransformEnd() {
  const group = groupRef.value.getNode()
  const rect = group.findOne('.step-rect')
  const text = group.findOne('.step-text')

  // Calculate final pixel dimensions based on current scale
  const rawW = group.width() * group.scaleX()
  const rawH = group.height() * group.scaleY()
  
  // Ensure minimum size (15px)
  const finalPixelW = Math.max(15, rawW)
  const finalPixelH = Math.max(15, rawH)
  
  // Convert back to World Units (feet)
  const newWorldW = finalPixelW / props.scale
  const newWorldH = finalPixelH / props.scale

  const rawRotation = group.rotation()
  const normalizedRotation = (rawRotation % 360 + 360) % 360

  // RESET Group Scale to 1
  group.scaleX(1)
  group.scaleY(1)
  group.rotation(normalizedRotation)

  // Apply new dimensions to children visually immediately (prevents flicker)
  rect.width(finalPixelW)
  rect.height(finalPixelH)
  
  if (text) {
    text.scaleX(1)
    text.scaleY(1)
    text.width(finalPixelW)
    text.height(finalPixelH)
  }

  // [UPDATED] Smart Update Logic
  const updates = {
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: normalizedRotation
  }

  // If custom width exists, update it. Otherwise update standard width.
  if (props.step.custom?.width != null) {
    updates.custom = { ...props.step.custom, width: newWorldW }
  } else {
    updates.width = newWorldW
  }

  // If custom height exists, update it.
  if (props.step.custom?.height != null) {
    const baseCustom = updates.custom || props.step.custom
    updates.custom = { ...baseCustom, height: newWorldH }
  } else {
    updates.height = newWorldH
  }

  emit('update', { id: props.step.id, ...updates })
}

// --- 3. Drag Constraints (Grid Snap + Ring Bounds) ---

function dragBoundFunc(pos) {
  const node = this
  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 
  
  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y
  
  // Snap Position
  relX = Math.round(relX / step) * step
  relY = Math.round(relY / step) * step

  // Bounds Calculation 
  const mapW = store.ringDimensions.width * props.scale
  const mapH = store.ringDimensions.height * props.scale
  
  const w = node.width() * node.scaleX()
  const h = node.height() * node.scaleY()

  const rad = node.rotation() * (Math.PI / 180)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  
  const cornersX = [0, w * cos, w * cos - h * sin, -h * sin]
  const cornersY = [0, w * sin, w * sin + h * cos, h * cos]
  
  const minRx = Math.min(...cornersX)
  const maxRx = Math.max(...cornersX)
  const minRy = Math.min(...cornersY)
  const maxRy = Math.max(...cornersY)

  const minX = -minRx
  const maxX = mapW - maxRx
  const minY = -minRy
  const maxY = mapH - maxRy

  relX = Math.max(minX, Math.min(relX, maxX))
  relY = Math.max(minY, Math.min(relY, maxY))

  return { x: relX + layerAbs.x, y: relY + layerAbs.y }
}
</script>

<template>
  <v-group>
    <v-group
      ref="groupRef"
      :config="{
        id: step.id,
        x: step.x * scale, 
        y: step.y * scale,
        width: finalWidth * scale,
        height: finalHeight * scale,
        rotation: step.rotation || 0,
        draggable: true,
        dragBoundFunc: dragBoundFunc
      }"
      @click="emit('select', step.id, $event.evt.shiftKey)"
      @contextmenu="handleContextMenu"
      @dragstart="emit('dragstart', $event)"
      @dragmove="emit('dragmove', $event)"
      @dragend="emit('dragend', $event)"
      @transform="handleTransform"
      @transformend="handleTransformEnd"
    >
      <v-rect 
        :config="{
          name: 'step-rect',
          width: finalWidth * scale,
        height: finalHeight * scale,
          fill: fillColor,
          stroke: isSelected ? '#00a1ff' : strokeColor || 'black',
          strokeWidth: isSelected ? 3 : 2,
          cornerRadius: 5
        }" 
      />
      
      <v-text 
        :config="{
          name: 'step-text',
          text: labelText,
          fontSize: scale * 0.5,
          fill: labelColor,
          width: finalWidth * scale,
          height: finalHeight * scale,
          align: 'center',
          verticalAlign: 'middle',
          listening: false
        }" 
      />
    </v-group>

    <v-transformer
      v-if="isSelected && groupRef"
      :config="{
        nodes: [groupRef.getNode()],
        rotateEnabled: true,
        keepRatio: false,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        rotationSnaps: rotationSnaps,
        rotationSnapTolerance: 15
      }"
    />
  </v-group>
</template>
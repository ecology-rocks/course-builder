<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['step', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend'])

const store = useMapStore()
const groupRef = ref(null)

// Expose node so Parent can access it if needed
defineExpose({ getNode: () => groupRef.value?.getNode() })

// --- 1. Rotation Snapping Logic ---
const isCtrlPressed = ref(false)

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

  // 1. Calculate final pixel dimensions
  const finalW = Math.max(15, group.width() * group.scaleX())
  const finalH = Math.max(15, group.height() * group.scaleY())

const rawRotation = group.rotation()
  const normalizedRotation = (rawRotation % 360 + 360) % 360

  // 2. RESET Group Scale to 1
  group.scaleX(1)
  group.scaleY(1)

  group.rotation(normalizedRotation)

  // 3. Apply new dimensions to children
  rect.width(finalW)
  rect.height(finalH)
  
  if (text) {
    text.scaleX(1)
    text.scaleY(1)
    text.width(finalW)
    text.height(finalH)
  }

  // 4. Emit Update
  emit('update', props.step.id, {
    width: finalW / props.scale,
    height: finalH / props.scale,
    x: group.x() / props.scale,
    y: group.y() / props.scale,
    rotation: normalizedRotation
  })
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
        width: step.width * scale,
        height: step.height * scale,
        rotation: step.rotation || 0,
        draggable: true,
        dragBoundFunc: dragBoundFunc
      }"
      @click="emit('select', step.id, $event.evt.shiftKey)"
      @dragstart="emit('dragstart', $event)"
      @dragmove="emit('dragmove', $event)"
      @dragend="emit('dragend', $event)"
      @transform="handleTransform"
      @transformend="handleTransformEnd"
    >
      <v-rect 
        :config="{
          name: 'step-rect',
          width: step.width * scale,
          height: step.height * scale,
          fill: '#8D6E63',
          stroke: isSelected ? '#00a1ff' : 'black',
          strokeWidth: isSelected ? 3 : 2,
          cornerRadius: 5
        }" 
      />
      
      <v-text 
        :config="{
          name: 'step-text',
          text: 'STEP',
          fontSize: scale * 0.5,
          fill: 'white',
          width: step.width * scale,
          height: step.height * scale,
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
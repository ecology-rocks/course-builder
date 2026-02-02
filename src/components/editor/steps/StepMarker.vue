<script setup>
import { ref, watch, nextTick } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()
const props = defineProps(['step', 'isSelected', 'scale'])
const emit = defineEmits(['select', 'update', 'dragstart', 'dragmove', 'dragend', 'rotate'])

const groupRef = ref(null)
const transformerRef = ref(null)

const syncTransformer = () => {
  const tr = transformerRef.value?.getNode()
  if (tr) {
    tr.forceUpdate()
    tr.getLayer()?.batchDraw()
  }
}

watch(() => props.isSelected, async (val) => {
  await nextTick()
  const node = groupRef.value?.getNode()
  const tr = transformerRef.value?.getNode()
  if (tr && node) {
    if (val) {
      tr.nodes([node])
      syncTransformer()
    } else {
      tr.nodes([])
    }
  }
})

function handleTransform() {
  const node = groupRef.value.getNode();
  const rect = node.findOne('Rect');
  const text = node.findOne('Text');
  
  // 1. Calculate new dimensions based on the group's scale
  const newWidth = Math.max(15, node.width() * node.scaleX());
  const newHeight = Math.max(15, node.height() * node.scaleY());

  // 2. Reset Group scale to 1 IMMEDIATELY
  node.scaleX(1);
  node.scaleY(1);

  // 3. Apply the new size to the Group AND the Rect
  node.width(newWidth);
  node.height(newHeight);
  
  if (rect) {
    rect.width(newWidth);
    rect.height(newHeight);
  }

  // 4. Update text dimensions to match
if (text) {
    text.width(newWidth);
    text.height(newHeight);
    // [OPTIONAL] If you want to ensure it's perfectly sharp during drag:
    text.scaleX(1);
    text.scaleY(1);
  }

  syncTransformer();
}

function handleTransformEnd() {
  const node = groupRef.value.getNode();

  // 1. Get the final visual dimensions (already updated in handleTransform)
  const currentWidth = node.width();
  const currentHeight = node.height();
  
  // 2. Calculate the "True Center" in Parent (Layer) Coordinates.
  //    We use the node's current transform matrix (which uses the old anchor)
  //    to find where the point (newWidth/2, newHeight/2) is currently located on screen.
  const transform = node.getTransform();
  const newCenter = transform.point({ 
    x: currentWidth / 2, 
    y: currentHeight / 2 
  });

  // 3. Save these new coordinates.
  //    Since 'newCenter' is in pixels relative to the Layer, 
  //    we just divide by scale to get back to Map Units.
  emit('update', props.step.id, {
    width: currentWidth / props.scale,
    height: currentHeight / props.scale,
    x: newCenter.x / props.scale,
    y: newCenter.y / props.scale,
    rotation: node.rotation()
  });
  
  nextTick(syncTransformer);
}

function dragBoundFunc(pos) {
  const node = this
  const visualW = props.step.width * props.scale
  const visualH = props.step.height * props.scale
  const rad = (props.step.rotation || 0) * Math.PI / 180
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))

  const bboxW = (visualW * absCos) + (visualH * absSin)
  const bboxH = (visualW * absSin) + (visualH * absCos)

  const minX = bboxW / 2
  const maxX = (store.ringDimensions.width * props.scale) - (bboxW / 2)
  const minY = bboxH / 2
  const maxY = (store.ringDimensions.height * props.scale) - (bboxH / 2)

  const layerAbs = node.getLayer().getAbsolutePosition()
  const step = props.scale / 6 

  let relX = pos.x - layerAbs.x
  let relY = pos.y - layerAbs.y

  const halfW = bboxW / 2
  const halfH = bboxH / 2
  
  const leftEdge = relX - halfW
  const topEdge = relY - halfH

  const snappedLeft = Math.round(leftEdge / step) * step
  const snappedTop = Math.round(topEdge / step) * step

  let newCenterX = snappedLeft + halfW
  let newCenterY = snappedTop + halfH

  newCenterX = Math.max(minX, Math.min(newCenterX, maxX))
  newCenterY = Math.max(minY, Math.min(newCenterY, maxY))

  return { x: newCenterX + layerAbs.x, y: newCenterY + layerAbs.y }
}

defineExpose({ getNode: () => groupRef.value?.getNode() })
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
        dragBoundFunc: dragBoundFunc,
        // Center the pivot point
        offsetX: (step.width * scale) / 2,
        offsetY: (step.height * scale) / 2
      }"
      @click="emit('select', step.id, $event.evt.shiftKey)"
      @dragstart="emit('dragstart', $event)"
      @dragmove="emit('dragmove', $event)"
      @dragend="emit('dragend', $event)"
      @transform="handleTransform"
      @transformend="handleTransformEnd"
    >
      <v-rect :config="{
        width: step.width * scale,
        height: step.height * scale,
        fill: '#8D6E63',
        stroke: isSelected ? '#00a1ff' : 'black',
        strokeWidth: isSelected ? 3 : 2,
        cornerRadius: 5
      }" />
      
      <v-text :config="{
        text: 'STEP',
        fontSize:  scale * 0.5,
        fill: 'white',
        width: step.width * scale,
        height: step.height * scale,
        align: 'center',
        verticalAlign: 'middle',
        listening: false
      }" />
    </v-group>

    <v-transformer
      v-if="isSelected"
      ref="transformerRef"
      :config="{
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        rotateEnabled: true,
        // Crucial: tells transformer to update width/height instead of scale
        anchorDragLeave: true,
        boundBoxFunc: (oldBox, newBox) => {
          if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
            return oldBox;
          }
          return newBox;
        }
      }"
    />
  </v-group>
</template>
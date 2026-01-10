<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['gate', 'scale'])
const store = useMapStore()

// --- SELECTION STATE ---
const isSelected = computed(() => store.selection.includes(props.gate.id))
const strokeColor = computed(() => isSelected.value ? '#2196f3' : 'black')
const strokeWidth = computed(() => isSelected.value ? 3 : 2)

// --- HANDLERS ---
function handleClick(e) {
  e.cancelBubble = true
  
  // [FIX] Allow Delete Tool to work on single click
  if (store.activeTool === 'delete') {
    store.removeGate()
    return
  }

  // Otherwise, handle selection
  const isMulti = e.evt.shiftKey || e.evt.metaKey
  store.selectObject(props.gate.id, isMulti)
}

function handleDblClick(e) {
  e.cancelBubble = true
  // [OPTIONAL] Keep double-click delete as a fallback shortcut
  if (store.activeTool === 'delete') {
    store.removeGate()
  }
}
</script>

<template>
  <v-group
    :config="{
      x: gate.x * scale,
      y: gate.y * scale,
      rotation: gate.rotation,
      draggable: true,
      name: 'gate'
    }"
    @click="handleClick"
    @dblclick="handleDblClick"
    @dragstart="$emit('dragstart', $event)"
    @dragmove="$emit('dragmove', $event)"
    @dragend="$emit('dragend', $event)"
  >
    <v-rect :config="{ 
      width: 3 * scale, 
      height: 6, 
      offsetX: (3 * scale) / 2, 
      offsetY: 3, 
      fill: 'white', 
      stroke: strokeColor, 
      strokeWidth: strokeWidth 
    }" />
    
    <v-text :config="{ 
      text: 'GATE', 
      fontSize: 12, 
      fontStyle: 'bold', 
      offsetX: 15, 
      offsetY: -5,
      listening: false 
    }" />
  </v-group>
</template>
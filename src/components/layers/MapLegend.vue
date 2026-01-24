<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale', 'GRID_OFFSET'])
const store = useMapStore()

// Default position (Top Right corner relative to ring)
const x = computed(() => (store.ringDimensions.width * props.scale) + props.GRID_OFFSET + 20)
const y = computed(() => props.GRID_OFFSET)

const inventory = computed(() => store.inventory)
const diffs = computed(() => store.differentials)

// --- NEW LOGIC START ---
const comparisonName = computed(() => store.comparisonMapName)
const nameIsLong = computed(() => comparisonName.value && comparisonName.value.length > 18)
const dynamicOffset = computed(() => nameIsLong.value ? 14 : 0)

// If we have a comparison name, we push everything down by 20 pixels
const offset = computed(() => comparisonName.value ? 20 : 0)

// Calculate total height dynamically based on both Diffs and Comparison Label
const totalHeight = computed(() => diffs.value ? (215 + dynamicOffset.value) : 110)

const dragBoundFunc = (pos) => {
  const boxWidth = 140
  const boxHeight = totalHeight.value 
  
  const minX = props.GRID_OFFSET
  const minY = props.GRID_OFFSET
  const maxX = minX + (store.ringDimensions.width * props.scale) - boxWidth
  const maxY = minY + (store.ringDimensions.height * props.scale) - boxHeight

  return {
    x: Math.max(minX, Math.min(pos.x, maxX)),
    y: Math.max(minY, Math.min(maxY, pos.y))
  }
}
// --- NEW LOGIC END ---

</script>

<template>
  <v-group :config="{ draggable: true, x: 20, y: 20, dragBoundFunc: dragBoundFunc }">

    <v-rect :config="{
      width: 150,
      height: totalHeight,
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      shadowColor: 'black',
      shadowBlur: 5,
      shadowOpacity: 0.2
    }" />

    <v-text :config="{ text: 'Map Statistics', x: 10, y: 10, fontSize: 14, fontStyle: 'bold', fill: 'black' }" />

    <v-text :config="{ text: `Total Bales: ${inventory.total}`, x: 10, y: 35, fontSize: 12, fill: '#333' }" />
    <v-text :config="{ text: `Layer 1: ${inventory.base}`, x: 10, y: 52, fontSize: 12, fill: '#f57c00' }" />
    <v-text :config="{ text: `Layer 2: ${inventory.layer2}`, x: 10, y: 69, fontSize: 12, fill: '#2e7d32' }" />
    <v-text :config="{ text: `Layer 3: ${inventory.layer3}`, x: 10, y: 86, fontSize: 12, fill: '#1565c0' }" />

    <v-group v-if="diffs">
      <v-line :config="{ points: [10, 102, 130, 102], stroke: '#ccc', strokeWidth: 1 }" />

      <v-text :config="{ text: 'Changes vs.', x: 10, y: 108, fontSize: 11, fontStyle: 'bold', fill: '#666' }" />
      
      <v-text :config="{ 
        text: comparisonName || 'Unknown', 
        x: 10, 
        y: 123, 
        width: 125,
        wrap: 'char',
        fontSize: 11, 
        fontStyle: 'italic', 
        fill: '#d32f2f' 
      }" />

      <v-text :config="{
        text: `L1: ${diffs[1].net > 0 ? '+' : ''}${diffs[1].net} bales${diffs[1].moved > 0 ? `, ${diffs[1].moved} moved` : ''}`,
        x: 10, y: 143 + dynamicOffset, fontSize: 11, fill: '#333'
      }" />
      <v-text :config="{
        text: `L2: ${diffs[2].net > 0 ? '+' : ''}${diffs[2].net} bales${diffs[2].moved > 0 ? `, ${diffs[2].moved} moved` : ''}`,
        x: 10, y: 158 + dynamicOffset, fontSize: 11, fill: '#333'
      }" />
      <v-text :config="{
        text: `L3: ${diffs[3].net > 0 ? '+' : ''}${diffs[3].net} bales${diffs[3].moved > 0 ? `, ${diffs[3].moved} moved` : ''}`,
        x: 10, y: 173 + dynamicOffset, fontSize: 11, fill: '#333'
      }" />
      
      <v-line :config="{ points: [10, 188 + dynamicOffset, 130, 188 + dynamicOffset], stroke: '#eee', strokeWidth: 1 }" />
      
      <v-text :config="{
        text: `TOTAL: ${diffs.totalNet > 0 ? '+' : ''}${diffs.totalNet} Bales`,
        x: 10, y: 195 + dynamicOffset, fontSize: 12, fontStyle: 'bold', fill: 'black'
      }" />
    </v-group>
  </v-group>
</template>
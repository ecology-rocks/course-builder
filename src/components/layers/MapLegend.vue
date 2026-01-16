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

const dragBoundFunc = (pos) => {
  const boxWidth = 190
  // FIX: Make height dynamic to match the template logic
  const boxHeight = diffs.value ? 170 : 110
  
  // Calculate boundaries in Stage Pixels
  // The Grid starts at GRID_OFFSET and extends by (width * scale)
  const minX = props.GRID_OFFSET
  const minY = props.GRID_OFFSET
  const maxX = minX + (store.ringDimensions.width * props.scale) - boxWidth
  const maxY = minY + (store.ringDimensions.height * props.scale) - boxHeight

  return {
    x: Math.max(minX, Math.min(pos.x, maxX)),
    y: Math.max(minY, Math.min(maxY, pos.y))
  }
}

</script>

<template>
  <v-group :config="{ draggable: true, x: 20, y: 20, dragBoundFunc: dragBoundFunc }">

    <v-rect :config="{
      width: 140,
      height: diffs ? 170 : 110,
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
      <v-line :config="{ points: [10, 100, 130, 100], stroke: '#ccc', strokeWidth: 1 }" />

      <v-text :config="{ text: 'Changes:', x: 10, y: 105, fontSize: 11, fontStyle: 'bold', fill: '#666' }" />

      <v-text :config="{
        text: `L1: ${diffs[1].net > 0 ? '+' : ''}${diffs[1].net} bales${diffs[1].moved > 0 ? `, ${diffs[1].moved} moved` : ''}`,
        x: 10, y: 120, fontSize: 11, fill: '#333'
      }" />
      <v-text :config="{
        text: `L2: ${diffs[2].net > 0 ? '+' : ''}${diffs[2].net} bales${diffs[2].moved > 0 ? `, ${diffs[2].moved} moved` : ''}`,
        x: 10, y: 135, fontSize: 11, fill: '#333'
      }" />
      <v-text :config="{
        text: `L3: ${diffs[3].net > 0 ? '+' : ''}${diffs[3].net} bales${diffs[3].moved > 0 ? `, ${diffs[3].moved} moved` : ''}`,
        x: 10, y: 150, fontSize: 11, fill: '#333'
      }" />
      
      <v-line :config="{ points: [10, 163, 130, 163], stroke: '#eee', strokeWidth: 1 }" />
      <v-text :config="{
        text: `TOTAL: ${diffs.totalNet > 0 ? '+' : ''}${diffs.totalNet} Bales`,
        x: 10, y: 170, fontSize: 12, fontStyle: 'bold', fill: 'black'
      }" />
    </v-group>
  </v-group>
</template>
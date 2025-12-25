<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale', 'GRID_OFFSET'])
const store = useMapStore()

// Default position (Top Right corner relative to ring)
const x = computed(() => (store.ringDimensions.width * props.scale) + props.GRID_OFFSET + 20)
const y = computed(() => props.GRID_OFFSET)

const inventory = computed(() => store.inventory)
</script>

<template>
  <v-group :config="{ draggable: true, x: 20, y: 20 }">
    
    <v-rect :config="{ 
      width: 140, 
      height: 110, 
      fill: 'white', 
      stroke: 'black', 
      strokeWidth: 2,
      shadowColor: 'black',
      shadowBlur: 5,
      shadowOpacity: 0.2
    }" />

    <v-text :config="{ text: 'Map Statistics', x: 10, y: 10, fontSize: 14, fontStyle: 'bold', fill: 'black' }" />
    
    <v-text :config="{ text: `Total Bales: ${inventory.total}`, x: 10, y: 35, fontSize: 12, fill: '#333' }" />
    <v-text :config="{ text: `Layer 1: ${inventory.base}`, x: 10, y: 52, fontSize: 12, fill: '#f57c00' }" /> <v-text :config="{ text: `Layer 2: ${inventory.layer2}`, x: 10, y: 69, fontSize: 12, fill: '#2e7d32' }" /> <v-text :config="{ text: `Layer 3: ${inventory.layer3}`, x: 10, y: 86, fontSize: 12, fill: '#1565c0' }" /> </v-group>
</template>
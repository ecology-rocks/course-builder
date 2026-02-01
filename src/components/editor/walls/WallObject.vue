<script setup>
// Added 'scale' to props to consume the attribute and prevent Konva warning
const props = defineProps(['wall', 'scale'])
</script>

<template>
  <v-group>
    <v-line 
      :config="{
        points: [wall.x1, wall.y1, wall.x2, wall.y2],
        stroke: '#795548',
        strokeWidth: 0.15,
        lineCap: 'round'
      }" 
    />
    <v-line 
      :config="{
        points: [wall.x1, wall.y1, wall.x2, wall.y2],
        stroke: 'transparent',
        strokeWidth: 1
      }" 
    />
  </v-group>
</template>
<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['scale', 'dragBoundFunc'])
const store = useMapStore()

const visibleObstacles = computed(() => store.agilityObstacles)

// Handlers specific to Agility items
function handleRightClick(e, id) { e.evt.preventDefault(); store.rotateAgilityObstacle(id) }
function handleDblClick(e, id) { if (e.evt.button === 0) store.removeAgilityObstacle(id) }

function handleClick(e, id) {
  if (e.evt.button !== 0) return // Guard Left Click

  if (store.activeTool === 'delete') {
    store.removeAgilityObstacle(id)
  } else if (store.activeTool === 'rotate') {
    store.rotateAgilityObstacle(id)
  } else if (store.activeTool === 'type' || e.evt.altKey) { 
    const obs = store.agilityObstacles.find(o => o.id === id)
    if (obs) {
      if (obs.type === 'tunnel') store.cycleAgilityShape(id)
      if (obs.type === 'weave') store.cycleAgilityPoles(id)
    }
  } else if (store.activeTool === 'renumber') {
    store.renumberObstacle(id, store.nextNumber)
    store.nextNumber++ 
  }
}

function onDragEnd(e, id) {
  const node = e.target
  // We rely on the parent (or store) to normalize coordinates if needed, 
  // but Agility items are center-based so straightforward snapping works.
  const layerAbs = node.getLayer().getAbsolutePosition()
  const absPos = node.getAbsolutePosition()
  const relX = absPos.x - layerAbs.x
  const relY = absPos.y - layerAbs.y
  
  const rawX = relX / props.scale
  const rawY = relY / props.scale

  const obs = store.agilityObstacles.find(o => o.id === id)
  if (obs) { obs.x = rawX; obs.y = rawY }
}
</script>

<template>
  <v-group>
    <v-group v-for="obs in visibleObstacles" :key="obs.id" 
      :config="{ draggable: true, dragBoundFunc: props.dragBoundFunc, x: obs.x*scale, y: obs.y*scale, rotation: obs.rotation }"
      @contextmenu="handleRightClick($event, obs.id)" 
      @dblclick="handleDblClick($event, obs.id)" 
      @click="handleClick($event, obs.id)"
      @dragend="onDragEnd($event, obs.id)"
    >
      <v-group v-if="obs.type === 'jump'">
        <v-rect :config="{ x: -2.5*scale, y: -0.5*scale, width: 5*scale, height: 1*scale, fill: 'transparent' }" />
        <v-rect :config="{ x: -2.5*scale, y: -0.05*scale, width: 5*scale, height: 0.1*scale, fill: '#1976d2' }" />
        <v-rect :config="{ x: -2.5*scale, y: -0.25*scale, width: 0.1*scale, height: 0.5*scale, fill: '#0d47a1' }" />
        <v-rect :config="{ x: 2.4*scale, y: -0.25*scale, width: 0.1*scale, height: 0.5*scale, fill: '#0d47a1' }" />
      </v-group>

      <v-group v-if="obs.type === 'tunnel'">
        <v-group v-if="!obs.shape || obs.shape === 'straight'">
          <v-rect :config="{ x: -7.5*scale, y: -1*scale, width: 15*scale, height: 2*scale, fill: '#fff176', stroke: 'black', strokeWidth: 2, cornerRadius: 5 }" />
          <v-line v-for="i in 5" :key="i" :config="{ points: [(-7.5 + (i*2.5))*scale, -1*scale, (-7.5 + (i*2.5))*scale, 1*scale], stroke: '#fbc02d', strokeWidth: 1 }" />
        </v-group>
        <v-group v-else-if="obs.shape === 'L'">
          <v-arc :config="{ x: -10*scale, y: -10*scale, innerRadius: 9*scale, outerRadius: 11*scale, angle: 90, fill: '#fff176', stroke: 'black', strokeWidth: 2, rotation: 0 }" />
        </v-group>
        <v-group v-else-if="obs.shape === 'U'">
          <v-arc :config="{ x: -5*scale, y: 0, innerRadius: 4*scale, outerRadius: 6*scale, angle: 180, fill: '#fff176', stroke: 'black', strokeWidth: 2, rotation: -90 }" />
        </v-group>
      </v-group>

      <v-group v-if="obs.type === 'weave'">
        <v-rect :config="{ x: -(((obs.poleCount || 12) * 2 * scale) / 2), y: -scale, width: (obs.poleCount || 12) * 2 * scale, height: 2 * scale, fill: 'transparent' }" />
        <v-circle v-for="i in (obs.poleCount || 12)" :key="i" :config="{ x: ((i - 1) - ((obs.poleCount || 12) - 1) / 2) * (2 * scale), y: 0, radius: 4, fill: Math.floor((i-1)/2) % 2 === 0 ? 'purple' : '#ab47bc', stroke: 'black', strokeWidth: 1 }" />
        <v-text :config="{ text: (obs.poleCount || 12).toString(), fontSize: 16, fontStyle: 'bold', fill: 'black', stroke: 'white', strokeWidth: 0.5, x: 0, y: 15, width: 40, offsetX: 20, offsetY: 8, align: 'center', rotation: -obs.rotation }" />
      </v-group>

      <v-group v-if="obs.type === 'dogwalk'">
        <v-rect :config="{ x: -12*scale, y: -0.5*scale, width: 24*scale, height: 1*scale, fill: '#81c784', stroke: '#388e3c', strokeWidth: 1 }" />
        <v-rect :config="{ x: -12*scale, y: -0.5*scale, width: 6*scale, height: 1*scale, fill: '#fff59d' }" /> 
        <v-rect :config="{ x: 6*scale, y: -0.5*scale, width: 6*scale, height: 1*scale, fill: '#fff59d' }" />
      </v-group>
      <v-group v-if="obs.type === 'aframe'">
        <v-rect :config="{ x: -4*scale, y: -1.5*scale, width: 8*scale, height: 3*scale, fill: '#81c784', stroke: '#388e3c', strokeWidth: 1 }" />
        <v-rect :config="{ x: -4*scale, y: -1.5*scale, width: 3*scale, height: 3*scale, fill: '#fff59d' }" />
        <v-rect :config="{ x: 1*scale, y: -1.5*scale, width: 3*scale, height: 3*scale, fill: '#fff59d' }" />
        <v-line :config="{ points: [0, -1.5*scale, 0, 1.5*scale], stroke: 'white', strokeWidth: 2 }" />
      </v-group>
      <v-group v-if="obs.type === 'teeter'">
        <v-rect :config="{ x: -6*scale, y: -0.5*scale, width: 12*scale, height: 1*scale, fill: '#81c784', stroke: '#388e3c', strokeWidth: 1 }" />
        <v-rect :config="{ x: -6*scale, y: -0.5*scale, width: 3*scale, height: 1*scale, fill: '#fff59d' }" />
        <v-rect :config="{ x: 3*scale, y: -0.5*scale, width: 3*scale, height: 1*scale, fill: '#fff59d' }" />
        <v-regular-polygon :config="{ x: 0, y: 0, sides: 3, radius: 0.8*scale, fill: '#555' }" />
      </v-group>
      <v-rect v-if="obs.type === 'table'" :config="{ x: -1.5*scale, y: -1.5*scale, width: 3*scale, height: 3*scale, fill: '#ffb74d', stroke: 'black' }" />

      <v-group v-if="obs.number">
        <v-circle :config="{ radius: 10, fill: 'white', stroke: 'black', strokeWidth: 1, rotation: -obs.rotation }" />
        <v-text :config="{ text: obs.number.toString(), fontSize: 12, fontStyle: 'bold', align: 'center', verticalAlign: 'middle', width: 20, height: 20, offsetX: 10, offsetY: 10, rotation: -obs.rotation }" />
      </v-group>
    </v-group>
  </v-group>
</template>
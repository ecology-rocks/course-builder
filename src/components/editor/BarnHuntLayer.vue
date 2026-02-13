<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

// Components
import BaleObject from './bales/BaleObject.vue'
import BoardObject from './boards/BoardObject.vue' 
import HideMarker from './hides/HideMarker.vue'
import StepMarker from './steps/StepMarker.vue'
import ZoneRect from './zones/ZoneRect.vue'
import StartBoxObject from './mats/StartBoxObject.vue'
import DCMatObject from './mats/DCMatObject.vue'
import MeasurementObject from './annotations/MeasurementObject.vue'
import NoteObject from './annotations/NoteObject.vue'
import TunnelBoxObject from './boards/TunnelBoxObject.vue'
import GateObject from './gates/GateObject.vue'
import WallObject from './walls/WallObject.vue'


const props = defineProps({
  bale: Object,
  scale: Number,
  opacity: {
    type: Number,
    default: 1
  },
  showHides: true,
  locked: { type: Boolean, default: false },
  hides: {
    type: Array,
    default: () => []
  },
  GRID_OFFSET: {
    type: Number,
    default: 0
  }
})
const store = useMapStore()

defineExpose({
  getNode: () => groupRef.value?.getNode()
})

const objectRefs = ref({})
const dragStartPos = ref({})

// --- COMPUTED ---
const displayedHides = computed(() => {
  if (props.locked) {
    return props.hides
  }
  return store.hides
})

const visibleBales = computed(() => {
  let filtered;
  if (store.multiLayerView) {
    if (typeof store.multiLayerView === 'number') {
      filtered = store.bales.filter(b => b.layer <= store.multiLayerView);
    } else {
      filtered = store.bales;
    }
  } else {
    filtered = store.bales.filter(b => b.layer === store.currentLayer);
  }
  return filtered.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer
    const aIsLeaner = !!a.lean
    const bIsLeaner = !!b.lean
    if (aIsLeaner && !bIsLeaner) return 1
    if (!aIsLeaner && bIsLeaner) return -1
    return 0
  })
})

const visibleMeasurements = computed(() => {
  if (!store.measurements) return []
  
  return store.measurements.filter(m => {
    const itemLayer = m.layer !== undefined ? m.layer : 1
    if (store.multiLayerView) {
      if (typeof store.multiLayerView === 'number') {
        return itemLayer <= store.multiLayerView
      }
      return true
    }
    return itemLayer === store.currentLayer
  })
})

const setRef = (el, id) => {
  if (el) objectRefs.value[id] = el
}

function handleSelect(id, isMulti = false) {
  if (store.activeTool === 'delete') {
    store.removeObject(id)
  } else {
    store.selectObject(id, isMulti)
  }
}

// --- HANDLERS ---

function handleStepContextMenu({ e, id }) {
  if (props.locked) return
  store.activeStepMenu = { id, x: e.clientX, y: e.clientY }
}

function handleZoneContextMenu({ e, id }) {
  if (props.locked) return
  store.activeZoneMenu = { id, x: e.clientX, y: e.clientY }
}

function handleStartBoxContextMenu({ e, id }) {
  if (props.locked) return 
  store.activeStartBoxMenu = { id, x: e.clientX, y: e.clientY }
}

function handleTunnelBoxContextMenu({ e, id }) {
  if (props.locked) return 
  store.activeTunnelBoxMenu = { id, x: e.clientX, y: e.clientY }
}

function handleNoteContextMenu(e, id) {
  e.evt.preventDefault()
  e.cancelBubble = true
  if (props.locked) return 
  store.activeNoteMenu = { id, x: e.evt.clientX, y: e.evt.clientY }
}

function handleRightClick(e, id) {
  e.evt.preventDefault()
  e.cancelBubble = true
  if (props.locked) return 

  if (store.activeTool === 'lean') return
  if (e.evt.ctrlKey || e.evt.altKey) return

  if (store.activeTool === 'measure' && store.activeMeasurement) {
    store.finishMeasurement()
    return
  }

  store.activeBaleMenu = { id, x: e.evt.clientX, y: e.evt.clientY }
}

function handleLeftClick(e, id) {
  if (e.evt.button !== 0) return
  const evt = e.evt
  
  if (evt.altKey) { store.cycleOrientation(id); return }
  if (evt.ctrlKey) { store.cycleLean(id); return }

  if (store.activeTool === 'board') {
    const stage = e.target.getStage()
    const p = stage.getPointerPosition()
    const rawX = (p.x - props.GRID_OFFSET) / props.scale
    const rawY = (p.y - props.GRID_OFFSET) / props.scale
    if (!store.isDrawingBoard) store.startDrawingBoard(rawX, rawY)
    else store.stopDrawingBoard()
    return
  }

  if (store.activeTool === 'measure') {
    const stage = e.target.getStage()
    const p = stage.getPointerPosition()
    const rawX = (p.x - props.GRID_OFFSET) / props.scale
    const rawY = (p.y - props.GRID_OFFSET) / props.scale
    const snapX = Math.round(rawX * 2) / 2
    const snapY = Math.round(rawY * 2) / 2
    store.addMeasurementPoint(snapX, snapY)
    return
  }

  if (store.activeTool === 'hide') {
    const stage = e.target.getStage()
    const p = stage.getPointerPosition()
    const rawX = (p.x - props.GRID_OFFSET) / props.scale
    const rawY = (p.y - props.GRID_OFFSET) / props.scale
    const snapX = Math.round(rawX * 2) / 2
    const snapY = Math.round(rawY * 2) / 2
    store.addHide(snapX, snapY)
    return
  }

  if (store.activeTool === 'select' || store.activeTool === 'bale') {
    const isMulti = evt.shiftKey || evt.metaKey
    if (isMulti) {
      store.selectObject(id, true)
    } else {
      if (store.selection.includes(id)) {
        if (store.selection.length === 1) store.clearSelection()
        else store.selectObject(id, false)
      } else {
        store.selectObject(id, false)
      }
    }
    return
  }

  if (store.activeTool === 'rotate') {
    const amount = evt.shiftKey ? 45 : 15
    store.rotateBale(id, amount)
  }
  if (store.activeTool === 'type') store.cycleOrientation(id)
  if (store.activeTool === 'lean') store.cycleLean(id)
  if (store.activeTool === 'delete') {
    store.removeObject(id)
  }
}

function handleDragStart(e, id) {
  if (!store.selection.includes(id)) store.selectObject(id, false)
  dragStartPos.value = {}
  store.selection.forEach(selId => {
    const cmp = objectRefs.value[selId]
    const node = cmp ? cmp.getNode() : null
    if (node) dragStartPos.value[selId] = { x: node.x(), y: node.y() }
  })
}

function handleDragMove(e, id) {
  const node = e.target
  const start = dragStartPos.value[id]
  if (!start) return
  const dx = node.x() - start.x
  const dy = node.y() - start.y
  store.selection.forEach(selId => {
    if (selId === id) return
    const cmp = objectRefs.value[selId]
    const peerNode = cmp ? cmp.getNode() : null
    const peerStart = dragStartPos.value[selId]
    if (peerNode && peerStart) {
      peerNode.position({ x: peerStart.x + dx, y: peerStart.y + dy })
    }
  })
}

function handleDragEnd(e, id) {
  const start = dragStartPos.value[id]
  if (!start) return
  const totalDx = e.target.x() - start.x
  const totalDy = e.target.y() - start.y
  const gridDx = totalDx / props.scale
  const gridDy = totalDy / props.scale
  
  // 1. Commit the move
  store.moveSelection(gridDx, gridDy)

  // 2. Trigger anchor updates for any selected bales
  // Since moveSelection is generic, we must explicitly ask the store to refresh anchors 
  if (store.refreshAnchors) {
    store.selection.forEach(selId => {
       store.refreshAnchors(selId)
    })
  }
}
</script>

<template>
 <v-group :config="{ listening: !props.locked, name: 'floor-layer' }">
    <template v-for="wall in store.customWalls" :key="wall.id">
      <WallObject :wall="wall" :scale="scale" />
    </template>

    <DCMatObject v-for="mat in store.dcMats" :key="mat.id" :mat="mat" :scale="scale" 
      :ref="(el) => setRef(el, mat.id)"
      @dragstart="handleDragStart($event, mat.id)" 
      @dragmove="handleDragMove($event, mat.id)"
      :opacity="store.currentLayer > 1 ? store.layerOpacity : 1" 
      @dragend="handleDragEnd($event, mat.id)"
      @update="(attrs) => store.updateDCMat(mat.id, attrs)" 
    />

    <StartBoxObject v-if="store.startBox" :scale="scale" 
      :isSelected="store.selection.includes(store.startBox?.id)"
      :ref="(el) => setRef(el, store.startBox?.id || 'startbox')" 
      @select="handleSelect($event)"
      @dragstart="handleDragStart($event, store.startBox?.id)" 
      @dragmove="handleDragMove($event, store.startBox?.id)"
      :opacity="store.currentLayer > 1 ? store.layerOpacity : 1" 
      @dragend="handleDragEnd($event, store.startBox?.id)"
      @contextmenu="handleStartBoxContextMenu" 
    />
  </v-group>

  <v-group :config="{ listening: !props.locked, name: 'object-layer' }">
    <v-group v-if="store.activeWall">
      <v-line :config="{
        points: store.activeWall.points.flatMap(p => [p.x * scale, p.y * scale]),
        stroke: '#555',
        strokeWidth: 4,
        dash: [10, 5],
        listening: false
      }" />
      <v-circle v-for="(pt, i) in store.activeWall.points" :key="'active-pt-' + i" :config="{
        x: pt.x * scale,
        y: pt.y * scale,
        radius: 6,
        fill: '#ff9800',
        stroke: 'white',
        strokeWidth: 2,
        listening: false 
      }" />
    </v-group>

    <GateObject v-if="store.gate" :gate="store.gate" :scale="scale" :ringDimensions="store.ringDimensions"
      :ref="(el) => setRef(el, store.gate?.id)" @dragstart="handleDragStart($event, store.gate?.id)"
      @dragmove="handleDragMove($event, store.gate?.id)" @dragend="handleDragEnd($event, store.gate?.id)" />

    <BaleObject v-for="bale in visibleBales" :key="bale.id" :bale="bale" :scale="scale"
      :opacity="store.multiLayerView && bale.layer !== store.currentLayer ? store.layerOpacity : 1"
      :ref="(el) => setRef(el, bale.id)" @contextmenu="handleRightClick($event, bale.id)"
      @click="handleLeftClick($event, bale.id)" @dragstart="handleDragStart($event, bale.id)"
      @dragmove="handleDragMove($event, bale.id)" @dragend="handleDragEnd($event, bale.id)" />

    <TunnelBoxObject v-for="board in store.tunnelBoards" :key="board.id" :board="board" :scale="scale"
      :isSelected="store.selection.includes(board.id)" :ref="(el) => setRef(el, board.id)" @select="handleSelect"
      @update="(attrs) => store.updateTunnelBoard(attrs.id, attrs)" @dragstart="handleDragStart($event, board.id)"
      @dragmove="handleDragMove($event, board.id)" @dragend="handleDragEnd($event, board.id)"
      @contextmenu="handleTunnelBoxContextMenu" />

    <BoardObject v-for="board in store.boardEdges" :key="board.id" :board="board" :scale="scale"
      :ref="(el) => setRef(el, board.id)" @dragstart="handleDragStart($event, board.id)"
      :opacity="store.currentLayer > 1 ? store.layerOpacity : 1" @dragmove="handleDragMove($event, board.id)"
      @dragend="handleDragEnd($event, board.id)" />
  </v-group>

  <template v-if="props.showHides">
    <HideMarker v-for="hide in displayedHides" :key="hide.id" :hide="hide" :scale="scale"
      :locked="props.locked"
      :ref="(el) => setRef(el, hide.id)" @dragstart="handleDragStart($event, hide.id)"
      @dragmove="handleDragMove($event, hide.id)" @dragend="handleDragEnd($event, hide.id)" />
  </template>

  <v-group :config="{ listening: !props.locked }">
  <StepMarker v-for="step in store.steps" :key="step.id" :step="step" :scale="scale"
    :isSelected="store.selection.includes(step.id)" :ref="(el) => setRef(el, step.id)" @select="handleSelect"
    @update="(id, attrs) => store.updateStep(id, attrs)" @dragstart="handleDragStart($event, step.id)"
    @dragmove="handleDragMove($event, step.id)" @dragend="handleDragEnd($event, step.id)"
    @contextmenu="handleStepContextMenu" :opacity="store.currentLayer > 1 ? store.layerOpacity : 1"
    @rotate="store.rotateStep" />

  <ZoneRect v-for="zone in store.zones" :key="zone.id" :zone="zone" :scale="scale"
    :isSelected="store.selection.includes(zone.id)" :ref="(el) => setRef(el, zone.id)" @select="handleSelect"
    @update="(attrs) => store.updateZone(attrs.id, attrs)" @dragstart="handleDragStart($event, zone.id)"
    @dragmove="handleDragMove($event, zone.id)" @dragend="handleDragEnd($event, zone.id)"
    @contextmenu="handleZoneContextMenu" />

  <NoteObject v-for="note in store.notes" :key="note.id" :note="note" :scale="scale"
    :isSelected="store.selection.includes(note.id)" :ref="(el) => setRef(el, note.id)" @select="handleSelect"
    @update="(attrs) => store.updateNote(attrs.id, attrs)" @dragstart="handleDragStart($event, note.id)"
    @dragmove="handleDragMove($event, note.id)" @dragend="handleDragEnd($event, note.id)"
    @contextmenu="handleNoteContextMenu($event, note.id)" />

  <v-group>
    <MeasurementObject v-for="m in visibleMeasurements" :key="m.id" :measurement="m" :scale="scale"
      :opacity="store.multiLayerView && (m.layer ?? 1) !== store.currentLayer ? store.layerOpacity : 1" />
    <MeasurementObject v-if="store.activeMeasurement" :measurement="store.activeMeasurement" :scale="scale" />
  </v-group>

  </v-group>
</template>
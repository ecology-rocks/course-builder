<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

// Components
import BaleObject from './bales/BaleObject.vue'
import BoardObject from './boards/BoardObject.vue' // Renamed
import HideMarker from './hides/HideMarker.vue'
import StepMarker from './steps/StepMarker.vue'
import ZoneRect from './zones/ZoneRect.vue'
import StartBoxObject from './mats/StartBoxObject.vue'
import DCMatObject from './mats/DCMatObject.vue'
import MeasurementObject from './annotations/MeasurementObject.vue'
import NoteObject from './annotations/NoteObject.vue'
import TunnelBoxObject from './boards/TunnelBoxObject.vue'
import GateObject from './walls/GateObject.vue'



const props = defineProps({
  bale: Object,
  scale: Number,
  opacity: {
    type: Number,
    default: 1
  },
  showHides: true,
})
const store = useMapStore()

defineExpose({
  getNode: () => groupRef.value?.getNode()
})
// UNIFIED REF REGISTRY: Stores { [id]: ComponentInstance }
const objectRefs = ref({})
const dragStartPos = ref({})

// --- COMPUTED ---
const visibleBales = computed(() => {
  // [FIX] If overlay is OFF, only show bales that match the current layer exactly
  let filtered;

  if (store.multiLayerView) {
    // If multiLayerView is a number (the current print layer), 
    // show everything up to and including that layer.
    if (typeof store.multiLayerView === 'number') {
      filtered = store.bales.filter(b => b.layer <= store.multiLayerView);
    } else {
      // Fallback for boolean true (UI editor mode)
      filtered = store.bales;
    }
  } else {
    // Standard view: only show the active layer
    filtered = store.bales.filter(b => b.layer === store.currentLayer);
  }
  return filtered.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer

    // [FIX] Use truthy check (!!a.lean) to handle 'undefined' from legacy saves.
    // 'right'/'left' is true. null/undefined is false.
    const aIsLeaner = !!a.lean
    const bIsLeaner = !!b.lean

    // Sort leaners to the end of the array (drawn on top)
    if (aIsLeaner && !bIsLeaner) return 1
    if (!aIsLeaner && bIsLeaner) return -1
    return 0
  })
})

const visibleMeasurements = computed(() => {
  if (!store.measurements) return []
  return store.measurements.filter(m => {
    // Legacy support: show if no layer
    if (m.layer === undefined) return true

    // Respect Multi-Layer View (Overlay)
    if (store.multiLayerView) {
      if (typeof store.multiLayerView === 'number') {
        return m.layer <= store.multiLayerView
      }
      return true // Show all in UI editor mode
    }

    // Standard view: only active layer
    return m.layer === store.currentLayer
  })
})

// --- HELPER: Register Refs ---
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

function handleZoneContextMenu({ e, id }) {
  // Set the store state to open the menu at the mouse coordinates
  store.activeZoneMenu = { id, x: e.clientX, y: e.clientY }
}

function handleRightClick(e, id) {
  e.evt.preventDefault()
  e.cancelBubble = true
  if (store.activeTool === 'lean') return
  if (e.evt.ctrlKey || e.evt.altKey) return
  if (store.activeTool === 'measure' && store.activeMeasurement) {
    store.finishMeasurement()
    return
  }

  const amount = e.evt.shiftKey ? 45 : 15
  store.rotateBale(id, amount)
}

function handleLeftClick(e, id) {
  // 1. Strict Check: Only allow Left Mouse Button
  if (e.evt.button !== 0) return

  const evt = e.evt

  // 2. Modifiers: Alt (Shape) / Ctrl (Lean)
  if (evt.altKey) { store.cycleOrientation(id); return }
  if (evt.ctrlKey) { store.cycleLean(id); return }

  // 3. Board & Measure Tools (Pass-through)
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
    // Calculate grid coordinates based on scale and offset
    const rawX = (p.x - props.GRID_OFFSET) / props.scale
    const rawY = (p.y - props.GRID_OFFSET) / props.scale

    // Snap to grid if desired (e.g., 0.5 units)
    const snapX = Math.round(rawX * 2) / 2
    const snapY = Math.round(rawY * 2) / 2

    store.addHide(snapX, snapY)
    return
  }

  // 4. [UPDATED] Selection Logic: Toggle behavior
  if (store.activeTool === 'select' || store.activeTool === 'bale') {
    const isMulti = evt.shiftKey || evt.metaKey

    if (isMulti) {
      // Shift-Click: Always Toggle
      store.selectObject(id, true)
    } else {
      // Standard Click
      if (store.selection.includes(id)) {
        // CASE A: Item is already selected
        if (store.selection.length === 1) {
          // If it's the ONLY item selected -> Deselect it (Toggle off)
          store.clearSelection()
        } else {
          // If multiple items are selected -> Select ONLY this one
          store.selectObject(id, false)
        }
      } else {
        // CASE B: Item is not selected -> Select it
        store.selectObject(id, false)
      }
    }
    return
  }

  // 5. Other Tools
  if (store.activeTool === 'rotate') {
    // Shift = 45 deg, Default = 15 deg
    const amount = evt.shiftKey ? 45 : 15
    store.rotateBale(id, amount)
  }
  if (store.activeTool === 'type') store.cycleOrientation(id)
  if (store.activeTool === 'lean') store.cycleLean(id)
  if (store.activeTool === 'delete') {
    store.removeObject(id)
  }
}
// --- MULTI-OBJECT DRAG LOGIC ---

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

  store.moveSelection(gridDx, gridDy)
}

// --- ANCHOR LINES ---
// --- ANCHOR LINES ---
function getAnchorLines(bale) {
  // 1. Get Dynamic Config
  const { length: L, width: W, height: H } = store.baleConfig

  let w, h
  if (bale.orientation === 'pillar') { w = W; h = H }
  else if (bale.orientation === 'tall') { w = L; h = H }
  else { w = L; h = W } // Flat

  // 2. Calculate Center (Pivot) in Grid Units
  const halfW = w / 2
  const halfH = h / 2
  const pivotX = bale.x + halfW
  const pivotY = bale.y + halfH

  // 3. Define Local Corners (offsets from center)
  const corners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH }
  ]

  // 4. Rotate Corners to find Bounding Box
  const rad = (bale.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const rotatedCoords = corners.map(p => ({
    x: (p.x * cos) - (p.y * sin) + pivotX,
    y: (p.x * sin) + (p.y * cos) + pivotY
  }))

  const minX = Math.min(...rotatedCoords.map(c => c.x))
  const maxX = Math.max(...rotatedCoords.map(c => c.x))
  const minY = Math.min(...rotatedCoords.map(c => c.y))
  const maxY = Math.max(...rotatedCoords.map(c => c.y))

  // 5. Calculate Lines
  const RingW = store.ringDimensions.width
  const RingH = store.ringDimensions.height
  const lines = []
  const fmt = (val) => { const total = Math.round(val * 12); const ft = Math.floor(total / 12); const inch = total % 12; return inch === 0 ? `${ft}'` : `${ft}' ${inch}"` }

  // Horizontal (Left vs Right)
  const distLeft = minX
  const distRight = RingW - maxX

  if (distLeft <= distRight) {
    lines.push({
      points: [0, pivotY * props.scale, minX * props.scale, pivotY * props.scale],
      text: fmt(distLeft),
      textX: (minX / 2) * props.scale,
      textY: pivotY * props.scale,
      dir: 'down' // Label sits above, points down
    })
  } else {
    lines.push({
      points: [maxX * props.scale, pivotY * props.scale, RingW * props.scale, pivotY * props.scale],
      text: fmt(distRight),
      textX: (RingW - (distRight / 2)) * props.scale,
      textY: pivotY * props.scale,
      dir: 'down'
    })
  }

  // Vertical (Top vs Bottom)
  const distTop = minY
  const distBottom = RingH - maxY

  if (distTop <= distBottom) {
    lines.push({
      points: [pivotX * props.scale, 0, pivotX * props.scale, minY * props.scale],
      text: fmt(distTop),
      textX: pivotX * props.scale,
      textY: (minY / 2) * props.scale,
      dir: 'left' // Label sits right, points left
    })
  } else {
    lines.push({
      points: [pivotX * props.scale, maxY * props.scale, pivotX * props.scale, RingH * props.scale],
      text: fmt(distBottom),
      textX: pivotX * props.scale,
      textY: (RingH - (distBottom / 2)) * props.scale,
      dir: 'left'
    })
  }

  return lines
}

</script>

<template>
  <v-group>
    <StartBoxObject v-if="store.startBox" :scale="scale" :isSelected="store.selection.includes(store.startBox?.id)"
      :ref="(el) => setRef(el, store.startBox?.id || 'startbox')" @select="handleSelect($event)"
      @dragstart="handleDragStart($event, store.startBox?.id)" @dragmove="handleDragMove($event, store.startBox?.id)"
      :opacity="store.currentLayer > 1 ? store.layerOpacity : 1" @dragend="handleDragEnd($event, store.startBox?.id)" />

    <GateObject v-if="store.gate" :gate="store.gate" :scale="scale" :ringDimensions="store.ringDimensions"
      :ref="(el) => setRef(el, store.gate?.id)" @dragstart="handleDragStart($event, store.gate?.id)"
      @dragmove="handleDragMove($event, store.gate?.id)" @dragend="handleDragEnd($event, store.gate?.id)" />

    <DCMatObject v-for="mat in store.dcMats" :key="mat.id" :mat="mat" :scale="scale" :ref="(el) => setRef(el, mat.id)"
      @dragstart="handleDragStart($event, mat.id)" @dragmove="handleDragMove($event, mat.id)"
      :opacity="store.currentLayer > 1 ? store.layerOpacity : 1" @dragend="handleDragEnd($event, mat.id)"
      @update="(attrs) => store.updateDCMat(mat.id, attrs)" />

    <BaleObject v-for="bale in visibleBales" :key="bale.id" :bale="bale" :scale="scale"
      :opacity="store.multiLayerView && bale.layer !== store.currentLayer ? store.layerOpacity : 1"
      :ref="(el) => setRef(el, bale.id)" @contextmenu="handleRightClick($event, bale.id)"
      @click="handleLeftClick($event, bale.id)" @dragstart="handleDragStart($event, bale.id)"
      @dragmove="handleDragMove($event, bale.id)" @dragend="handleDragEnd($event, bale.id)" />

    <template v-if="props.showHides">
      <HideMarker v-for="hide in store.hides" :key="hide.id" :hide="hide" :scale="scale"
        :ref="(el) => setRef(el, hide.id)" @dragstart="handleDragStart($event, hide.id)"
        @dragmove="handleDragMove($event, hide.id)" @dragend="handleDragEnd($event, hide.id)" />
    </template>

    <StepMarker v-for="step in store.steps" :key="step.id" :step="step" :scale="scale"
      :isSelected="store.selection.includes(step.id)" :ref="(el) => setRef(el, step.id)" @select="handleSelect"
      @update="(id, attrs) => store.updateStep(id, attrs)" @dragstart="handleDragStart($event, step.id)"
      @dragmove="handleDragMove($event, step.id)" @dragend="handleDragEnd($event, step.id)"
      :opacity="store.currentLayer > 1 ? store.layerOpacity : 1" @rotate="store.rotateStep" />

    <ZoneRect v-for="zone in store.zones" :key="zone.id" :zone="zone" :scale="scale"
      :isSelected="store.selection.includes(zone.id)" :ref="(el) => setRef(el, zone.id)" @select="handleSelect"
      @update="(attrs) => store.updateZone(attrs.id, attrs)" @dragstart="handleDragStart($event, zone.id)"
      @dragmove="handleDragMove($event, zone.id)" @dragend="handleDragEnd($event, zone.id)" @contextmenu="handleZoneContextMenu" />


    <NoteObject v-for="note in store.notes" :key="note.id" :note="note" :scale="scale"
      :isSelected="store.selection.includes(note.id)" :ref="(el) => setRef(el, note.id)" @select="handleSelect"
      @update="(attrs) => store.updateNote(attrs.id, attrs)" @dragstart="handleDragStart($event, note.id)"
      @dragmove="handleDragMove($event, note.id)" @dragend="handleDragEnd($event, note.id)" />

    <TunnelBoxObject v-for="board in store.tunnelBoards" :key="board.id" :board="board" :scale="scale"
      :isSelected="store.selection.includes(board.id)" :ref="(el) => setRef(el, board.id)" @select="handleSelect"
      @update="(attrs) => store.updateTunnelBoard(attrs.id, attrs)" @dragstart="handleDragStart($event, board.id)"
      @dragmove="handleDragMove($event, board.id)" @dragend="handleDragEnd($event, board.id)" />

    <BoardObject v-for="board in store.boardEdges" :key="board.id" :board="board" :scale="scale"
      :ref="(el) => setRef(el, board.id)" @dragstart="handleDragStart($event, board.id)"
      :opacity="store.currentLayer > 1 ? store.layerOpacity : 1" @dragmove="handleDragMove($event, board.id)"
      @dragend="handleDragEnd($event, board.id)" />

    <v-group>
      <MeasurementObject v-for="m in visibleMeasurements" :key="m.id" :measurement="m" :scale="scale"
        :opacity="store.multiLayerView && m.layer !== store.currentLayer ? store.layerOpacity : 1" />

      <MeasurementObject v-if="store.activeMeasurement" :measurement="store.activeMeasurement" :scale="scale" />
    </v-group>

    <v-group>
      <template v-for="bale in visibleBales" :key="'anchor-'+bale.id">
        <template v-if="bale.isAnchor">
          <v-group v-for="(line, i) in getAnchorLines(bale)" :key="i">
            <v-arrow :config="{
              points: line.points,
              pointerLength: 6,
              pointerWidth: 6,
              fill: '#d32f2f',
              stroke: '#d32f2f',
              strokeWidth: 2,
              dash: [6, 4],
              listening: false
            }" />

            <v-label :config="{ x: line.textX, y: line.textY, opacity: 1.0 }">
              <v-tag :config="{
                fill: 'white',
                stroke: '#d32f2f',
                strokeWidth: 1,
                cornerRadius: 3,
                pointerDirection: line.dir,
                pointerWidth: 8,
                pointerHeight: 6
              }" />
              <v-text :config="{
                text: line.text,
                fontSize: 18,
                fill: '#d32f2f',
                fontStyle: 'bold',
                padding: 5,
                align: 'center'
              }" />
            </v-label>
          </v-group>
        </template>
      </template>
    </v-group>s
  </v-group>
</template>
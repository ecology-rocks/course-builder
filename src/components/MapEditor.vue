<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useUserStore } from '../stores/userStore'
import { useAutosave } from '@/composables/useAutosave'
import EditorSidebar from './editor/EditorSidebar.vue'
import { usePrinter } from '@/composables/usePrinter'

// Sub-Layers
import AgilityLayer from './layers/AgilityLayer.vue'
import BarnHuntLayer from './layers/BarnHuntLayer.vue'
import ScentWorkLayer from './layers/ScentWorkLayer.vue' // <--- 1. IMPORT

const store = useMapStore()
const userStore = useUserStore()
useAutosave(3000)
// Config
const scale = ref(40)
const GRID_OFFSET = 30 
const stageRef = ref(null) 
const wrapperRef = ref(null)
const showHides = ref(true)
const selectionRect = ref(null)
const dragStart = ref(null)
// Tracks if we are "thinking about" placing an item but waiting to see if you drag instead
const maybePlacing = ref(false)

// --- KEYBOARD SHORTCUTS ---
// src/components/MapEditor.vue

function handleKeydown(e) {
  // 1. SAFETY CHECK: If the event has no key, ignore it.
  if (!e.key) return 

  const isCtrl = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()

  // Undo: Ctrl+Z (Ensure Shift is NOT pressed)
  if (isCtrl && !e.shiftKey && key === 'z') {
    e.preventDefault()
    store.undo()
    return
  }
  
  // Redo: Ctrl+Y  OR  Ctrl+Shift+Z
  if (isCtrl && (key === 'y' || (e.shiftKey && key === 'z'))) {
    e.preventDefault()
    store.redo()
    return
  }

  // Delete: Delete or Backspace
  if (key === 'delete' || key === 'backspace') {
    // Only delete if we have a selection and aren't typing in an input field
    // We check existence of 'target' just in case
    if (store.selection.length > 0 && e.target && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      store.deleteSelection()
    }
  }
}

// --- SNAPSHOT ON DRAG START ---
function handleDragStart(e) {
  // We only care if it's a draggable item (Group, Circle, etc)
  store.snapshot()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const stageConfig = computed(() => ({
  width: (store.ringDimensions.width * scale.value) + (GRID_OFFSET * 2),
  height: (store.ringDimensions.height * scale.value) + (GRID_OFFSET * 2)
}))

// Zoom
function fitToScreen() {
  if (!wrapperRef.value) return
  const availableW = wrapperRef.value.clientWidth - (GRID_OFFSET * 2) - 40
  const availableH = wrapperRef.value.clientHeight - (GRID_OFFSET * 2) - 40
  const scaleX = availableW / store.ringDimensions.width
  const scaleY = availableH / store.ringDimensions.height
  let newScale = Math.min(scaleX, scaleY)
  scale.value = Math.max(Math.min(Math.floor(newScale), 40), 5)
}

function handleStageContextMenu(e) {
  e.evt.preventDefault() // This works for Konva events
}

function zoom(delta) {
  const newScale = scale.value + delta
  if (newScale >= 5 && newScale <= 60) scale.value = newScale
}

watch(() => [store.sport, store.ringDimensions.width], () => { nextTick(fitToScreen) }, { immediate: true })

// Printer
const { handlePrint: printLogic } = usePrinter(store, userStore, stageRef, scale)
function handlePrint(withHides) {
  showHides.value = withHides
  printLogic(withHides)
  setTimeout(() => { showHides.value = true }, 2000)
}



// Stage Click (Creation)
function handleStageMouseDown(e) {
  // 1. Only allow left-click
  // 2. Only trigger if clicking the blank stage (not an existing object)
  if (e.evt.button !== 0 || e.target !== e.target.getStage()) return
  
  const pointer = e.target.getStage().getPointerPosition()
  const x = (pointer.x - GRID_OFFSET) / scale.value
  const y = (pointer.y - GRID_OFFSET) / scale.value
  dragStart.value = { x, y }
  // Prevent drawing outside the top-left bounds
  if (x < 0 || y < 0) return 

  // --- SELECTION TOOL (Global) ---
  if (store.activeTool === 'select') {
    store.clearSelection()
    // Initialize the drag box state (make sure you defined these refs!)
    dragStart.value = { x, y }
    selectionRect.value = { x, y, w: 0, h: 0 }
    return
  }

  // --- BARN HUNT ---
  if (store.sport === 'barnhunt') {
// A. If using Board Tool, start drawing immediately (same as before)
    if (store.activeTool === 'board') {
      store.startDrawingBoard(x, y)
      return
    }

    // B. If using Explicit Select Tool, start box immediately (same as before)
    if (store.activeTool === 'select') {
      selectionRect.value = { x, y, w: 0, h: 0 }
      return
    }
    maybePlacing.value = true
  } 
  
  // --- AGILITY ---
  else if (store.sport === 'agility') {
    const agilityTools = ['jump', 'tunnel', 'weave', 'contact', 'table', 'aframe', 'dogwalk', 'teeter']
    if (agilityTools.includes(store.activeTool)) {
      store.addAgilityObstacle(store.activeTool, x, y)
    }
  }
  
  // --- SCENT WORK ---
  else if (store.sport === 'scentwork') {
    if (store.activeTool === 'board') {
      store.startDrawingBoard(x, y) // Reuses board logic for tape
    }
    else {
      const swTools = ['box', 'luggage', 'container', 'cone', 'vehicle', 'buried']
      if (swTools.includes(store.activeTool)) {
        store.addScentWorkObject(store.activeTool, x, y)
      }
    }
  }
}

function handleStageMouseMove(e) {
  const stage = e.target.getStage()
  const pointer = stage.getPointerPosition()
  const x = (pointer.x - GRID_OFFSET) / scale.value
  const y = (pointer.y - GRID_OFFSET) / scale.value

  // 1. UPDATE SELECTION BOX (Fixed)
  // Remove "store.activeTool === 'select'" check. 
  // If a box exists (explicit or implicit), resize it!
  if (selectionRect.value && dragStart.value) {
    selectionRect.value.w = x - dragStart.value.x
    selectionRect.value.h = y - dragStart.value.y
    return
  }

  // 2. EXISTING BOARD LOGIC
  if (store.activeTool === 'board' && store.isDrawingBoard) {
    store.updateDrawingBoard(x, y)
    return // Add return here to prevent fall-through
  }

  // 3. DETECT DRAG (Start Implicit Selection)
  if (maybePlacing.value) {
    const dist = Math.hypot(x - dragStart.value.x, y - dragStart.value.y)
    
    if (dist > 0.5) {
      maybePlacing.value = false 
      
      // Start the box
      selectionRect.value = { 
        x: dragStart.value.x, 
        y: dragStart.value.y, 
        w: 0, 
        h: 0 
      }
    }
  }
}

// src/components/MapEditor.vue

function handleStageMouseUp() {
  // 1. FINISH SELECTION (Explicit or Implicit)
  // If a selection box exists, finalize the selection and stop.
  if (selectionRect.value) {
    store.selectArea(
      selectionRect.value.x, 
      selectionRect.value.y, 
      selectionRect.value.w, 
      selectionRect.value.h
    )
    selectionRect.value = null
    dragStart.value = null
    maybePlacing.value = false // Reset placement flag
    return
  }

  // 2. EXECUTE PLACEMENT (Only if we clicked without dragging)
  if (maybePlacing.value) {
    const { x, y } = dragStart.value

    // --- BARN HUNT ---
    if (store.sport === 'barnhunt') {
      if (store.activeTool === 'bale') store.addBale(x, y)
      else if (store.activeTool === 'startbox') store.addStartBox(x, y)
      else if (store.activeTool === 'dcmat') store.addDCMat(x, y)
      else if (store.activeTool === 'hide') store.addHide(x, y)
    } 
    
    // --- AGILITY ---
    else if (store.sport === 'agility') {
       // Assuming addAgilityObstacle handles the 'type' internally or via activeTool
       store.addAgilityObstacle(store.activeTool, x, y)
    }
    
    // --- SCENT WORK ---
    else if (store.sport === 'scentwork') {
      const swTools = ['box', 'luggage', 'container', 'cone', 'vehicle', 'buried']
      if (swTools.includes(store.activeTool)) {
        store.addScentWorkObject(store.activeTool, x, y)
      }
    }
    
    // Reset State
    maybePlacing.value = false
    dragStart.value = null
  }
  
  // 3. FINISH BOARD DRAWING (Barn Hunt specific)
  if (store.activeTool === 'board') {
    store.stopDrawingBoard()
  }
}

function handleGroupDragMove(e, id) {
  if (!store.selection.includes(id)) return
  
  // Calculate Delta
  const node = e.target
  const newPos = node.position()
  
  // We don't actually let Konva move the node freely if it's a group,
  // We prefer to control it via store, OR we let Konva move the leader
  // and we manually move the followers.
  
  // EASIER APPROACH:
  // When 'dragstart' happens on a selected item:
  // 1. We record start positions of ALL selected items.
  // 2. On 'dragmove', we apply the delta to ALL items in the store.
}
</script>

<template>
  <div class="editor-container">
    <EditorSidebar @print="handlePrint" />

    <div class="canvas-wrapper" ref="wrapperRef">
      <Transition name="fade">
        <div v-if="store.notification" class="toast-notification" :class="store.notification.type">
          {{ store.notification.message }}
        </div>
      </Transition>

      <div class="zoom-controls">
        <button @click="zoom(5)">+</button>
        <span>{{ scale }}px</span>
        <button @click="zoom(-5)">-</button>
        <button @click="fitToScreen">Fit</button>
      </div>

      <v-stage ref="stageRef" :config="stageConfig" @mousedown="handleStageMouseDown" @dragstart="handleDragStart" @mousemove="handleStageMouseMove" @mouseup="handleStageMouseUp" @contextmenu="handleStageContextMenu">
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
          
          <template v-for="n in store.ringDimensions.width + 1" :key="'v'+n">
            <v-line v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height*scale], stroke: '#ccc', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height*scale], stroke: '#999', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'scentwork' && (n-1) % 5 === 0" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height*scale], stroke: '#ccc', strokeWidth: 1 }" />
          </template>
          
          <template v-for="n in store.ringDimensions.height + 1" :key="'h'+n">
            <v-line v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width*scale, (n-1)*scale], stroke: '#ccc', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width*scale, (n-1)*scale], stroke: '#999', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'scentwork' && (n-1) % 5 === 0" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width*scale, (n-1)*scale], stroke: '#ccc', strokeWidth: 1 }" />
          </template>

          <template v-for="n in store.ringDimensions.width + 1" :key="'lx'+n">
            <v-text v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ x: (n-1)*scale, y: -20, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'center', width: 30, offsetX: 15 }" />
            <v-text v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ x: (n-1)*scale, y: -20, text: (n-1).toString(), fontSize: 10, fill: '#666', align: 'center', width: 30, offsetX: 15 }" />
            <v-text v-if="store.sport === 'scentwork' && (n-1) % 5 === 0" :config="{ x: (n-1)*scale, y: -20, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'center', width: 30, offsetX: 15 }" />
          </template>
          
          <template v-for="n in store.ringDimensions.height + 1" :key="'ly'+n">
            <v-text v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ x: -25, y: (n-1)*scale-6, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'right', width: 20 }" />
            <v-text v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ x: -25, y: (n-1)*scale-6, text: (n-1).toString(), fontSize: 10, fill: '#666', align: 'right', width: 20 }" />
            <v-text v-if="store.sport === 'scentwork' && (n-1) % 5 === 0" :config="{ x: -25, y: (n-1)*scale-6, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'right', width: 20 }" />
          </template>

          <AgilityLayer v-if="store.sport === 'agility'" :scale="scale" :dragBoundFunc="(pos) => ({ x: Math.round(pos.x / (scale/2))*(scale/2), y: Math.round(pos.y / (scale/2))*(scale/2) })" />
          
          <BarnHuntLayer v-if="store.sport === 'barnhunt'" :scale="scale" :showHides="showHides" :GRID_OFFSET="GRID_OFFSET" />

          <ScentWorkLayer v-if="store.sport === 'scentwork'" 
            :scale="scale" 
            :showHides="showHides" 
            :dragBoundFunc="(pos) => ({ x: Math.round(pos.x / (scale/2))*(scale/2), y: Math.round(pos.y / (scale/2))*(scale/2) })" 
          />
<v-rect v-if="selectionRect" 
           :config="{
             x: (selectionRect.x * scale),
             y: (selectionRect.y * scale),
             width: selectionRect.w * scale,
             height: selectionRect.h * scale,
             fill: 'rgba(0, 161, 255, 0.3)',
             stroke: '#00a1ff'
           }"
        />
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<style scoped>
/* (Existing Styles) */
.editor-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: #f0f0f0; }
.canvas-wrapper { flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 40px; background: #e0e0e0; box-shadow: inset 0 0 20px rgba(0,0,0,0.1); position: relative; }
.toast-notification { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; color: white; font-weight: bold; z-index: 2000; pointer-events: none; }
.toast-notification.error { background-color: #d32f2f; }
.toast-notification.success { background-color: #388e3c; }
.zoom-controls { position: fixed; bottom: 20px; right: 20px; background: white; padding: 5px; border-radius: 8px; display: flex; gap: 5px; z-index: 100; }
.zoom-controls button { width: 30px; height: 30px; cursor: pointer; }
</style>
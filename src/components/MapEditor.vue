<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useUserStore } from '../stores/userStore'
import EditorSidebar from './editor/EditorSidebar.vue'
import { usePrinter } from '@/composables/usePrinter'

// Sub-Layers
import AgilityLayer from './layers/AgilityLayer.vue'
import BarnHuntLayer from './layers/BarnHuntLayer.vue'

const store = useMapStore()
const userStore = useUserStore()

// Config
const scale = ref(40)
const GRID_OFFSET = 30 
const stageRef = ref(null) 
const wrapperRef = ref(null)
const showHides = ref(true)

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
  if (e.evt.button !== 0 || e.target !== e.target.getStage()) return
  
  const pointer = e.target.getStage().getPointerPosition()
  const x = (pointer.x - GRID_OFFSET) / scale.value
  const y = (pointer.y - GRID_OFFSET) / scale.value
  if (x < 0 || y < 0) return 

  // Delegate to store based on tool
  if (store.sport === 'barnhunt') {
    if (store.activeTool === 'bale') store.addBale(x, y)
    else if (store.activeTool === 'board') store.startDrawingBoard(x, y)
    else if (store.activeTool === 'startbox') store.addStartBox(x, y)
    else if (store.activeTool === 'dcmat') store.addDCMat(x, y)
    else if (store.activeTool === 'hide') store.addHide(x, y)
  } else if (store.sport === 'agility') {
    if (['jump', 'tunnel', 'weave', 'contact', 'table', 'aframe', 'dogwalk', 'teeter'].includes(store.activeTool)) {
      store.addAgilityObstacle(store.activeTool, x, y)
    }
  }
}

function handleStageMouseMove(e) {
  if (store.activeTool === 'board' && store.isDrawingBoard) {
    const pointer = e.target.getStage().getPointerPosition()
    store.updateDrawingBoard((pointer.x - GRID_OFFSET)/scale.value, (pointer.y - GRID_OFFSET)/scale.value)
  }
}

function handleStageMouseUp() {
  if (store.activeTool === 'board') store.stopDrawingBoard()
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

      <v-stage ref="stageRef" :config="stageConfig" @mousedown="handleStageMouseDown" @mousemove="handleStageMouseMove" @mouseup="handleStageMouseUp" @contextmenu.prevent>
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
          
          <template v-for="n in store.ringDimensions.width + 1" :key="'v'+n">
            <v-line v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height*scale], stroke: '#ccc', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ points: [(n-1)*scale, 0, (n-1)*scale, store.ringDimensions.height*scale], stroke: '#999', strokeWidth: 1 }" />
          </template>
          
          <template v-for="n in store.ringDimensions.height + 1" :key="'h'+n">
            <v-line v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width*scale, (n-1)*scale], stroke: '#ccc', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ points: [0, (n-1)*scale, store.ringDimensions.width*scale, (n-1)*scale], stroke: '#999', strokeWidth: 1 }" />
          </template>

          <template v-for="n in store.ringDimensions.width + 1" :key="'lx'+n">
            <v-text v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ x: (n-1)*scale, y: -20, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'center', width: 30, offsetX: 15 }" />
            <v-text v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ x: (n-1)*scale, y: -20, text: (n-1).toString(), fontSize: 10, fill: '#666', align: 'center', width: 30, offsetX: 15 }" />
          </template>
          
          <template v-for="n in store.ringDimensions.height + 1" :key="'ly'+n">
            <v-text v-if="store.sport === 'agility' && (n-1) % 10 === 0" :config="{ x: -25, y: (n-1)*scale-6, text: (n-1).toString(), fontSize: 12, fill: '#666', align: 'right', width: 20 }" />
            <v-text v-if="store.sport === 'barnhunt' && (n-1) % 2 === 0" :config="{ x: -25, y: (n-1)*scale-6, text: (n-1).toString(), fontSize: 10, fill: '#666', align: 'right', width: 20 }" />
          </template>

          <AgilityLayer v-if="store.sport === 'agility'" :scale="scale" :dragBoundFunc="(pos) => ({ x: Math.round(pos.x / (scale/2))*(scale/2), y: Math.round(pos.y / (scale/2))*(scale/2) })" />
          
          <BarnHuntLayer v-if="store.sport === 'barnhunt'" :scale="scale" :showHides="showHides" :GRID_OFFSET="GRID_OFFSET" />

        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<style scoped>
.editor-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: #f0f0f0; }
.canvas-wrapper { flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 40px; background: #e0e0e0; box-shadow: inset 0 0 20px rgba(0,0,0,0.1); position: relative; }
.toast-notification { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; color: white; font-weight: bold; z-index: 2000; pointer-events: none; }
.toast-notification.error { background-color: #d32f2f; }
.toast-notification.success { background-color: #388e3c; }
.zoom-controls { position: fixed; bottom: 20px; right: 20px; background: white; padding: 5px; border-radius: 8px; display: flex; gap: 5px; z-index: 100; }
.zoom-controls button { width: 30px; height: 30px; cursor: pointer; }
</style>
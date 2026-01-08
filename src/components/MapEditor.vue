<script setup>
import { ref, watch, nextTick } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useAutosave } from '@/composables/useAutosave'
import { usePrinter } from '@/composables/usePrinter'

// --- COMPOSABLES ---
import { useKeyboardShortcuts } from '@/composables/editor/useKeyboardShortcuts'
import { useCanvasControls } from '@/composables/editor/useCanvasControls'
import { useGridSystem } from '@/composables/editor/useGridSystem'
import { useExportTools } from '@/composables/editor/useExportTools'
import { useStageInteraction } from '@/composables/editor/useStageInteraction'

// Sub-Layers & Components
import EditorSidebar from './editor/EditorSidebar.vue'
import AgilityLayer from './layers/AgilityLayer.vue'
import BarnHuntLayer from './layers/BarnHuntLayer.vue'
import ScentWorkLayer from './layers/ScentWorkLayer.vue'
import MapLegend from './layers/MapLegend.vue'

// Setup
const store = useMapStore()
const userStore = useUserStore()
const wrapperRef = ref(null)
const stageRef = ref(null)
const GRID_OFFSET = 30
const showHides = ref(true)
const isPrinting = ref(false)

// Context Menu State
const contextMenu = ref({ visible: false, x: 0, y: 0 })

useAutosave(3000)

// 1. Keyboard
useKeyboardShortcuts(store)

// 2. Controls (Zoom/Fit)
const { scale, stageConfig, zoom, fitToScreen } = useCanvasControls(store, wrapperRef, GRID_OFFSET)

// 3. Grid Helpers
const { getWallStroke, getGridLabelX, getGridLabelY, getXAxisY, getYAxisX, getYAxisAlign } = useGridSystem(store, scale)

// 4. Export Tools
const { handleSaveMap, handleLibrarySave } = useExportTools(store, stageRef, scale, GRID_OFFSET)

// 5. Interaction (Mouse/Tools)
const { 
  selectionRect, 
  handleStageMouseDown, 
  handleStageMouseMove, 
  handleStageMouseUp, 
  handleDragStart 
} = useStageInteraction(store, scale, GRID_OFFSET)

// Watchers
watch(() => [store.sport, store.ringDimensions.width], () => { nextTick(fitToScreen) }, { immediate: true })

// Printer Logic
const { handlePrint: printLogic } = usePrinter(store, userStore, stageRef, scale)
async function handlePrint(withHides) {
  isPrinting.value = true
  showHides.value = withHides
  await nextTick()
  await printLogic(withHides)
  isPrinting.value = false
  setTimeout(() => { showHides.value = true }, 2000)
}

function handleStageContextMenu(e) {
  e.evt.preventDefault()
  
  // 1. Priority: Finish Measurement (consumes event)
  if (store.activeTool === 'measure' && store.activeMeasurement) {
    store.finishMeasurement()
    return
  }

  // 2. Only show menu on background click (not on objects)
  if (e.target !== e.target.getStage()) return

  // 3. Show Menu
  contextMenu.value = {
    visible: true,
    x: e.evt.clientX,
    y: e.evt.clientY
  }
}

// Close menu on any click inside the editor
function handleGlobalClick() {
  if (contextMenu.value.visible) contextMenu.value.visible = false
}
</script>

<template>
  <div class="editor-container" @click="handleGlobalClick">
    <EditorSidebar @print="handlePrint" @save-map="handleSaveMap" @save-library="handleLibrarySave" />

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

      <div 
        v-if="contextMenu.visible" 
        class="context-menu" 
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <button 
          @click="store.clearSelection()" 
          :disabled="store.selection.length === 0"
        >
          Deselect All
        </button>
        <button @click="fitToScreen">Fit to Screen</button>
      </div>

      <Transition name="slide-up">
        <div v-if="store.selection.length > 0" class="selection-bar">
          <span class="sel-count">{{ store.selection.length }} Selected</span>
          <button v-if="store.selection.length > 1" @click="store.rotateSelection()">🔄 Rotate Group</button>
          <button v-if="store.sport === 'barnhunt' && store.currentLayer === 1" @click="store.toggleAnchor()">⚓ Anchor</button>
          
          <div class="divider"></div>

          <button @click="store.clearSelection()">Deselect</button>
          
          <button @click="store.deleteSelection()" class="btn-delete">🗑️ Delete</button>
        </div>
      </Transition>

      <v-stage ref="stageRef" :config="stageConfig" 
        @mousedown="handleStageMouseDown" 
        @dragstart="handleDragStart"
        @mousemove="handleStageMouseMove" 
        @mouseup="handleStageMouseUp" 
        @contextmenu="handleStageContextMenu">
        
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">

          <template v-for="n in store.ringDimensions.width + 1" :key="'v'+n">
            <v-line v-if="store.sport === 'agility' && (n - 1) % 10 === 0" :config="{ points: [(n - 1) * scale, 0, (n - 1) * scale, store.ringDimensions.height * scale], stroke: '#ccc', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'barnhunt' && (n - 1) % 2 === 0" :config="{ points: [(n - 1) * scale, 0, (n - 1) * scale, store.ringDimensions.height * scale], stroke: '#999', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'scentwork' && (n - 1) % 5 === 0" :config="{ points: [(n - 1) * scale, 0, (n - 1) * scale, store.ringDimensions.height * scale], stroke: '#ccc', strokeWidth: 1 }" />
          </template>

          <template v-for="n in store.ringDimensions.height + 1" :key="'h'+n">
            <v-line v-if="store.sport === 'agility' && (n - 1) % 10 === 0" :config="{ points: [0, (n - 1) * scale, store.ringDimensions.width * scale, (n - 1) * scale], stroke: '#ccc', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'barnhunt' && (n - 1) % 2 === 0" :config="{ points: [0, (n - 1) * scale, store.ringDimensions.width * scale, (n - 1) * scale], stroke: '#999', strokeWidth: 1 }" />
            <v-line v-if="store.sport === 'scentwork' && (n - 1) % 5 === 0" :config="{ points: [0, (n - 1) * scale, store.ringDimensions.width * scale, (n - 1) * scale], stroke: '#ccc', strokeWidth: 1 }" />
          </template>

          <template v-for="n in store.ringDimensions.width + 1" :key="'lx'+n">
            <v-text v-if="(store.sport === 'agility' && (n-1)%10===0) || (store.sport === 'barnhunt' && (n-1)%2===0) || (store.sport === 'scentwork' && (n-1)%5===0)" 
              :config="{
                x: (n - 1) * scale, y: getXAxisY(),
                text: getGridLabelX(n - 1),
                fontSize: 10, fill: '#666', align: 'center', width: 30, offsetX: 15
              }" />
          </template>

          <template v-for="n in store.ringDimensions.height + 1" :key="'ly'+n">
            <v-text v-if="(store.sport === 'agility' && (n-1)%10===0) || (store.sport === 'barnhunt' && (n-1)%2===0) || (store.sport === 'scentwork' && (n-1)%5===0)"
              :config="{
                x: getYAxisX(), y: (n - 1) * scale - 6,
                text: getGridLabelY(n - 1),
                fontSize: 10, fill: '#666', align: getYAxisAlign(), width: 20
              }" />
          </template>

          <v-group v-if="store.sport === 'barnhunt'">
            <v-line :config="{ points: [0, 0, store.ringDimensions.width * scale, 0], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.top) }" />
            <v-line :config="{ points: [0, store.ringDimensions.height * scale, store.ringDimensions.width * scale, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.bottom) }" />
            <v-line :config="{ points: [0, 0, 0, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.left) }" />
            <v-line :config="{ points: [store.ringDimensions.width * scale, 0, store.ringDimensions.width * scale, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.right) }" />
          </v-group>

          <AgilityLayer v-if="store.sport === 'agility'" :scale="scale" :dragBoundFunc="(pos) => ({ x: Math.round(pos.x / (scale / 2)) * (scale / 2), y: Math.round(pos.y / (scale / 2)) * (scale / 2) })" />
          <BarnHuntLayer v-if="store.sport === 'barnhunt'" :scale="scale" :showHides="showHides" :GRID_OFFSET="GRID_OFFSET" />
          <ScentWorkLayer v-if="store.sport === 'scentwork'" :scale="scale" :showHides="showHides" :dragBoundFunc="(pos) => ({ x: Math.round(pos.x / (scale / 2)) * (scale / 2), y: Math.round(pos.y / (scale / 2)) * (scale / 2) })" />

          <v-group v-if="store.gate" @dblclick="() => { if(store.activeTool === 'delete') store.removeGate() }">
            <v-rect :config="{ x: store.gate.x * scale, y: store.gate.y * scale, width: 3 * scale, height: 6, offsetX: (3 * scale) / 2, offsetY: 3, rotation: store.gate.rotation, fill: 'white', stroke: 'black', strokeWidth: 2 }" />
            <v-text :config="{ x: store.gate.x * scale, y: store.gate.y * scale, text: 'GATE', fontSize: 10, fontStyle: 'bold', offsetX: 15, offsetY: -5, rotation: store.gate.rotation }" />
          </v-group>

          <v-rect v-if="selectionRect" :config="{ x: (selectionRect.x * scale), y: (selectionRect.y * scale), width: selectionRect.w * scale, height: selectionRect.h * scale, fill: 'rgba(0, 161, 255, 0.3)', stroke: '#00a1ff' }" />
          
          <MapLegend v-if="store.sport === 'barnhunt' && store.showMapStats && !isPrinting" :scale="scale" :GRID_OFFSET="GRID_OFFSET" />

        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<style scoped>
/* (Existing Styles) */
.editor-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: #f0f0f0; }
.canvas-wrapper { flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 40px; background: #e0e0e0; box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1); position: relative; }
.toast-notification { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; color: white; font-weight: bold; z-index: 2000; pointer-events: none; }
.toast-notification.error { background-color: #d32f2f; }
.toast-notification.success { background-color: #388e3c; }
.toast-notification.info { background-color: #2196f3; }
.zoom-controls { position: fixed; bottom: 20px; right: 20px; background: white; padding: 5px; border-radius: 8px; display: flex; gap: 5px; z-index: 100; }
.zoom-controls button { width: 30px; height: 30px; cursor: pointer; }

/* CONTEXT MENU */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  z-index: 3000;
  min-width: 120px;
}

.context-menu button {
  text-align: left;
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
}

.context-menu button:hover {
  background: #f5f5f5;
}

.context-menu button:disabled {
  color: #aaa;
  cursor: default;
  background: none;
}

/* FLOATING BAR (Updated) */
.selection-bar {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 8px 15px;
  border-radius: 30px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  border: 1px solid #ddd;
}

.sel-count {
  font-weight: bold;
  color: #555;
  font-size: 0.9rem;
  padding-right: 5px;
}

.selection-bar button {
  background: #f5f5f5;
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  color: #333;
}

.selection-bar button:hover {
  background: #e3f2fd;
  color: #1565c0;
}

.btn-delete { background: #ffebee !important; color: #c62828 !important; }
.btn-delete:hover { background: #ffcdd2 !important; }

/* Removed .btn-close style as it's no longer used */

.divider { width: 1px; height: 20px; background: #ddd; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translate(-50%, 20px); opacity: 0; }
</style>
<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useMapStore } from 'stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useAutosave } from 'services/autosaveService'
import { usePrinter } from 'services/printerService'

// --- COMPOSABLES ---
import { useKeyboardShortcuts } from '@/components/editor/logic/useKeyboardShortcuts'
import { useCanvasControls } from '@/components/editor/logic/useCanvasControls'
import { useGridSystem } from '@/components/editor/logic/useGridSystem'
import { useExportTools } from '@/components/editor/logic/useExportTools'
import { useStageInteraction } from '@/components/editor/logic/useStageInteraction'
import { useContextMenu } from '@/components/editor/logic/useContextMenu'



// Sub-Layers & Components
import EditorSidebar from './editor/EditorSidebar.vue'
import SelectionBar from './editor/SelectionBar.vue'

import BarnHuntLayer from './editor/BarnHuntLayer.vue'
import MapLegend from './editor/MapLegend.vue'
import EditNoteModal from 'modals/EditNoteModal.vue'
import HelpModal from 'modals/HelpModal.vue'
import HideContextMenu from './editor/hides/HideContextMenu.vue'

// Setup
const store = useMapStore()
const userStore = useUserStore()
const wrapperRef = ref(null)
const stageRef = ref(null)
const GRID_OFFSET = 30
const showHides = ref(true)
const isPrinting = ref(false)
const showHelpModal = ref(false)

useAutosave(3000)


const { scale, stageConfig, zoom, fitToScreen } = useCanvasControls(store, wrapperRef, GRID_OFFSET)
const { getWallStroke, getGridLabelX, getGridLabelY, getXAxisY, getYAxisX, getYAxisAlign } = useGridSystem(store, scale)
const { handleSaveMap, handleLibrarySave } = useExportTools(store, stageRef, scale, GRID_OFFSET)
const { selectionRect, handleStageMouseDown, handleStageMouseMove, 
        handleStageMouseUp, handleDragStart } = useStageInteraction(store, scale, GRID_OFFSET)
const { contextMenu, handleStageContextMenu, closeContextMenu } = useContextMenu(store)
const { handlePrint: printLogic } = usePrinter(store, userStore, stageRef, scale)

useKeyboardShortcuts(store, handleSaveMap)

watch(() => [store.sport, store.ringDimensions.width], () => { nextTick(fitToScreen) }, { immediate: true })
watch(() => store.activeHideMenu, (isOpen) => {
  if (isOpen) {
    closeContextMenu()
  }
})

function handleGlobalClick() {
  closeContextMenu()
}


async function handlePrint(options) {
  isPrinting.value = true
  
  // [CHECK] Extracting orientation here is correct
  const orientation = options.orientation || 'landscape' 
  
  showHides.value = options.withHides
  await nextTick()

  // [FIX] Ensure orientation is passed as the second argument explicitly
  await printLogic(options, orientation) 
  
  isPrinting.value = false
  setTimeout(() => { showHides.value = true }, 2000)
}

</script>

<template>
  <div class="editor-container" @click="handleGlobalClick">
    <EditorSidebar @print="handlePrint" @save-map="handleSaveMap" @save-library="handleLibrarySave" />

    <div class="canvas-wrapper" ref="wrapperRef">
      <EditNoteModal v-if="store.editingNoteId" />
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

      <button class="help-fab" @click="showHelpModal = true" title="Keyboard Shortcuts & Help">
        ?
      </button>

      <HelpModal :show="showHelpModal" @close="showHelpModal = false" />

      <SelectionBar />

      <div v-if="contextMenu.visible" class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <button @click="store.clearSelection()" :disabled="store.selection.length === 0">
          Deselect All
        </button>
        <button @click="fitToScreen">Fit to Screen</button>
      </div>

      <v-stage ref="stageRef" :config="stageConfig" @mousedown="handleStageMouseDown" @dragstart="handleDragStart"
        @mousemove="handleStageMouseMove" @mouseup="handleStageMouseUp" @contextmenu="handleStageContextMenu">

        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">

          <template v-for="n in store.ringDimensions.width + 1" :key="'v'+n">
            <v-line v-if="(n - 1) % store.gridStep === 0"
              :config="{ points: [(n - 1) * scale, 0, (n - 1) * scale, store.ringDimensions.height * scale], stroke: '#999', strokeWidth: 1 }" />
          </template>

          <template v-for="n in store.ringDimensions.height + 1" :key="'h'+n">
            <v-line v-if="(n - 1) % store.gridStep === 0"
              :config="{ points: [0, (n - 1) * scale, store.ringDimensions.width * scale, (n - 1) * scale], stroke: '#999', strokeWidth: 1 }" />
          </template>

          <template v-for="n in store.ringDimensions.width + 1" :key="'lx'+n">
            <v-text
              v-if="(n - 1) % store.gridStep === 0"
              :config="{
                x: (n - 1) * scale, y: getXAxisY(),
                text: getGridLabelX(n - 1),
                fontSize: 12, fill: '#666', align: 'center', width: 30, offsetX: 15
              }" />
          </template>

          <template v-for="n in store.ringDimensions.height + 1" :key="'ly'+n">
            <v-text
              v-if="(n - 1) % store.gridStep === 0"
              :config="{
                x: getYAxisX(), y: (n - 1) * scale - 6,
                text: getGridLabelY(n - 1),
                fontSize: 12, fill: '#666', align: getYAxisAlign(), width: 20
              }" />
          </template>

          <v-group>
            <v-line
              :config="{ points: [0, 0, store.ringDimensions.width * scale, 0], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.top), y: -getWallStroke(store.wallTypes.top) / 2, listening: false }" />
            <v-line
              :config="{ points: [0, store.ringDimensions.height * scale, store.ringDimensions.width * scale, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.bottom), y: getWallStroke(store.wallTypes.bottom) / 2, listening: false }" />
            <v-line
              :config="{ points: [0, 0, 0, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.left),  x: -getWallStroke(store.wallTypes.left) / 2, listening: false}" />
            <v-line
              :config="{ points: [store.ringDimensions.width * scale, 0, store.ringDimensions.width * scale, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.right), x: getWallStroke(store.wallTypes.right) / 2, listening: false }" />
          </v-group>

          <BarnHuntLayer :scale="scale" :showHides="showHides"
            :GRID_OFFSET="GRID_OFFSET" />

          <v-rect v-if="selectionRect"
            :config="{ x: (selectionRect.x * scale), y: (selectionRect.y * scale), width: selectionRect.w * scale, height: selectionRect.h * scale, fill: 'rgba(0, 161, 255, 0.3)', stroke: '#00a1ff' }" />

          <MapLegend v-if="store.showMapStats && !isPrinting" :scale="scale"
            :GRID_OFFSET="GRID_OFFSET" />

        </v-layer>
      </v-stage>
    </div>
    <HideContextMenu 
      v-if="store.activeHideMenu"
      :hideId="store.activeHideMenu.id"
      :x="store.activeHideMenu.x"
      :y="store.activeHideMenu.y"
      @close="store.closeHideMenu"
    />
  </div>
</template>

<style scoped>
/* (Existing Styles) */
.editor-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f0f0f0;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  /* INCREASED bottom padding from 40px to 150px to clear the selection bar */
  padding: 40px 40px 150px 40px;
  background: #e0e0e0;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
  position: relative;
}

.toast-notification {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  z-index: 2000;
  pointer-events: none;
}

.toast-notification.error {
  background-color: #d32f2f;
}

.toast-notification.success {
  background-color: #388e3c;
}

.toast-notification.info {
  background-color: #2196f3;
}

.zoom-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 5px;
  border-radius: 8px;
  display: flex;
  gap: 5px;
  z-index: 100;
}

.zoom-controls button {
  width: 30px;
  height: 30px;
  cursor: pointer;
}

/* CONTEXT MENU */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
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

.help-fab {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #2c3e50;
  color: white;
  border: 2px solid white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background-color 0.2s;
}

.help-fab:hover {
  background-color: #2196f3;
  transform: scale(1.1);
}
</style>
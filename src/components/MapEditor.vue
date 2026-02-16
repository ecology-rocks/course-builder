<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useMapStore } from 'stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useAutosave } from 'services/autosaveService'
import { useRouter } from 'vue-router'

// [KEEP] Legacy Printers
import { usePrinter } from 'services/printerService'
import { useBlindPrinter } from '@/services/blindPrinterService'
// [NEW] Unified Printer
import { useUnifiedPrinter } from '@/services/unifiedPrintService'

// --- COMPOSABLES ---
import { useKeyboardShortcuts } from '@/components/editor/logic/useKeyboardShortcuts'
import { useCanvasControls } from '@/components/editor/logic/useCanvasControls'
import { useGridSystem } from '@/components/editor/logic/useGridSystem'
import { useExportTools } from '@/components/editor/logic/useExportTools'
import { useStageInteraction } from '@/components/editor/logic/useStageInteraction'
import { useContextMenu } from '@/components/editor/logic/useContextMenu'
import { useCustomWalls } from '@/components/editor/walls/useCustomWalls'

// Sub-Layers & Components
import EditorSidebar from './editor/EditorSidebar.vue'
import SelectionBar from './editor/SelectionBar.vue'
import BarnHuntLayer from './editor/BarnHuntLayer.vue'
import MapLegend from './editor/MapLegend.vue'
import EditNoteModal from 'modals/EditNoteModal.vue'
import HelpModal from 'modals/HelpModal.vue'
import CustomizationModal from 'modals/CustomizationModal.vue'
import TournamentSetupModal from 'modals/TournamentSetupModal.vue'
import BlindManager from './editor/BlindManager.vue'
import SaveConfirmationModal from 'modals/SaveConfirmationModal.vue'
import PostPrintModal from 'modals/PostPrintModal.vue' // [NEW]
import AdvancedPrintModal from '@/components/modals/AdvancedPrintModal.vue'

// Context Menus
import StageContextMenu from './editor/StageContextMenu.vue'
import HideContextMenu from './editor/hides/HideContextMenu.vue'
import DCMatContextMenu from './editor/mats/DCMatContextMenu.vue'
import ZoneContextMenu from './editor/zones/ZoneContextMenu.vue'
import StepContextMenu from './editor/steps/StepContextMenu.vue'
import StartBoxContextMenu from './editor/mats/StartBoxContextMenu.vue'
import TunnelBoxContextMenu from './editor/boards/TunnelBoxContextMenu.vue'
import BaleContextMenu from './editor/bales/BaleContextMenu.vue'
import NoteContextMenu from './editor/annotations/NoteContextMenu.vue'
import WallContextMenu from './editor/walls/WallContextMenu.vue'

// Setup
const store = useMapStore()
const userStore = useUserStore()
const router = useRouter()
const wrapperRef = ref(null)
const stageRef = ref(null)
const GRID_OFFSET = 30
const showHides = ref(true)
const isPrinting = ref(false)
const showHelpModal = ref(false)
const showBlindSetup = ref(false)
const isBlindMode = ref(false)
const blindManagerRef = ref(null)
const showSaveModal = ref(false)
const showPostPrintModal = ref(false)
const sidebarRef = ref(null)
const pendingBlindExit = ref(false)
const isNewMap = computed(() => !store.currentMapId)
const pendingHomeExit = ref(false)
const showAdvancedPrintModal = ref(false)

const { getNearestSnapPoint, getAngleSnapPoint } = useCustomWalls(store)

useAutosave(3000)

const { scale, stageConfig, zoom, fitToScreen } = useCanvasControls(store, wrapperRef, GRID_OFFSET)
const { getWallStroke, getGridLabelX, getGridLabelY, getXAxisY, getYAxisX, getYAxisAlign } = useGridSystem(store, scale)
const { handleSaveMap, handleLibrarySave } = useExportTools(store, stageRef, scale, GRID_OFFSET)
const { selectionRect, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp, handleDragStart } = useStageInteraction(store, scale, GRID_OFFSET)
const { contextMenu, handleStageContextMenu, closeContextMenu } = useContextMenu(store)

// [KEEP] Legacy Hooks
const { handlePrint: printLogic } = usePrinter(store, userStore, stageRef, scale)
const { printBlinds } = useBlindPrinter(store, userStore, stageRef, scale)

// [NEW] Unified Hook
const { generatePrintJob } = useUnifiedPrinter(store, userStore, stageRef, scale, showHides)

useKeyboardShortcuts(store, handleSaveMap)

const activeDisplayHides = computed(() => {
  if (isBlindMode.value && blindManagerRef.value) {
    return blindManagerRef.value.currentDisplayHides
  }
  return store.hides
})


function resolvePostPrint(action, payload) {

  if (action === 'print-again') {
    showPostPrintModal.value = false
    // Trigger the modal inside the sidebar
    sidebarRef.value?.openAdvancedPrint()
    return
  }

  showPostPrintModal.value = false

  if (action === 'save-as-new') {
    // 1. Clear ID to force new creation
    store.currentMapId = null
    // 2. Update Name
    store.mapName = payload
    // 3. Save immediately
    handleSaveMap()
    // 4. Notify
    store.showNotification(`Starting new map: ${payload}`)
  } else if (action === 'reset') {
    if (confirm("Are you sure you want to clear the map? Any unsaved changes will be lost.")) {
      store.reset()
    }
  }
}

function handleBlindExitRequest() {
  pendingBlindExit.value = true
  showSaveModal.value = true
}

// [NEW] Handle Export Action from Modal
function resolveExport(newNamePayload) {
  // If user typed a name in the modal, apply it before exporting
  if (newNamePayload) store.mapName = newNamePayload
  
  // Trigger download
  store.exportMapToJSON()
  showSaveModal.value = false

  // 1. Blind Manager Exit
  if (pendingBlindExit.value) {
    isBlindMode.value = false
    pendingBlindExit.value = false
    store.showNotification("Map exported! Exiting Blind Manager.")
  }

  // 2. Dashboard Exit
  if (pendingHomeExit.value) {
    pendingHomeExit.value = false
    store.reset()
    router.push('/dashboard')
    store.showNotification("Map exported! Returning to Dashboard.")
  }
}

// --- SAVE INTERCEPTION LOGIC ---
function requestSave() {
  // ALWAYS open the modal now.
  // The Modal will decide whether to show "Step 1" (Overwrite/Copy) or "Step 2" (Name New Map)
  // based on the isNewMap prop we pass it.
  showSaveModal.value = true
}

// [NEW] Triggered by Sidebar Home Button
function handleGoHome() {
  // If user is Pro, we offer Safe Exit. 
  // If user is Free, we just warn/reset because they can't save anyway? 
  // Actually, Free users can export JSON. So let's show the modal but Discard might be their only option if they don't want to Upgrade.
  // For simplicity, we use the same flow.
  pendingHomeExit.value = true
  showSaveModal.value = true
}

// [NEW] Handle Discard Action
function resolveDiscard() {
  showSaveModal.value = false
  
  // Case 1: Exiting Blind Manager (Just close mode, keep map open)
  if (pendingBlindExit.value) {
    isBlindMode.value = false
    pendingBlindExit.value = false
    store.showNotification("Changes discarded. Exiting Blind Manager.")
    return
  }

  // Case 2: Exiting to Home (Reset map)
  if (pendingHomeExit.value) {
    pendingHomeExit.value = false
    store.reset()
    router.push('/dashboard')
  }
}

// [UPDATED] resolveSave to handle Dashboard Exit
function resolveSave(action, newNamePayload) {
  if (action === 'save-as-new') {
    store.currentMapId = null 
    if (newNamePayload) store.mapName = newNamePayload
  }
  
  handleSaveMap()
  showSaveModal.value = false

  // 1. Blind Manager Exit
  if (pendingBlindExit.value) {
    isBlindMode.value = false
    pendingBlindExit.value = false
    store.showNotification("Map saved! Exiting Blind Manager.")
  }

  // 2. [NEW] Dashboard Exit
  if (pendingHomeExit.value) {
    pendingHomeExit.value = false
    store.reset() // Clear memory after save
    router.push('/dashboard')
    store.showNotification("Map saved! Returning to Dashboard.")
  }
}

function handleBlindSetupStart(config) {
  store.initBlinds(config.numBlinds, config.generateRandoms)
  showBlindSetup.value = false
  isBlindMode.value = true
  store.closeAllMenus()
  store.setTool('select')
}

async function handleBlindSave() {
  // 1. FREE USER: Just exit (Keep changes in session memory)
  if (!userStore.isPro) {
    isBlindMode.value = false
    store.showNotification("Blinds kept in session (Unsaved)", "info")
    return
  }

  // 2. PRO USER:
  if (!store.currentMapId) {
    // If map is new/unsaved, trigger the Save Modal flow
    pendingBlindExit.value = true
    requestSave() // Opens the modal
  } else {
    // If map exists, just save and close
    await handleSaveMap()
    isBlindMode.value = false
    store.showNotification("Map & Blinds saved!")
  }
}

function handleOpenBlindManager() {
  if (store.mapData.blinds && store.mapData.blinds.length > 0) {
    isBlindMode.value = true
    store.closeAllMenus()
    store.setTool('select')
  } else {
    showBlindSetup.value = true
  }
}

function handleStageMenuClose() {
  closeContextMenu()
  store.setTool('select')
}

// [UPDATED] Cancel handler
function onSaveModalCancel() {
  showSaveModal.value = false
  pendingBlindExit.value = false
  pendingHomeExit.value = false // Reset this too
}

function handleGlobalClick(e) {
  if (store.activeTool === 'measure' || store.activeTool === 'measurePath') {
    return
  }

  if (e.target.closest('.toolbox')) return;

  const isAnyItemMenuOpen =
    store.activeBaleMenu ||
    store.activeDCMatMenu ||
    store.activeHideMenu ||
    store.activeStartBoxMenu ||
    store.activeStepMenu ||
    store.activeTunnelBoxMenu ||
    store.activeZoneMenu ||
    store.activeNoteMenu ||
    store.activeWallMenu

  if (isAnyItemMenuOpen) {
    store.setTool('select')
  }

  store.closeAllMenus()
}

function onStageMouseDown(e) {
  if (e.evt) {
    e.evt.stopPropagation();
  }

  // If in Blind Mode, divert click to BlindManager
  if (isBlindMode.value) {
    if (blindManagerRef.value) {
      blindManagerRef.value.handleCanvasClick(e, GRID_OFFSET, scale.value)
    }
    return
  }

  if (store.activeTool === 'measure' || store.activeTool === 'measurePath') {
    if (e.evt) e.evt.cancelBubble = true;
    handleStageMouseDown(e);
    return;
  }

  handleStageMouseDown(e)
}

watch(
  () => [
    store.activeBaleMenu,
    store.activeDCMatMenu,
    store.activeHideMenu,
    store.activeStartBoxMenu,
    store.activeStepMenu,
    store.activeTunnelBoxMenu,
    store.activeZoneMenu,
    store.activeNoteMenu
  ],
  (menus) => {
    if (menus.some(m => m !== null)) {
      closeContextMenu()
    }
  }
)

async function handleBatchPrint() {
  showAdvancedPrintModal.value = true
}

// [KEEP] Legacy Print Handler
async function handlePrint(options) {
  isPrinting.value = true
  const orientation = options.orientation || 'landscape'
  showHides.value = options.withHides
  await nextTick()

  try {
    await printLogic(options, orientation)
    // [NEW] Trigger Modal after successful print
    setTimeout(() => { showPostPrintModal.value = true }, 500)
  } catch (e) {
    console.error(e)
  } finally {
    isPrinting.value = false
    setTimeout(() => { showHides.value = true }, 2000)
  }
}

// [NEW] Advanced Print Handler
async function handleAdvancedPrint(config) {
  isPrinting.value = true
  try {
    await generatePrintJob(config)
    // [NEW] Trigger Modal after successful print
    setTimeout(() => { showPostPrintModal.value = true }, 500)
  } finally {
    isPrinting.value = false
  }
}
</script>

<template>
  <div class="editor-container" @click="handleGlobalClick">
    <EditorSidebar 
      ref="sidebarRef"
      v-if="!isBlindMode" 
      @print="handlePrint" 
      @advanced-print="handleAdvancedPrint"
      @save-map="requestSave" 
      @save-library="handleLibrarySave"
      @blind-setup="handleOpenBlindManager"
      @go-home="handleGoHome"  />

    <div class="canvas-wrapper" ref="wrapperRef" :class="{ 'is-anchor-mode': store.activeTool === 'anchor' }">
      <EditNoteModal v-if="store.editingNoteId" />
      <Transition name="fade">
        <div v-if="store.notification" class="toast-notification" :class="store.notification.type">
          {{ store.notification.message }}
        </div>
      </Transition>

      <div class="zoom-controls">
        <button @click.stop="zoom(5)">+</button>
        <span>{{ scale }}px</span>
        <button @click.stop="zoom(-5)">-</button>
        <button @click.stop="fitToScreen">Fit</button>
      </div>

      <button class="help-fab" @click.stop="showHelpModal = true" title="Keyboard Shortcuts & Help">
        ?
      </button>
      <MapLegend v-if="store.showMapStats && !isPrinting" class="stats-overlay" />
      <HelpModal :show="showHelpModal" @close="showHelpModal = false" />

      <SelectionBar v-if="!isBlindMode" />

      <StageContextMenu v-if="contextMenu.visible" :x="contextMenu.x" :y="contextMenu.y" @close="handleStageMenuClose"
        @fit-screen="fitToScreen" />

      <v-stage ref="stageRef" :config="stageConfig" @mousedown="onStageMouseDown" @dragstart="handleDragStart"
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
            <v-text v-if="(n - 1) % store.gridStep === 0" :config="{
              x: (n - 1) * scale, y: getXAxisY(),
              text: getGridLabelX(n - 1),
              fontSize: 12, fill: '#666', align: 'center', width: 30, offsetX: 15
            }" />
          </template>

          <template v-for="n in store.ringDimensions.height + 1" :key="'ly'+n">
            <v-text v-if="(n - 1) % store.gridStep === 0" :config="{
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
              :config="{ points: [0, 0, 0, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.left), x: -getWallStroke(store.wallTypes.left) / 2, listening: false }" />
            <v-line
              :config="{ points: [store.ringDimensions.width * scale, 0, store.ringDimensions.width * scale, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.right), x: getWallStroke(store.wallTypes.right) / 2, listening: false }" />
          </v-group>

          <BarnHuntLayer :scale="scale" :showHides="showHides" :hides="activeDisplayHides" :GRID_OFFSET="GRID_OFFSET"
            :locked="isBlindMode && !isPrinting" />
          <v-rect v-if="selectionRect"
            :config="{ x: (selectionRect.x * scale), y: (selectionRect.y * scale), width: selectionRect.w * scale, height: selectionRect.h * scale, fill: 'rgba(0, 161, 255, 0.3)', stroke: '#00a1ff' }" />

        </v-layer>
      </v-stage>
    </div>

    <HideContextMenu v-if="store.activeHideMenu" v-bind="store.activeHideMenu" :hideId="store.activeHideMenu.id"
      @close="store.activeHideMenu = null" />
    <DCMatContextMenu v-if="store.activeDCMatMenu" v-bind="store.activeDCMatMenu" :matId="store.activeDCMatMenu.id"
      @close="store.activeDCMatMenu = null" />
    <ZoneContextMenu v-if="store.activeZoneMenu" v-bind="store.activeZoneMenu" :zoneId="store.activeZoneMenu.id"
      @close="store.activeZoneMenu = null" />
    <StepContextMenu v-if="store.activeStepMenu" v-bind="store.activeStepMenu" :stepId="store.activeStepMenu.id"
      @close="store.activeStepMenu = null" />
    <StartBoxContextMenu v-if="store.activeStartBoxMenu" v-bind="store.activeStartBoxMenu"
      @close="store.activeStartBoxMenu = null" />
    <TunnelBoxContextMenu v-if="store.activeTunnelBoxMenu" v-bind="store.activeTunnelBoxMenu"
      @close="store.activeTunnelBoxMenu = null" />
    <BaleContextMenu v-if="store.activeBaleMenu" v-bind="store.activeBaleMenu" :id="store.activeBaleMenu.id"
      @close="store.activeBaleMenu = null" />
    <NoteContextMenu v-if="store.activeNoteMenu" v-bind="store.activeNoteMenu" :noteId="store.activeNoteMenu.id"
      @close="store.activeNoteMenu = null" />
    <WallContextMenu v-if="store.activeWallMenu" />
    <SaveConfirmationModal 
      v-if="showSaveModal" 
      :mapName="store.mapName"
      :isNewMap="isNewMap"
      :allowDiscard="pendingHomeExit || pendingBlindExit"
      @cancel="onSaveModalCancel"
      @overwrite="resolveSave('overwrite')"
      @save-as-new="(newName) => resolveSave('save-as-new', newName)"
      @discard="resolveDiscard"
      @export-json="(newName) => resolveExport(newName)" 
    />
    <PostPrintModal v-if="showPostPrintModal" :mapName="store.mapName" @cancel="showPostPrintModal = false"
      @save-as-new="(newName) => resolvePostPrint('save-as-new', newName)"
      @print-again="resolvePostPrint('print-again')" @reset="resolvePostPrint('reset')" />
    <CustomizationModal />
    <TournamentSetupModal v-if="showBlindSetup" @close="showBlindSetup = false" @start="handleBlindSetupStart" />
    <BlindManager v-if="isBlindMode" ref="blindManagerRef" @close="isBlindMode = false" @print="handleBatchPrint"
      @save="handleBlindSave" @exit-request="handleBlindExitRequest" />
      <AdvancedPrintModal 
      v-if="showAdvancedPrintModal" 
      @close="showAdvancedPrintModal = false" 
      @confirm="handleAdvancedPrint" 
    />
  </div>
</template>

<style scoped>
/* (Existing Styles Unchanged) */
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
  padding: 40px 40px 150px 40px;
  background: #e0e0e0;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
  position: relative;
}

/* Anchor Mode Cursor Override */
.canvas-wrapper.is-anchor-mode {
  cursor: crosshair !important;
}

/* Ensure inner Konva content also gets the cursor */
.canvas-wrapper.is-anchor-mode :deep(.konvajs-content) {
  cursor: crosshair !important;
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

.stats-overlay {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 90;
  max-width: 220px;
}
</style>
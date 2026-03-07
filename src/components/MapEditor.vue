<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useMapStore } from 'stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useAutosave } from 'services/autosaveService'
import { useRouter } from 'vue-router'

import { useUnifiedPrinter } from '@/services/unifiedPrintService'
import { useKeyboardShortcuts } from '@/components/editor/logic/useKeyboardShortcuts'
import { useCanvasControls } from '@/components/editor/logic/useCanvasControls'
import { useGridSystem } from '@/components/editor/logic/useGridSystem'
import { useExportTools } from '@/components/editor/logic/useExportTools'
import { useStageInteraction } from '@/components/editor/logic/useStageInteraction'
import { useContextMenu } from '@/components/editor/logic/useContextMenu'
import { useCustomWalls } from '@/components/editor/walls/useCustomWalls'
import { libraryService } from '@/services/libraryService'

// Sub-Layers & Components
import EditorSidebar from './editor/EditorSidebar.vue'
import SelectionBar from './editor/SelectionBar.vue'
import BarnHuntLayer from './editor/BarnHuntLayer.vue'
import MapLegend from './editor/MapLegend.vue'
import HelpModal from 'modals/HelpModal.vue'
import CustomizationModal from 'modals/CustomizationModal.vue'
import TournamentSetupModal from 'modals/TournamentSetupModal.vue'
import BlindManager from './editor/BlindManager.vue'
import SaveConfirmationModal from 'modals/SaveConfirmationModal.vue'
import PostPrintModal from 'modals/PostPrintModal.vue'
import AdvancedPrintModal from '@/components/modals/AdvancedPrintModal.vue'
import TunnelManager from './editor/tunnels/TunnelManager.vue'
import TunnelEditorLayer from './editor/tunnels/TunnelEditorLayer.vue'
import TunnelRenderer from './editor/tunnels/TunnelRenderer.vue'
import SaveToLibraryModal from '@/components/modals/SaveToLibraryModal.vue'

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
import TunnelContextMenu from './editor/tunnels/TunnelContextMenu.vue' // [NEW] Import this
import GateContextMenu from './editor/gates/GateContextMenu.vue'

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
const showLibrarySaveModal = ref(false)

const { getNearestSnapPoint, getAngleSnapPoint } = useCustomWalls(store)

useAutosave(3000)

const { scale, stageConfig, zoom, fitToScreen } = useCanvasControls(store, wrapperRef, GRID_OFFSET)
const { getWallStroke, getGridLabelX, getGridLabelY, getXAxisY, getYAxisX, getYAxisAlign } = useGridSystem(store, scale)
const { handleSaveMap, handleLibrarySave } = useExportTools(store, stageRef, scale, GRID_OFFSET)
const { selectionRect, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp, handleDragStart } = useStageInteraction(store, scale, GRID_OFFSET)
const { contextMenu, handleStageContextMenu, closeContextMenu } = useContextMenu(store)

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
    sidebarRef.value?.openAdvancedPrint()
    return
  }
  showPostPrintModal.value = false
  if (action === 'save-as-new') {
    store.currentMapId = null
    store.mapName = payload
    handleSaveMap()
    store.showNotification(`Starting new map: ${payload}`)
  } else if (action === 'reset') {
    if (confirm("Are you sure you want to clear the map? Any unsaved changes will be lost.")) {
      store.reset()
    }
  }
}

async function handleLibrarySaveConfirm({ name, category, isPublic }) {
  try {
    const stage = stageRef.value.getStage()
    const isSubset = ['tunnel', 'sequence', 'setup'].includes(category)
    const hasSelection = store.selection.length > 0
    
    // --- HELPER: Resolve Coordinates ---
    const resolvePoint = (pt) => {
      // 1. Already Static
      if (typeof pt.x === 'number' && typeof pt.y === 'number') return pt
      
      // 2. Resolve Anchor
      if (pt.type === 'edge-anchor' && pt.targetId) {
        const edge = store.mapData.boardEdges?.find(e => e.id === pt.targetId)
        if (edge) {
          return { 
            x: (edge.x1 + edge.x2) / 2, 
            y: (edge.y1 + edge.y2) / 2 
          }
        }
      }
      return null // Failed to resolve
    }

    // --- HELPER: Get Bounds ---
    const getObjectBounds = (obj) => {
      if (typeof obj.x === 'number' && typeof obj.y === 'number') {
        const w = obj.width || 3; const h = obj.height || 3
        return { x1: obj.x, y1: obj.y, x2: obj.x + w, y2: obj.y + h }
      }
      if (typeof obj.x1 === 'number' && typeof obj.x2 === 'number') {
        return {
          x1: Math.min(obj.x1, obj.x2), y1: Math.min(obj.y1, obj.y2),
          x2: Math.max(obj.x1, obj.x2), y2: Math.max(obj.y1, obj.y2)
        }
      }
      if (Array.isArray(obj.points)) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        let valid = false
        obj.points.forEach(rawPt => {
          const pt = resolvePoint(rawPt)
          if (pt) {
            valid = true
            minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y)
            maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y)
          }
        })
        if (valid) return { x1: minX, y1: minY, x2: maxX, y2: maxY }
      }
      return null
    }

    // --- 1. DETERMINE CAPTURE BOUNDS ---
    let captureBounds = null
    
    if (isSubset && hasSelection) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      let found = false

      Object.values(store.mapData).forEach(val => {
        const items = Array.isArray(val) ? val : (val && val.id ? [val] : [])
        items.forEach(item => {
          if (store.selection.includes(item.id)) {
            const b = getObjectBounds(item)
            if (b) {
              found = true
              minX = Math.min(minX, b.x1); minY = Math.min(minY, b.y1)
              maxX = Math.max(maxX, b.x2); maxY = Math.max(maxY, b.y2)
            }
          }
        })
      })
      
      if (found) {
        captureBounds = { 
          x1: minX - 2, y1: minY - 2, 
          x2: maxX + 2, y2: maxY + 2 
        }
      }
    }

    if (!captureBounds) {
      captureBounds = { 
        x1: 0, y1: 0, 
        x2: store.ringDimensions.width, y2: store.ringDimensions.height 
      }
    }

    // --- 2. GATHER DATA ---
    const dataPayload = {}
    
    // Check intersection
    const isInside = (item) => {
      // Always save explicitly selected items
      if (item.id && store.selection.includes(item.id)) return true
      
      // For arrays of points, check if points fall inside
      if (Array.isArray(item.points)) {
        return item.points.some(rawPt => {
          const pt = resolvePoint(rawPt)
          if (!pt) return false
          return (
            pt.x >= captureBounds.x1 && pt.x <= captureBounds.x2 &&
            pt.y >= captureBounds.y1 && pt.y <= captureBounds.y2
          )
        })
      }

      const b = getObjectBounds(item)
      if (!b) return false

      return (
        b.x1 < captureBounds.x2 &&
        b.x2 > captureBounds.x1 &&
        b.y1 < captureBounds.y2 &&
        b.y2 > captureBounds.y1
      )
    }

    Object.keys(store.mapData).forEach(key => {
      const val = store.mapData[key]
      
      if (Array.isArray(val)) {
        // [IMPORTANT] Deep clone items to avoid mutating the store later
        const filtered = val.filter(isInside).map(item => JSON.parse(JSON.stringify(item)))
        if (filtered.length > 0) dataPayload[key] = filtered
      } 
      else if (val && typeof val === 'object' && val.id) {
        if (isInside(val)) dataPayload[key] = JSON.parse(JSON.stringify(val))
      }
    })

    if (category === 'ring') {
      dataPayload.dimensions = store.ringDimensions
    }

    // --- 3. POST-PROCESSING: BAKE TUNNEL PATHS ---
    // This fixes the NaN errors by converting references to static coordinates
    if (dataPayload.tunnelPaths) {
      dataPayload.tunnelPaths.forEach(path => {
        if (path.points) {
          path.points = path.points.map(pt => {
            const resolved = resolvePoint(pt)
            if (resolved) {
              // Bake it to a static point so it loads without needing the edge ID
              return { type: 'static', x: resolved.x, y: resolved.y }
            }
            // Fallback for broken references to prevent NaN
            return { type: 'static', x: 0, y: 0 }
          })
        }
      })
    }

    // --- 4. GENERATE SCREENSHOT ---
    const screenshotData = stage.toDataURL({
      x: (captureBounds.x1 * scale.value) + GRID_OFFSET,
      y: (captureBounds.y1 * scale.value) + GRID_OFFSET,
      width: (captureBounds.x2 - captureBounds.x1) * scale.value,
      height: (captureBounds.y2 - captureBounds.y1) * scale.value,
      pixelRatio: 0.5,
      mimeType: 'image/jpeg',
      quality: 0.7
    })

    // --- 5. UPLOAD ---
    const finalItem = {
      name,
      sport: store.sport || 'barnhunt',
      type: category,
      thumbnail: screenshotData,
      data: dataPayload,
      isPublic: isPublic
    }

    await libraryService.addToLibrary(userStore.user, finalItem)
    store.showNotification("Saved to Library!", "success")
    showLibrarySaveModal.value = false

  } catch (e) {
    console.error(e)
    alert("Failed to save: " + e.message)
  }
}

function handleBlindExitRequest() {
  pendingBlindExit.value = true
  showSaveModal.value = true
}

function toggleGridStep() {
  store.gridStep = (store.gridStep === 1) ? 2 : 1
}

function resolveExport(newNamePayload) {
  if (newNamePayload) store.mapName = newNamePayload
  store.exportMapToJSON()
  showSaveModal.value = false
  if (pendingBlindExit.value) {
    isBlindMode.value = false
    pendingBlindExit.value = false
    store.showNotification("Map exported! Exiting Blind Manager.")
  }
  if (pendingHomeExit.value) {
    pendingHomeExit.value = false
    store.reset()
    router.push('/dashboard')
    store.showNotification("Map exported! Returning to Dashboard.")
  }
}

function requestSave() {
  showSaveModal.value = true
}

function handleGoHome() {
  pendingHomeExit.value = true
  showSaveModal.value = true
}

function resolveDiscard() {
  showSaveModal.value = false
  if (pendingBlindExit.value) {
    isBlindMode.value = false
    pendingBlindExit.value = false
    store.showNotification("Changes discarded. Exiting Blind Manager.")
    return
  }
  if (pendingHomeExit.value) {
    pendingHomeExit.value = false
    store.reset()
    router.push('/dashboard')
  }
}

function resolveSave(action, newNamePayload) {
  if (action === 'save-as-new') {
    store.currentMapId = null
    if (newNamePayload) store.mapName = newNamePayload
  }

  handleSaveMap()
  showSaveModal.value = false

  if (pendingBlindExit.value) {
    isBlindMode.value = false
    pendingBlindExit.value = false
    store.showNotification("Map saved! Exiting Blind Manager.")
  }

  if (pendingHomeExit.value) {
    pendingHomeExit.value = false
    store.reset()
    router.push('/dashboard')
    store.showNotification("Map saved! Returning to Dashboard.")
  }

  if (store.isTunnelMode) {
    store.isTunnelMode = false
  }
}

function handleTunnelExitRequest() {
  showSaveModal.value = true
}

function handleBlindSetupStart(config) {
  store.initBlinds(config.numBlinds, config.generateRandoms)
  showBlindSetup.value = false
  isBlindMode.value = true
  store.closeAllMenus()
  store.setTool('select')
}

async function handleBlindSave() {
  if (!userStore.isPro) {
    isBlindMode.value = false
    store.showNotification("Blinds kept in session (Unsaved)", "info")
    return
  }
  if (!store.currentMapId) {
    pendingBlindExit.value = true
    requestSave()
  } else {
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

function onSaveModalCancel() {
  showSaveModal.value = false
  pendingBlindExit.value = false
  pendingHomeExit.value = false
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
    store.activeWallMenu ||
    store.activeTunnelMenu ||
    store.activeGateMenu 

  if (isAnyItemMenuOpen) {
    store.setTool('select')
  }

  store.closeAllMenus()
}

function onStageMouseDown(e) {
  if (e.evt) {
    e.evt.stopPropagation();
  }

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
    store.activeNoteMenu,
    store.activeTunnelMenu,
    store.activeGateMenu,
    store.activeWallMenu 
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

async function handleAdvancedPrint(config) {
  isPrinting.value = true
  try {
    await generatePrintJob(config)
    setTimeout(() => { showPostPrintModal.value = true }, 500)
  } finally {
    isPrinting.value = false
  }
}

onMounted(() => {
  if (store.pendingPrintRequest) {
    store.pendingPrintRequest = false
    // Slight delay to ensure stage rendering is ready before the modal takes over
    setTimeout(() => {
      showAdvancedPrintModal.value = true
    }, 100)
  }
})
</script>

<template>
  <div class="editor-container" @click="handleGlobalClick">
    <EditorSidebar ref="sidebarRef" v-if="!isBlindMode && !store.isTunnelMode"
      @advanced-print="handleAdvancedPrint" @save-map="requestSave" @save-library="showLibrarySaveModal = true"
      @blind-setup="handleOpenBlindManager" @go-home="handleGoHome" />

    <div class="canvas-wrapper" ref="wrapperRef" :class="{ 'is-anchor-mode': store.activeTool === 'anchor' }">
      
      <Transition name="fade">
        <div v-if="store.notification" class="toast-notification" :class="store.notification.type">
          {{ store.notification.message }}
        </div>
      </Transition>

      <div class="zoom-controls">
        <button 
          class="grid-btn" 
          @click.stop="toggleGridStep" 
          title="Toggle between 1ft and 2ft grid lines"
        >
          Grid: {{ store.gridStep }}'
        </button>
        
        <div class="control-divider"></div>

        <button @click.stop="zoom(5)">+</button>
        <span class="zoom-label">{{ scale }}px</span>
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

          <TunnelRenderer :scale="scale" :isPrinting="isPrinting" />

          <v-rect v-if="selectionRect"
            :config="{ x: (selectionRect.x * scale), y: (selectionRect.y * scale), width: selectionRect.w * scale, height: selectionRect.h * scale, fill: 'rgba(0, 161, 255, 0.3)', stroke: '#00a1ff' }" />

        </v-layer>
        <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET, listening: true }">

          <TunnelEditorLayer v-if="store.isTunnelMode" :scale="scale" />

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

    <TunnelContextMenu v-if="store.activeTunnelMenu" v-bind="store.activeTunnelMenu" :id="store.activeTunnelMenu.id"
      @close="store.activeTunnelMenu = null"/>
      <GateContextMenu 
      v-if="store.activeGateMenu" 
      v-bind="store.activeGateMenu" 
      @close="store.activeGateMenu = null" 
    />

    <SaveConfirmationModal v-if="showSaveModal" :mapName="store.mapName" :isNewMap="isNewMap"
      :allowDiscard="pendingHomeExit || pendingBlindExit" @cancel="onSaveModalCancel"
      @overwrite="resolveSave('overwrite')" @save-as-new="(newName) => resolveSave('save-as-new', newName)"
      @discard="resolveDiscard" @export-json="(newName) => resolveExport(newName)" />
    <PostPrintModal v-if="showPostPrintModal" :mapName="store.mapName" @cancel="showPostPrintModal = false"
      @save-as-new="(newName) => resolvePostPrint('save-as-new', newName)"
      @print-again="resolvePostPrint('print-again')" @reset="resolvePostPrint('reset')" />
    <CustomizationModal />
    <TournamentSetupModal v-if="showBlindSetup" @close="showBlindSetup = false" @start="handleBlindSetupStart" />
    <BlindManager v-if="isBlindMode" ref="blindManagerRef" @close="isBlindMode = false" @print="handleBatchPrint"
      @save="handleBlindSave" @exit-request="handleBlindExitRequest" />
    <TunnelManager v-if="store.isTunnelMode" @close="handleTunnelExitRequest" />
    <SaveToLibraryModal 
  v-if="showLibrarySaveModal" 
  @close="showLibrarySaveModal = false" 
  @confirm="handleLibrarySaveConfirm" 
/>

    <AdvancedPrintModal v-if="showAdvancedPrintModal" @close="showAdvancedPrintModal = false"
      @confirm="handleAdvancedPrint" />
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
  padding: 5px 10px; /* Increased padding slightly */
  border-radius: 8px;
  display: flex;
  gap: 5px;
  z-index: 100;
  align-items: center; /* Ensure vertical centering */
  box-shadow: 0 2px 10px rgba(0,0,0,0.1); /* Optional polish */
}

.zoom-controls button {
  width: 30px;
  height: 30px;
  cursor: pointer;
  border: 1px solid #ddd; /* consistency */
  background: #f9f9f9;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-controls button:hover {
  background: #eee;
}

/* [INSERT] Specific styles for the grid button */
.grid-btn {
  width: auto !important; /* Override fixed width */
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}

.control-divider {
  width: 1px;
  height: 20px;
  background-color: #ddd;
  margin: 0 4px;
}

.zoom-label {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: center;
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
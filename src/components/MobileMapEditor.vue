<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useUnifiedPrinter } from '@/services/unifiedPrintService'
import { useCanvasControls } from '@/components/editor/logic/useCanvasControls'
import { useStageInteraction } from '@/components/editor/logic/useStageInteraction'
import BarnHuntLayer from '@/components/editor/BarnHuntLayer.vue'
import TunnelRenderer from '@/components/editor/tunnels/TunnelRenderer.vue'
import TunnelEditorLayer from '@/components/editor/tunnels/TunnelEditorLayer.vue'
import CourseSettingsModal from '@/components/modals/CourseSettingsModal.vue'
import AdvancedPrintModal from '@/components/modals/AdvancedPrintModal.vue'
import MobileStatsModal from '@/components/modals/MobileStatsModal.vue'
import CustomizationModal from '@/components/modals/CustomizationModal.vue'
import { useGridSystem } from '@/components/editor/logic/useGridSystem'
import { useCustomWalls } from '@/components/editor/walls/useCustomWalls'
import { useExportTools } from '@/components/editor/logic/useExportTools'
import SaveConfirmationModal from '@/components/modals/SaveConfirmationModal.vue'
import ShareMapModal from '@/components/modals/ShareMapModal.vue'
import LoadMapModal from '@/components/modals/LoadMapModal.vue'
import LibraryModal from '@/components/modals/LibraryModal.vue'
import BugReportModal from '@/components/common/BugReportModal.vue'
import MobileTunnelManager from '@/components/editor/tunnels/MobileTunnelManager.vue'
import MobileBlindManager from '@/components/editor/MobileBlindManager.vue'
import BlindEditorLayer from '@/components/editor/BlindEditorLayer.vue' // ADD THIS
// Import matching SVG icons
import IconLine from '@/assets/icons/measure-line.svg?component'
import IconPath from '@/assets/icons/measure-path.svg?component'
import IconBale from '@/assets/icons/bale-icon.svg?component'

const store = useMapStore()
const router = useRouter()
const wrapperRef = ref(null)
const stageRef = ref(null)
const GRID_OFFSET = 20
const userStore = useUserStore()
const showSettingsModal = ref(false)
const showAdvancedPrintModal = ref(false)
const showStatsModal = ref(false)
const showMoreMenu = ref(false)
const showSaveModal = ref(false)
const isNewMap = computed(() => !store.currentMapId)
const showShareModal = ref(false)
const showLoadModal = ref(false)
const showLibraryModal = ref(false)
const showBugReportModal = ref(false)
const blindManagerRef = ref(null)

const { scale, stageConfig, zoom, fitToScreen } = useCanvasControls(store, wrapperRef, GRID_OFFSET)
const { getNearestSnapPoint, getAngleSnapPoint } = useCustomWalls(store)
const { getWallStroke, getGridLabelX, getGridLabelY, getXAxisY, getYAxisX, getYAxisAlign } = useGridSystem(store, scale)
const { selectionRect, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp, handleDragStart } = useStageInteraction(store, scale, GRID_OFFSET)
const { generatePrintJob } = useUnifiedPrinter(store, userStore, stageRef, scale, null)
const { handleSaveMap } = useExportTools(store, stageRef, scale, GRID_OFFSET)


const displayHides = computed(() => {
    if (store.isBlindMode && store.mapData.blinds && store.mapData.blinds.length > 0) {
        return store.mapData.blinds[store.activeBlindIndex || 0].hides.map(h => ({...h}))
    }
    return store.hides
})

const selectionContext = computed(() => {
    if (store.selection.length !== 1) return null
    const id = store.selection[0]

    const bale = store.bales.find(b => b.id === id)
    if (bale) return { type: 'bale', data: bale }

    const hide = store.hides.find(h => h.id === id)
    if (hide) return { type: 'hide', data: hide }

    const tunnel = store.tunnelBoards.find(t => t.id === id)
    if (tunnel) return { type: 'tunnel', data: tunnel }

    const mat = store.dcMats.find(m => m.id === id)
    if (mat) return { type: 'mat', data: mat }

    const step = store.steps.find(s => s.id === id)
    if (step) return { type: 'step', data: step }

    const zone = store.zones.find(z => z.id === id)
    if (zone) return { type: 'zone', data: zone }

    if (store.startBox && store.startBox.id === id) return { type: 'startBox', data: store.startBox }

    // [NEW] Add Notes and Measurements
    const note = store.notes.find(n => n.id === id)
    if (note) return { type: 'note', data: note }

    const measurement = store.measurements.find(m => m.id === id)
    if (measurement) return { type: 'measurement', data: measurement }

    return { type: 'unknown', data: null }
})

const isNote = computed(() => selectionContext.value?.type === 'note')
const isMeasurement = computed(() => selectionContext.value?.type === 'measurement')

// Helpers for Template Readability
const isBale = computed(() => selectionContext.value?.type === 'bale')
const isHide = computed(() => selectionContext.value?.type === 'hide')
const isTunnel = computed(() => selectionContext.value?.type === 'tunnel')
const isMat = computed(() => selectionContext.value?.type === 'mat')
const isStep = computed(() => selectionContext.value?.type === 'step')
const isZone = computed(() => selectionContext.value?.type === 'zone')
const isStartBox = computed(() => selectionContext.value?.type === 'startBox')

let lastBlindClickTime = 0


const canToggleAnchor = computed(() => {
    if (!isBale.value) return false
    const b = selectionContext.value.data
    if (b.orientation === 'pillar') return false
    const rot = Math.abs(b.rotation) % 90
    if (rot !== 0) return false
    return true
})

function openCustomizer() {
    if (store.selection.length === 1) {
        store.editingCustomObject = store.selection[0]
        store.showCustomizationModal = true
    }
}

const hideTypes = [
    { label: 'Rat', value: 'rat', color: '#ef5350' },
    { label: 'Litter', value: 'litter', color: '#ffee58' },
    { label: 'Empty', value: 'empty', color: '#fff' }
]

function toggleMoreMenu() {
    showMoreMenu.value = !showMoreMenu.value
}
function openSettings() {
    showSettingsModal.value = true
    showMoreMenu.value = false
}
function openPrint() {
    showAdvancedPrintModal.value = true
    showMoreMenu.value = false
}
function toggleStats() {
    showStatsModal.value = true
    showMoreMenu.value = false
}
function handleAdvancedPrint(config) {
    generatePrintJob(config)
    showAdvancedPrintModal.value = false
}

// 2. Replace the old `tools` array with this computed property:
const allTools = [
    { id: 'select', icon: '👆', label: 'Select' },
    { id: 'wall', icon: '🧱', label: 'Ring Shape', layer1Only: true },
    { id: 'gate', icon: '🚪', label: 'Gate', layer1Only: true },
    { id: 'startbox', icon: '🏁', label: 'Start', layer1Only: true },
    { id: 'bale', isComponent: true, icon: IconBale, label: 'Bale' },
    { id: 'step', icon: '🪜', label: 'Step' },
    { id: 'tunnelboard', icon: '🟥', label: 'Board' },
    { id: 'dcmat', icon: '🟨', label: 'DC Mat', layer1Only: true },
    { id: 'dead', icon: '🚫', label: 'Dead Zone', layer1Only: true },
    { id: 'obstruction', icon: '🧱', label: 'Obstruction', layer1Only: true },
    { id: 'measure', isComponent: true, icon: IconLine, label: 'Line' },
    { id: 'measurePath', isComponent: true, icon: IconPath, label: 'Path' },
    { id: 'note', icon: '📝', label: 'Note (N)' },
    { id: 'rotate', icon: '🔄', label: 'Rotate (R)' },
    { id: 'delete', icon: '🗑️', label: 'Delete' }
]

const visibleTools = computed(() => {
    return allTools.filter(t => !t.layer1Only || store.currentLayer === 1)
})

const hasSelection = computed(() => store.selection.length > 0)

function toggleGridStep() {
    store.gridStep = (store.gridStep === 1) ? 2 : 1
}

function goBack() {
    router.push('/dashboard')
}

function handleSave() {
    // Just like on desktop, we trigger the Save Modal so users can name new maps, 
    // overwrite, or save as a copy.
    showSaveModal.value = true
}

function handleDelete() {
    store.deleteSelection()
}

function handleGlobalClick(e) {
    // Close the top-right "More" dropdown if the user taps anywhere else on the screen
    if (!e.target.closest('.more-menu-container')) {
        showMoreMenu.value = false
    }
}

function resolveSave(action, newNamePayload) {
    if (action === 'save-as-new') {
        store.currentMapId = null
        if (newNamePayload) store.mapName = newNamePayload
    }

    handleSaveMap()
    showSaveModal.value = false
    store.showNotification("Map saved!", "success")
}
</script>

<template>
    <div class="mobile-editor-container" @click="handleGlobalClick">
        <header class="mobile-top-bar">
            <div class="top-row">
                <button @click="goBack" class="icon-btn">←</button>
                <div class="map-title">{{ store.mapName }}</div>
                <div class="top-actions">
                    <button @click="store.undo" :disabled="!store.canUndo" class="icon-btn">↩</button>
                    <button @click="store.redo" :disabled="!store.canRedo" class="icon-btn">↪</button>

                    <div class="more-menu-container">
                        <button @click="toggleMoreMenu" class="icon-btn">⋮</button>
                        <div v-if="showMoreMenu" class="dropdown-menu">
                            <button @click="openSettings">⚙️ Settings</button>
                            <button @click="openPrint">🖨️ Print</button>
                            <button @click="toggleStats">📊 Stats</button>
                            <button @click="showLoadModal = true; showMoreMenu = false">📂 Load</button>
                            <button @click="showShareModal = true; showMoreMenu = false">🔗 Share</button>
                            <button @click="showLibraryModal = true; showMoreMenu = false">📖 Library</button>
                            <button @click="store.isTunnelMode = true; showMoreMenu = false">🚇 Tunnel Builder</button>
                            <button @click="store.isBlindMode = true; showMoreMenu = false">📋 Blind Manager</button>
                            <button @click="showBugReportModal = true; showMoreMenu = false">🐞 Report Bug</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bottom-row">
                <div class="layer-pills">
                    <button @click="store.currentLayer = 1" :class="{ active: store.currentLayer === 1 }">L1</button>
                    <button @click="store.currentLayer = 2" :class="{ active: store.currentLayer === 2 }">L2</button>
                    <button @click="store.currentLayer = 3" :class="{ active: store.currentLayer === 3 }">L3</button>
                </div>
                <button @click="handleSave" class="text-btn primary">💾 Save</button>
            </div>
        </header>

        <main class="mobile-canvas-wrapper" ref="wrapperRef">
            <div v-if="store.activeTool === 'measurePath' && store.activeMeasurement" class="floating-banner">
                <span class="banner-text">📍 Tap to add points</span>
                <button @click="store.finishMeasurement()" class="finish-path-btn">✅ Finish</button>
            </div>
            <div class="zoom-controls">
                <button class="grid-btn" @click.stop="toggleGridStep">
                    Grid: {{ store.gridStep }}'
                </button>
                <div class="control-divider"></div>
                <button @click.stop="zoom(5)">+</button>
                <span class="zoom-label">{{ scale }}px</span>
                <button @click.stop="zoom(-5)">-</button>
                <button @click.stop="fitToScreen">Fit</button>
            </div>
            <v-stage ref="stageRef" :config="stageConfig" 
                @mousedown="e => { if(!store.isBlindMode) handleStageMouseDown(e) }"
                @touchstart="e => { if(!store.isBlindMode) handleStageMouseDown(e) }" 
                @mousemove="handleStageMouseMove" 
                @touchmove="handleStageMouseMove"
                @mouseup="e => { if(!store.isBlindMode) handleStageMouseUp(e) }" 
                @touchend="e => { if(!store.isBlindMode) handleStageMouseUp(e) }" 
                @dragstart="handleDragStart">
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

                    <BarnHuntLayer :scale="scale" :showHides="true" :hides="displayHides" :GRID_OFFSET="GRID_OFFSET"
                        :locked="false" :isMobile="true" />



                    <v-rect v-if="selectionRect"
                        :config="{ x: (selectionRect.x * scale), y: (selectionRect.y * scale), width: selectionRect.w * scale, height: selectionRect.h * scale, fill: 'rgba(0, 161, 255, 0.3)', stroke: '#00a1ff' }" />
                </v-layer>

                <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
                    <v-group>
                        <TunnelRenderer :scale="scale" />
                    </v-group>
                    <TunnelEditorLayer v-if="store.isTunnelMode" :scale="scale" />
                    <BlindEditorLayer v-if="store.isBlindMode" :scale="scale" />
                </v-layer>


            </v-stage>
        </main>

        <<Transition name="slide-up">
            <aside v-if="hasSelection" class="mobile-bottom-sheet">
                <div class="sheet-header">
                    <span class="sheet-title">
                        {{ store.selection.length }} Selected
                        <button v-if="store.selection.length === 1" @click="openCustomizer" class="icon-btn ml-2"
                            title="Customize Style">🎨</button>
                    </span>
                    <button @click="store.clearSelection()" class="icon-btn">✕</button>
                </div>

                <div class="sheet-content">
                    <template v-if="store.selection.length > 1">
                        <div class="action-group mb-3">
                            <label>Rotate Group</label>
                            <div class="segmented-control">
                                <button @click="store.rotateSelection(45)">🔄 45°</button>
                                <button @click="store.rotateSelection(15)">🔄 15°</button>
                            </div>
                        </div>
                    </template>

                    <template v-else-if="selectionContext">
                        <div v-if="isBale" class="mobile-action-grid mb-3">
                            <div class="action-group">
                                <label>Orientation</label>
                                <div class="segmented-control">
                                    <button v-for="ot in ['flat', 'tall', 'pillar']" :key="ot"
                                        @click="store.setBaleOrientation(selectionContext.data.id, ot)"
                                        :class="{ active: selectionContext.data.orientation === ot }"
                                        :disabled="selectionContext.data.isAnchor">
                                        {{ ot.charAt(0).toUpperCase() + ot.slice(1) }}
                                    </button>
                                </div>
                            </div>
                            <div class="action-group">
                                <label>Lean</label>
                                <div class="segmented-control">
                                    <button @click="store.setLean(selectionContext.data.id, 'left')"
                                        :class="{ active: selectionContext.data.lean === 'left' }"
                                        :disabled="selectionContext.data.isAnchor">↖️</button>
                                    <button @click="store.setLean(selectionContext.data.id, null)"
                                        :class="{ active: !selectionContext.data.lean }"
                                        :disabled="selectionContext.data.isAnchor">⏺</button>
                                    <button @click="store.setLean(selectionContext.data.id, 'right')"
                                        :class="{ active: selectionContext.data.lean === 'right' }"
                                        :disabled="selectionContext.data.isAnchor">↗️</button>
                                </div>
                            </div>
                            <div class="action-group">
                                <label>Layer</label>
                                <div class="segmented-control">
                                    <button @click="store.setBaleLayer(selectionContext.data.id, 1)"
                                        :class="{ active: selectionContext.data.layer === 1 }">L1</button>
                                    <button @click="store.setBaleLayer(selectionContext.data.id, 2)"
                                        :class="{ active: selectionContext.data.layer === 2 }"
                                        :disabled="selectionContext.data.isAnchor">L2</button>
                                    <button @click="store.setBaleLayer(selectionContext.data.id, 3)"
                                        :class="{ active: selectionContext.data.layer === 3 }"
                                        :disabled="selectionContext.data.isAnchor">L3</button>
                                </div>
                            </div>
                            <div class="action-group">
                                <label>Actions</label>
                                <div class="segmented-control">
                                    <button @click="store.rotateBale(selectionContext.data.id, 45)">🔄 45°</button>
                                    <button @click="store.rotateBale(selectionContext.data.id, 15)">🔄 15°</button>
                                    <button @click="store.toggleAnchor(selectionContext.data.id)"
                                        :disabled="!canToggleAnchor"
                                        :class="{ active: selectionContext.data.isAnchor }">⚓ Anchor</button>
                                </div>
                            </div>
                        </div>

                        <div v-if="isHide" class="mobile-action-grid mb-3">
                            <div class="action-group">
                                <label>Type</label>
                                <div class="segmented-control">
                                    <button v-for="t in hideTypes" :key="t.value"
                                        @click="store.updateHide(selectionContext.data.id, { type: t.value })"
                                        :style="{ borderBottom: selectionContext.data.type === t.value ? `3px solid ${t.color}` : '3px solid transparent', background: selectionContext.data.type === t.value ? '#f0f0f0' : 'transparent' }">
                                        {{ t.label }}
                                    </button>
                                </div>
                            </div>
                            <div class="action-group">
                                <label>Placement</label>
                                <div class="segmented-control">
                                    <button
                                        @click="store.updateHide(selectionContext.data.id, { elevation: 'regular_over' })"
                                        :class="{ active: selectionContext.data.elevation === 'regular_over' }">Reg</button>
                                    <button @click="store.updateHide(selectionContext.data.id, { elevation: 'under' })"
                                        :class="{ active: selectionContext.data.elevation === 'under' }">Under</button>
                                </div>
                            </div>
                            <div class="action-group">
                                <label>Number</label>
                                <input type="number" min="1" max="8" :value="selectionContext.data.number"
                                    @input="e => store.updateHide(selectionContext.data.id, { number: parseInt(e.target.value) || null })"
                                    class="mobile-number-input" placeholder="-" />
                            </div>
                        </div>
                        <div v-if="isNote" class="action-group mb-3">
                            <button class="action-btn" @click="openCustomizer">📝 Edit Text & Style</button>
                        </div>

                        <div v-if="isMeasurement" class="action-group mb-3">
                            <p style="font-size: 0.85rem; color: #666; text-align: center; margin-bottom: 8px;">
                                Use the 🎨 button above to change line color and style.
                            </p>
                        </div>
                        <div class="action-group mb-3" v-if="isTunnel || isMat || isStartBox || isStep || isZone">
                            <label>Rotate</label>
                            <div class="segmented-control">
                                <button v-if="isTunnel"
                                    @click="store.rotateTunnelBoard(selectionContext.data.id, 45)">🔄 45°</button>
                                <button v-if="isTunnel"
                                    @click="store.rotateTunnelBoard(selectionContext.data.id, 15)">🔄 15°</button>

                                <button v-if="isMat" @click="store.rotateDCMat(selectionContext.data.id, 45)">🔄
                                    45°</button>
                                <button v-if="isMat" @click="store.rotateDCMat(selectionContext.data.id, 15)">🔄
                                    15°</button>

                                <button v-if="isStartBox" @click="store.rotateStartBox(45)">🔄 45°</button>
                                <button v-if="isStartBox" @click="store.rotateStartBox(15)">🔄 15°</button>

                                <button v-if="isStep" @click="store.rotateStep(selectionContext.data.id, 45)">🔄
                                    45°</button>
                                <button v-if="isStep" @click="store.rotateStep(selectionContext.data.id, 15)">🔄
                                    15°</button>

                                <button v-if="isZone" @click="store.rotateZone(selectionContext.data.id, 45)">🔄
                                    45°</button>
                                <button v-if="isZone" @click="store.rotateZone(selectionContext.data.id, 15)">🔄
                                    15°</button>
                            </div>
                        </div>
                    </template>

                    <button @click="store.deleteSelection()" class="danger-btn">🗑️ Delete Selected</button>
                </div>
            </aside>
            </Transition>

            <nav class="mobile-bottom-bar">
                <button v-for="tool in visibleTools" :key="tool.id" class="tool-btn"
                    :class="{ active: store.activeTool === tool.id }" @click="store.setTool(tool.id)">
                    <component v-if="tool.isComponent" :is="tool.icon" class="tool-icon svg-icon" />
                    <span v-else class="tool-icon">{{ tool.icon }}</span>
                    <span class="tool-label">{{ tool.label }}</span>
                </button>
            </nav>
            <MobileTunnelManager v-if="store.isTunnelMode" @close="store.isTunnelMode = false" />
            <MobileBlindManager v-if="store.isBlindMode" @close="store.isBlindMode = false" />
            <CourseSettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />

            <AdvancedPrintModal v-if="showAdvancedPrintModal" @close="showAdvancedPrintModal = false"
                @confirm="handleAdvancedPrint" />

            <MobileStatsModal v-if="showStatsModal" @close="showStatsModal = false" />

            <CustomizationModal v-if="store.showCustomizationModal" @close="store.showCustomizationModal = false" />

            <SaveConfirmationModal v-if="showSaveModal" :mapName="store.mapName" :isNewMap="isNewMap"
                :allowDiscard="false" @cancel="showSaveModal = false" @overwrite="resolveSave('overwrite')"
                @save-as-new="(newName) => resolveSave('save-as-new', newName)" />

            <ShareMapModal v-if="showShareModal" @close="showShareModal = false" />
            <LoadMapModal v-if="showLoadModal" @close="showLoadModal = false" />
            <LibraryModal v-if="showLibraryModal" @close="showLibraryModal = false" />
            <BugReportModal v-if="showBugReportModal" @close="showBugReportModal = false" />

    </div>

</template>



    <style scoped>

    /* 7. Add these styles to your <style scoped> block: */
    .floating-banner {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #fff9c4;
        border: 1px solid #fbc02d;
        padding: 8px 16px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .banner-text {
        font-size: 0.85rem;
        font-weight: bold;
        color: #f57f17;
        white-space: nowrap;
    }

    .finish-path-btn {
        background: #2196f3;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 6px 12px;
        font-weight: bold;
        font-size: 0.85rem;
        cursor: pointer;
    }

    .zoom-controls {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        padding: 6px;
        border-radius: 8px;
        display: flex;
        gap: 6px;
        z-index: 100;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        border: 1px solid #ddd;
    }

    .zoom-controls button {
        width: 32px;
        height: 32px;
        cursor: pointer;
        border: 1px solid #ccc;
        background: white;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1rem;
        color: #333;
    }

    .zoom-controls button:active {
        background: #e3f2fd;
        border-color: #2196f3;
        color: #2196f3;
    }

    .grid-btn {
        width: auto !important;
        padding: 0 10px;
        font-size: 0.8rem !important;
        white-space: nowrap;
    }

    .control-divider {
        width: 1px;
        height: 24px;
        background-color: #ccc;
        margin: 0 2px;
    }

    .zoom-label {
        font-size: 0.75rem;
        color: #666;
        min-width: 35px;
        text-align: center;
        font-weight: bold;
    }

    .sheet-title {
        display: flex;
        align-items: center;
    }

    .ml-2 {
        margin-left: 8px;
    }

    .mb-3 {
        margin-bottom: 16px;
    }

    .mobile-action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .action-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .action-group label {
        font-size: 0.75rem;
        font-weight: bold;
        color: #888;
        text-transform: uppercase;
    }

    .segmented-control {
        display: flex;
        background: #f5f5f5;
        border-radius: 8px;
        border: 1px solid #ddd;
        overflow: hidden;
    }

    .segmented-control button {
        flex: 1;
        padding: 8px 4px;
        background: transparent;
        border: none;
        border-right: 1px solid #ddd;
        font-size: 0.85rem;
        color: #555;
    }

    .segmented-control button:last-child {
        border-right: none;
    }

    .segmented-control button.active {
        background: #e3f2fd;
        color: #1565c0;
        font-weight: bold;
    }

    .segmented-control button:disabled {
        opacity: 0.4;
    }

    .action-btn {
        width: 100%;
        padding: 10px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-weight: bold;
        color: #333;
    }

    .mobile-number-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #f5f5f5;
        font-size: 1rem;
        text-align: center;
    }

    .mobile-editor-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        background: #f0f0f0;
    }

    .mobile-top-bar {
        display: flex;
        flex-direction: column;
        background: white;
        border-bottom: 1px solid #ddd;
        position: relative;
        z-index: 1000;
        /* Increased to stay above canvas */
    }

    .top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 50px;
        padding: 0 16px;
    }

    .bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 46px;
        padding: 0 16px;
        background: #fcfcfc;
        border-top: 1px solid #f0f0f0;
    }

    .map-title {
        font-weight: bold;
        font-size: 1.1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        text-align: center;
        margin: 0 10px;
    }

    .top-actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .icon-btn {
        background: none;
        border: none;
        font-size: 1.2rem;
        padding: 4px;
        cursor: pointer;
        color: #333;
    }

    .icon-btn:disabled {
        color: #ccc;
    }

    .text-btn.primary {
        color: white;
        background: #2196f3;
        font-weight: bold;
        border: none;
        border-radius: 4px;
        font-size: 0.9rem;
        padding: 6px 12px;
        cursor: pointer;
    }

    /* Layer Pills */
    .layer-pills {
        display: flex;
        background: #eee;
        border-radius: 6px;
        padding: 2px;
    }

    .layer-pills button {
        border: none;
        background: none;
        padding: 4px 12px;
        font-size: 0.85rem;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        color: #555;
    }

    .layer-pills button.active {
        background: white;
        color: #2196f3;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Dropdown Menu */
    .more-menu-container {
        position: relative;
    }

    .dropdown-menu {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        min-width: 150px;
        overflow: hidden;
    }

    .dropdown-menu button {
        padding: 12px 16px;
        text-align: left;
        background: none;
        border: none;
        border-bottom: 1px solid #f0f0f0;
        font-size: 0.95rem;
        color: #333;
        cursor: pointer;
    }

    .dropdown-menu button:last-child {
        border-bottom: none;
    }

    .dropdown-menu button:active {
        background: #f5f5f5;
    }

    /* Canvas Area */
    .mobile-canvas-wrapper {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: #e0e0e0;
    }

    /* Bottom Toolbar */
    .mobile-bottom-bar {
        display: flex;
        align-items: center;
        height: 72px;
        background: white;
        border-top: 1px solid #ddd;
        padding-bottom: env(safe-area-inset-bottom);
        z-index: 10;

        /* Make it scrollable */
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
    }

    /* Hide scrollbar for a cleaner look */
    .mobile-bottom-bar::-webkit-scrollbar {
        display: none;
    }

    .tool-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: #666;
        flex: 0 0 72px;
        /* Fixed width for each tool */
        height: 100%;
        padding: 8px 4px;
    }

    .tool-btn.active {
        color: #2196f3;
        background: #e3f2fd;
        border-top: 3px solid #2196f3;
    }

    .tool-icon {
        font-size: 1.5rem;
        margin-bottom: 4px;
    }

    .svg-icon {
        width: 24px;
        height: 24px;
        fill: currentColor;
    }

    .tool-label {
        font-size: 0.7rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
        text-align: center;
    }

    /* Bottom Sheet */
    .mobile-bottom-sheet {
        position: absolute;
        bottom: 64px;
        /* Above toolbar */
        left: 0;
        right: 0;
        background: white;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
        padding: 16px;
        z-index: 20;
    }

    .sheet-header {
        display: flex;
        justify-content: space-between;
        font-weight: bold;
        border-bottom: 1px solid #eee;
        padding-bottom: 8px;
        margin-bottom: 16px;
    }

    .danger-btn {
        width: 100%;
        padding: 12px;
        background: #ffebee;
        color: #d32f2f;
        border: 1px solid #ffcdd2;
        border-radius: 8px;
        font-weight: bold;
    }

    /* Transitions */
    .slide-up-enter-active,
    .slide-up-leave-active {
        transition: transform 0.3s ease;
    }

    .slide-up-enter-from,
    .slide-up-leave-to {
        transform: translateY(100%);
    }
</style>
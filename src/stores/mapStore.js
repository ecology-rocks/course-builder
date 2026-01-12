import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './userStore'
import { BH_RULES, AGILITY_RULES } from '../utils/validation'

// IMPORT MODULES
import { useMapPersistence } from './mapActions/persistence'
import { useSelectionLogic } from './mapActions/selection'
import { useBarnHuntLogic } from './mapActions/barnHuntLogic'
import { useAgilityLogic } from './mapActions/agilityLogic'
import { useScentWorkLogic } from './mapActions/scentWorkLogic'
import { useHistory } from './mapActions/history'
import { useMeasurements } from './mapActions/useMeasurements'
import { useNotes } from './mapActions/useNotes'
import { useTunnelBoards } from './mapActions/useTunnelBoards'

// ==========================================
// 0. CONSTANTS & STRATEGIES
// ==========================================

// This acts as the "Schema" for your map. 
const DEFAULT_MAP_DATA = {
  bales: [],
  boardEdges: [], 
  hides: [],
  dcMats: [],
  agilityObstacles: [],
  scentWorkObjects: [],
  steps: [],
  zones: [],
  tunnelBoards: [],
  markers: [],
  notes: [],
  masterBlinds: [],
  startBox: null, 
  gate: null,     
  measurements: [],
}

// Logic for how different objects behave when the ring shrinks
const RESIZE_STRATEGIES = {
  bales: (b, w, h) => { 
    if (b.x >= w) b.x = w - 3.5; 
    if (b.y >= h) b.y = h - 3.5 
  },
  boardEdges: (b, w, h) => {
    if (b.x1 > w) b.x1 = w; if (b.x2 > w) b.x2 = w;
    if (b.y1 > h) b.y1 = h; if (b.y2 > h) b.y2 = h;
  },
  agilityObstacles: (o, w, h) => {
    if (o.x >= w) o.x = w - 5; if (o.y >= h) o.y = h - 5
  },
  scentWorkObjects: (o, w, h) => {
    if (o.x >= w) o.x = w - 3; if (o.y >= h) o.y = h - 3
  },
  default: (o, w, h) => {
    if (o.x && o.x >= w) o.x = w - 1;
    if (o.y && o.y >= h) o.y = h - 1;
  }
}

export const useMapStore = defineStore('map', () => {
  const userStore = useUserStore()

  // ==========================================
  // 1. STATE DEFINITIONS
  // ==========================================
  
  // A. The Unified Map Data
  const mapData = ref(JSON.parse(JSON.stringify(DEFAULT_MAP_DATA)))

  // B. Settings & Metadata
  const ringDimensions = ref({ width: 24, height: 24 })
  const gridSize = ref(20) 
  const currentMapId = ref(null) 
  const mapName = ref("Untitled Map")
  const isShared = ref(false)
  const folders = ref([]) 
  const currentFolderId = ref(null) 
  const classLevel = ref('Novice') 
  const sport = ref('barnhunt')
  const notification = ref(null)
  const showMapStats = ref(true)
  const previousClassCount = ref(0)
  const activeMeasurement = ref(null)
  const editingNoteId = ref(null)

  // Configs
  const wallTypes = ref({ top: 'fence', right: 'fence', bottom: 'fence', left: 'fence' })
  const gridStartCorner = ref('top-left')
  const trialLocation = ref('') 
  const trialDay = ref('')      
  const trialNumber = ref('')   
  const baleConfig = ref({ length: 3, width: 1.5, height: 1.2 }) 
  const dcMatConfig = ref({ width: 2, height: 3 }) 


  // Editor State
  const savedMaps = ref([])
  const comparisonMapName = ref(null)
  const previousBales = ref([])
  const clipboard = ref([])
  const currentLayer = ref(1)
  const selectedBaleId = ref(null)
  const selection = ref([]) 
  const isDraggingSelection = ref(false)
  const activeTool = ref('bale')
  const nextNumber = ref(1) 
  const isDrawingBoard = ref(false) 

  // ==========================================
  // 2. ACTIONS (Internal & External)
  // ==========================================

  function showNotification(message, type = 'info') {
    notification.value = { message, type }
    setTimeout(() => { notification.value = null }, 3000)
  }

function openNoteEditor(id) {
    editingNoteId.value = id
  }

  function closeNoteEditor() {
    editingNoteId.value = null
  }

  function reset() {
    mapData.value = JSON.parse(JSON.stringify(DEFAULT_MAP_DATA))

    currentMapId.value = null; mapName.value = "Untitled Map"; 
    classLevel.value = "Novice"; sport.value = 'barnhunt'
    ringDimensions.value = { width: 24, height: 24 }
    currentLayer.value = 1; activeTool.value = 'bale'; nextNumber.value = 1
    selection.value = []; previousBales.value = []; comparisonMapName.value = null
    
    wallTypes.value = { top: 'fence', right: 'fence', bottom: 'fence', left: 'fence' }
    gridStartCorner.value = 'top-left'
    trialLocation.value = ''; trialDay.value = ''; trialNumber.value = ''
    baleConfig.value = { length: 3, width: 1.5, height: 1 }
    dcMatConfig.value = { width: 2, height: 3 }
    activeMeasurement.value = null
    editingNoteId.value = null
  }

 function resizeRing(width, height) {
    const oldW = ringDimensions.value.width
    const oldH = ringDimensions.value.height
    const newW = Math.max(10, parseInt(width))
    const newH = Math.max(10, parseInt(height))
    
    const dX = newW - oldW
    const dY = newH - oldH
    
    ringDimensions.value = { width: newW, height: newH }
    
    const shouldShiftX = gridStartCorner.value.includes('right')
    const shouldShiftY = gridStartCorner.value.includes('bottom')

    Object.keys(mapData.value).forEach(key => {
      const itemOrList = mapData.value[key]
      if (!itemOrList) return 

      const strategy = RESIZE_STRATEGIES[key] || RESIZE_STRATEGIES.default
      
      const updateItem = (item) => {
        if (shouldShiftX) {
            if (item.x1 !== undefined) { item.x1 += dX; item.x2 += dX } 
            else { item.x += dX }
        }
        if (shouldShiftY) {
            if (item.y1 !== undefined) { item.y1 += dY; item.y2 += dY } 
            else { item.y += dY }
        }
        strategy(item, newW, newH)
      }

      if (Array.isArray(itemOrList)) {
        itemOrList.forEach(updateItem)
      } else {
        updateItem(itemOrList)
      }
    })
    
    if (stateRefs.validateAllBales) stateRefs.validateAllBales()
  }

  function setTool(tool) { activeTool.value = tool }

  function toggleAnchor() {
    if (selection.value.length === 0) return
    if (currentLayer.value !== 1) {
      showNotification("Anchor bales must be on Layer 1.", "error")
      return
    }
    mapData.value.bales.forEach(b => {
      if (selection.value.includes(b.id)) {
        b.isAnchor = !b.isAnchor
      }
    })
  }

  function setComparisonBales(bales, name = "Custom Map") {
    previousBales.value = JSON.parse(JSON.stringify(bales))
    comparisonMapName.value = name
  }

  // ==========================================
  // 3. MODULE INITIALIZATION (The Adapter Layer)
  // ==========================================
  
  const createMapRef = (key) => computed({
    get: () => mapData.value[key],
    set: (val) => mapData.value[key] = val
  })

  const stateRefs = {
    mapData,
    bales: createMapRef('bales'),
    boardEdges: createMapRef('boardEdges'),
    hides: createMapRef('hides'),
    dcMats: createMapRef('dcMats'),
    agilityObstacles: createMapRef('agilityObstacles'),
    scentWorkObjects: createMapRef('scentWorkObjects'),
    steps: createMapRef('steps'),
    zones: createMapRef('zones'),
    markers: createMapRef('markers'),
    masterBlinds: createMapRef('masterBlinds'),
    startBox: createMapRef('startBox'),
    notes: createMapRef('notes'),
    tunnelBoards: createMapRef('tunnelBoards'),
    gate: createMapRef('gate'),
    measurements: createMapRef('measurements'), 
    activeMeasurement, 

    gridSize, activeTool, previousClassCount,
    ringDimensions, mapName, currentMapId, currentFolderId, 
    isShared, classLevel, sport, savedMaps, folders,
    isDrawingBoard, currentLayer, selectedBaleId,
    wallTypes, gridStartCorner, clipboard, previousBales, markers: createMapRef('markers'),
    comparisonMapName, showMapStats, selection, nextNumber,
    trialLocation, trialDay, trialNumber, baleConfig, dcMatConfig,

    reset
  }
  
  const historyModule = useHistory(stateRefs, () => {
    if (stateRefs.validateAllBales) stateRefs.validateAllBales()
  })
  
  stateRefs.snapshot = historyModule.snapshot

  const bhLogic = useBarnHuntLogic(stateRefs, historyModule.snapshot, { show: showNotification })
  const agLogic = useAgilityLogic(stateRefs, historyModule.snapshot)
  const swLogic = useScentWorkLogic(stateRefs, historyModule.snapshot)
  const measureLogic = useMeasurements(stateRefs, historyModule.snapshot)
  const notesLogic = useNotes(stateRefs, historyModule.snapshot)
  const tunnelBoardsLogic = useTunnelBoards(stateRefs, historyModule.snapshot)

  // =========================================================
  // DISABLED VALIDATION (User Request)
  // We point validation to an empty function so it never runs.
  // =========================================================
  stateRefs.validateAllBales = () => {} 

  const persistence = useMapPersistence(stateRefs, userStore, { show: showNotification })
  
  // Passed empty function to selection logic too, just in case
  const selectionLogic = useSelectionLogic(stateRefs, historyModule.snapshot, () => {})


  function copySelection() {
    const ids = selection.value
    if (ids.length === 0) return

    const itemsToCopy = []
    Object.keys(mapData.value).forEach(key => {
      const collection = mapData.value[key]
      if (Array.isArray(collection)) {
        collection.forEach(item => {
          if (ids.includes(item.id)) {
            itemsToCopy.push({ ...item, _type: key })
          }
        })
      }
    })
    
    clipboard.value = itemsToCopy
    showNotification(`Copied ${itemsToCopy.length} items`)
  }

  function pasteSelection() {
    if (clipboard.value.length === 0) return
    
    selection.value = [] // Clear selection to focus on new items
    
    clipboard.value.forEach(clipItem => {
      const type = clipItem._type
      if (!mapData.value[type]) return

      // Clone and assign new ID
      const newItem = JSON.parse(JSON.stringify(clipItem))
      newItem.id = crypto.randomUUID()
      
      // Offset slightly
      if (newItem.x !== undefined) newItem.x += 1
      if (newItem.y !== undefined) newItem.y += 1
      if (newItem.x1 !== undefined) { 
        newItem.x1 += 1; newItem.x2 += 1; 
        newItem.y1 += 1; newItem.y2 += 1; 
      }

      delete newItem._type

      if (Array.isArray(mapData.value[type])) {
        mapData.value[type].push(newItem)
        selection.value.push(newItem.id)
      }
    })
    
    historyModule.snapshot()
  }

  function cutSelection() {
    copySelection()
    selectionLogic.deleteSelection()
  }
  // ==========================================
  // 4. EXPORTS
  // ==========================================
  return {
    mapData,

    // Legacy State (Computed Wrappers)
    bales: stateRefs.bales,
    boardEdges: stateRefs.boardEdges,
    hides: stateRefs.hides,
    dcMats: stateRefs.dcMats,
    startBox: stateRefs.startBox,
    gate: stateRefs.gate,
    notes: stateRefs.notes,
    steps: stateRefs.steps,
    zones: stateRefs.zones,
    agilityObstacles: stateRefs.agilityObstacles,
    scentWorkObjects: stateRefs.scentWorkObjects,
    markers: stateRefs.markers,
    masterBlinds: stateRefs.masterBlinds,
    tunnelBoards: stateRefs.tunnelBoards,

    // Settings & Meta
    ringDimensions, gridSize, currentLayer, selectedBaleId, activeTool,
    nextNumber, notification, currentMapId, mapName, isShared,
    classLevel, sport, folders, currentFolderId,
    selection, isDraggingSelection, clipboard, previousBales, 
    wallTypes, gridStartCorner, trialLocation, trialDay, 
    trialNumber, baleConfig, comparisonMapName, dcMatConfig, showMapStats,
    isDrawingBoard, savedMaps,previousClassCount,

    editingNoteId, openNoteEditor, closeNoteEditor,

    measurements: stateRefs.measurements,
    activeMeasurement,

    // Actions
    setTool, reset, showNotification, resizeRing, toggleAnchor, setComparisonBales,
    copySelection, pasteSelection, cutSelection,
    
    currentGuidelines: computed(() => sport.value === 'agility' ? (AGILITY_RULES[classLevel.value] || AGILITY_RULES['Other']) : (BH_RULES[classLevel.value] || BH_RULES['Other'])),

    ...historyModule,
    ...bhLogic,
    ...agLogic,
    ...swLogic,
    ...persistence,
    ...selectionLogic,
    ...measureLogic,
    ...notesLogic,
    ...tunnelBoardsLogic,
    
    // OVERRIDE: Explicitly disable validation here too
    validateAllBales: () => {} 
  }
})
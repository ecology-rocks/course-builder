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

// ==========================================
// 0. CONSTANTS & STRATEGIES
// ==========================================

// This acts as the "Schema" for your map. 
// To add a new object type, you only need to add it here.
const DEFAULT_MAP_DATA = {
  bales: [],
  boardEdges: [], // Walls
  hides: [],
  dcMats: [],
  agilityObstacles: [],
  scentWorkObjects: [],
  steps: [],
  zones: [],
  markers: [],
  masterBlinds: [],
  startBox: null, // Singleton (Object or null)
  gate: null,     // Singleton (Object or null)
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
  // Default for simple point objects (hides, steps, startBox, etc)
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
  
  // Configs
  const wallTypes = ref({ top: 'fence', right: 'fence', bottom: 'fence', left: 'fence' })
  const gridStartCorner = ref('top-left')
  const trialLocation = ref('') 
  const trialDay = ref('')      
  const trialNumber = ref('')   
  const baleConfig = ref({ length: 3, width: 1.5, height: 1 }) 
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

  function reset() {
    // 1. Reset Map Objects (Deep Copy Default)
    mapData.value = JSON.parse(JSON.stringify(DEFAULT_MAP_DATA))

    // 2. Reset Editor State & Metadata
    currentMapId.value = null; mapName.value = "Untitled Map"; 
    classLevel.value = "Novice"; sport.value = 'barnhunt'
    ringDimensions.value = { width: 24, height: 24 }
    currentLayer.value = 1; activeTool.value = 'bale'; nextNumber.value = 1
    selection.value = []; previousBales.value = []; comparisonMapName.value = null
    
    // 3. Reset Settings
    wallTypes.value = { top: 'fence', right: 'fence', bottom: 'fence', left: 'fence' }
    gridStartCorner.value = 'top-left'
    trialLocation.value = ''; trialDay.value = ''; trialNumber.value = ''
    baleConfig.value = { length: 3, width: 1.5, height: 1 }
    dcMatConfig.value = { width: 2, height: 3 }
  }

 function resizeRing(width, height) {
    const oldW = ringDimensions.value.width
    const oldH = ringDimensions.value.height
    const newW = Math.max(10, parseInt(width))
    const newH = Math.max(10, parseInt(height))
    
    // 1. Calculate the change in size
    const dX = newW - oldW
    const dY = newH - oldH
    
    ringDimensions.value = { width: newW, height: newH }
    
    // 2. Determine shift direction based on "Grid Start Corner"
    // If grid starts on Right, we shift objects to keep them relative to the Right wall
    const shouldShiftX = gridStartCorner.value.includes('right')
    // If grid starts on Bottom, we shift objects to keep them relative to the Bottom wall
    const shouldShiftY = gridStartCorner.value.includes('bottom')

    // 3. Update all objects
    Object.keys(mapData.value).forEach(key => {
      const itemOrList = mapData.value[key]
      if (!itemOrList) return 

      const strategy = RESIZE_STRATEGIES[key] || RESIZE_STRATEGIES.default
      
      const updateItem = (item) => {
        // A. Apply Shift (Anchor Logic)
        if (shouldShiftX) {
            if (item.x1 !== undefined) { item.x1 += dX; item.x2 += dX } // Boards
            else { item.x += dX }
        }
        if (shouldShiftY) {
            if (item.y1 !== undefined) { item.y1 += dY; item.y2 += dY } // Boards
            else { item.y += dY }
        }

        // B. Apply Safety Bounds (Prevent falling off the map)
        // We pass newW/newH to the strategy to ensure they stay inside
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
    // Access bales via mapData directly
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
  
  // We create writable computed refs for legacy support.
  // This allows existing modules (useBales, etc.) to read/write `state.bales` 
  // without realizing it's actually `mapData.value.bales`.
  const createMapRef = (key) => computed({
    get: () => mapData.value[key],
    set: (val) => mapData.value[key] = val
  })

  const stateRefs = {
    mapData,
    // Map Objects (Adapted)
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
    gate: createMapRef('gate'),

    // Metadata & Editor State (Direct Refs)
    gridSize, activeTool, previousClassCount,
    ringDimensions, mapName, currentMapId, currentFolderId, 
    isShared, classLevel, sport, savedMaps, folders,
    isDrawingBoard, currentLayer, selectedBaleId,
    wallTypes, gridStartCorner, clipboard, previousBales, markers: createMapRef('markers'),
    comparisonMapName, showMapStats, selection, nextNumber,
    trialLocation, trialDay, trialNumber, baleConfig, dcMatConfig,

    // Methods
    reset
  }
  
  // Initialize Modules
  const historyModule = useHistory(stateRefs, () => {
    if (stateRefs.validateAllBales) stateRefs.validateAllBales()
  })
  
  // Add snapshot to stateRefs so other modules can use it
  stateRefs.snapshot = historyModule.snapshot

  const bhLogic = useBarnHuntLogic(stateRefs, historyModule.snapshot, { show: showNotification })
  const agLogic = useAgilityLogic(stateRefs, historyModule.snapshot)
  const swLogic = useScentWorkLogic(stateRefs, historyModule.snapshot)

  // Link Validation
  stateRefs.validateAllBales = bhLogic.validateAllBales

  const persistence = useMapPersistence(stateRefs, userStore, { show: showNotification })
  const selectionLogic = useSelectionLogic(stateRefs, historyModule.snapshot, bhLogic.validateAllBales)

  // ==========================================
  // 4. EXPORTS
  // ==========================================
  return {
    // New Unified State
    mapData,

    // Legacy State (Computed Wrappers)
    bales: stateRefs.bales,
    boardEdges: stateRefs.boardEdges,
    hides: stateRefs.hides,
    dcMats: stateRefs.dcMats,
    startBox: stateRefs.startBox,
    gate: stateRefs.gate,
    steps: stateRefs.steps,
    zones: stateRefs.zones,
    agilityObstacles: stateRefs.agilityObstacles,
    scentWorkObjects: stateRefs.scentWorkObjects,
    markers: stateRefs.markers,
    masterBlinds: stateRefs.masterBlinds,

    // Settings & Meta
    ringDimensions, gridSize, currentLayer, selectedBaleId, activeTool,
    nextNumber, notification, currentMapId, mapName, isShared,
    classLevel, sport, folders, currentFolderId,
    selection, isDraggingSelection, clipboard, previousBales, 
    wallTypes, gridStartCorner, trialLocation, trialDay, 
    trialNumber, baleConfig, comparisonMapName, dcMatConfig, showMapStats,
    isDrawingBoard, savedMaps,previousClassCount,

    // Actions
    setTool, reset, showNotification, resizeRing, toggleAnchor, setComparisonBales,
    
    // Computed
    currentGuidelines: computed(() => sport.value === 'agility' ? (AGILITY_RULES[classLevel.value] || AGILITY_RULES['Other']) : (BH_RULES[classLevel.value] || BH_RULES['Other'])),

    // Modules
    ...historyModule,
    ...bhLogic,
    ...agLogic,
    ...swLogic,
    ...persistence,
    ...selectionLogic
  }
})
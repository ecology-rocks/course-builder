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

export const useMapStore = defineStore('map', () => {
  const userStore = useUserStore()

  // ==========================================
  // 1. STATE DEFINITIONS
  // ==========================================
  const ringDimensions = ref({ width: 24, height: 24 })
  const gridSize = ref(20) 
  const previousClassCount = ref(0) 
  const previousBales = ref([])
  const currentMapId = ref(null) 
  const mapName = ref("Untitled Map")
  const isShared = ref(false)
  const folders = ref([]) 
  const currentFolderId = ref(null) 
  const isDrawingBoard = ref(false) 
  const classLevel = ref('Novice') 
  const sport = ref('barnhunt')
  const notification = ref(null)
  
  // Settings
  const wallTypes = ref({ top: 'fence', right: 'fence', bottom: 'fence', left: 'fence' })
  const gridStartCorner = ref('top-left')
  const trialLocation = ref('') 
  const trialDay = ref('')      
  const trialNumber = ref('')   
  const baleConfig = ref({ length: 3, width: 1.5, height: 1 }) // <--- Ensure this is here

  // Objects
  const bales = ref([])
  const agilityObstacles = ref([]) 
  const scentWorkObjects = ref([]) 
  const boardEdges = ref([])
  const hides = ref([]) 
  const dcMats = ref([]) 
  const startBox = ref(null) 
  const masterBlinds = ref([]) 
  const savedMaps = ref([])
  const comparisonMapName = ref(null)
  
  // Editor State
  const clipboard = ref([])
  const currentLayer = ref(1)
  const selectedBaleId = ref(null)
  const selection = ref([]) 
  const isDraggingSelection = ref(false)
  const activeTool = ref('bale')
  const nextNumber = ref(1) 

  // ==========================================
  // 2. INTERNAL HELPERS (Dependencies for Modules)
  // ==========================================

  function showNotification(message, type = 'info') {
    notification.value = { message, type }
    setTimeout(() => { notification.value = null }, 3000)
  }

  function reset() {
    bales.value = []; boardEdges.value = []; hides.value = []; dcMats.value = []; masterBlinds.value = []; startBox.value = null
    agilityObstacles.value = []; scentWorkObjects.value = []; nextNumber.value = 1; 
    currentMapId.value = null; mapName.value = "Untitled Map"; classLevel.value = "Novice"; sport.value = 'barnhunt'
    ringDimensions.value = { width: 24, height: 24 }; previousClassCount.value = 0; currentLayer.value = 1; activeTool.value = 'bale'
    previousBales.value = [] // <--- ADD THIS
  comparisonMapName.value = null
    
    // Reset Settings
    wallTypes.value = { top: 'fence', right: 'fence', bottom: 'fence', left: 'fence' }
    gridStartCorner.value = 'top-left'
    trialLocation.value = ''
    trialDay.value = ''
    trialNumber.value = ''
    baleConfig.value = { length: 3, width: 1.5, height: 1 }
  }

  
  // ==========================================
  // 3. INITIALIZE MODULES
  // ==========================================
  
  // Package state for modules
  const stateRefs = {
    ringDimensions, bales, agilityObstacles, selection, boardEdges, 
    dcMats, hides, mapName, currentMapId, currentFolderId, 
    isShared, classLevel, sport, scentWorkObjects, 
    masterBlinds, startBox, previousClassCount, savedMaps, folders,
    isDrawingBoard, currentLayer, selectedBaleId,
    wallTypes, gridStartCorner, clipboard, previousBales,
    // New Fields
    trialLocation, trialDay, trialNumber, baleConfig,
    // Methods passed to modules
    reset
  }
  
  // A. Initialize History 
  const historyModule = useHistory(stateRefs, () => {
    if (stateRefs.validateAllBales) stateRefs.validateAllBales()
  })

  // Add snapshot to stateRefs so other modules can use it
  stateRefs.snapshot = historyModule.snapshot

  // B. Initialize Sport Logic
  const bhLogic = useBarnHuntLogic(stateRefs, historyModule.snapshot, { show: showNotification })
  const agLogic = useAgilityLogic(stateRefs, historyModule.snapshot)
  const swLogic = useScentWorkLogic(stateRefs, historyModule.snapshot)

  // C. Link Validation
  stateRefs.validateAllBales = bhLogic.validateAllBales

  // D. Initialize Persistence & Selection
  const persistence = useMapPersistence(stateRefs, userStore, { show: showNotification })
  const selectionLogic = useSelectionLogic(stateRefs, historyModule.snapshot, bhLogic.validateAllBales)

  // ==========================================
  // 4. EXTERNAL ACTIONS (Depend on Modules/State)
  // ==========================================

  function setTool(tool) { activeTool.value = tool }

  function toggleAnchor() {
    if (selection.value.length === 0) return
    if (currentLayer.value !== 1) {
      showNotification("Anchor bales must be on Layer 1.", "error")
      return
    }
    bales.value.forEach(b => {
      if (selection.value.includes(b.id)) {
        b.isAnchor = !b.isAnchor
      }
    })
    bales.value = [...bales.value]
  }

  function resizeRing(width, height) {
    const w = Math.max(10, parseInt(width)); const h = Math.max(10, parseInt(height))
    ringDimensions.value = { width: w, height: h }
    bales.value.forEach(b => { if (b.x >= w) b.x = w - 3.5; if (b.y >= h) b.y = h - 3.5 })
    agilityObstacles.value.forEach(o => { if (o.x >= w) o.x = w - 5; if (o.y >= h) o.y = h - 5 })
    scentWorkObjects.value.forEach(o => { if (o.x >= w) o.x = w - 3; if (o.y >= h) o.y = h - 3 })
    boardEdges.value.forEach(b => { if (b.x1 > w) b.x1 = w; if (b.x2 > w) b.x2 = w; if (b.y1 > h) b.y1 = h; if (b.y2 > h) b.y2 = h })
    
    // Now safe to call validation
    if (stateRefs.validateAllBales) stateRefs.validateAllBales()
  }

  const currentGuidelines = computed(() => sport.value === 'agility' ? (AGILITY_RULES[classLevel.value] || AGILITY_RULES['Other']) : (BH_RULES[classLevel.value] || BH_RULES['Other']))


function setComparisonBales(bales, name = "Custom Map") { // <--- ADD THIS FUNCTION
  // Deep clone to ensure we have a static snapshot
  previousBales.value = JSON.parse(JSON.stringify(bales))
  comparisonMapName.value = name
}

  
  // ==========================================
  // 5. EXPORTS
  // ==========================================
  return {
    // State
    ringDimensions, gridSize, bales, currentLayer, selectedBaleId, activeTool,
    boardEdges, isDrawingBoard, dcMats, startBox, hides, masterBlinds,
    agilityObstacles, scentWorkObjects, nextNumber, notification,
    savedMaps, currentMapId, mapName, isShared,
    classLevel, sport, folders, currentFolderId, previousClassCount,
    selection, isDraggingSelection, clipboard, previousBales, setComparisonBales,
    
    // Settings
    wallTypes, gridStartCorner, trialLocation, trialDay, trialNumber, baleConfig, comparisonMapName,

    // Actions
    setTool, reset, showNotification, resizeRing, toggleAnchor, 
    
    // Computed
    currentGuidelines,

    // Modules
    ...historyModule,
    ...bhLogic,
    ...agLogic,
    ...swLogic,
    ...persistence,
    ...selectionLogic
  }
})
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useUserStore } from './userStore'
import { CLASS_RULES, checkSupport } from '../utils/validation'

export const useMapStore = defineStore('map', () => {
  // CONFIGURATION
  // Standard course size is 24'x24' [cite: 107]
  const ringDimensions = ref({ width: 24, height: 24 })
  const gridSize = ref(20) // pixels per foot for rendering
  const previousClassCount = ref(0) // User inputs this (e.g. "Open had 40 bales")
  const currentMapId = ref(null) // ID from Firebase if saved
  const mapName = ref("Untitled Map")
  const isShared = ref(false)
  const folders = ref([]) // List of folder objects
  const currentFolderId = ref(null) // null = Root (Unfiled)
  const isDrawingBoard = ref(false) // ID of the board currently being drawn
  const dcMats = ref([]) // List of Distance Challenge mats
  const classLevel = ref('Novice') // Default to Novice
  const startBox = ref(null) // { x, y }
  const masterBlinds = ref([]) // Array of arrays: [[1,5,3,2,4], [2,2,1,5,3], ...]
  

  const hides = ref([]) // { id, x, y, type: 'rat'|'litter'|'empty' }

  // ******** FUNCTIONS ********

// START DRAWING (MouseDown)
  function startDrawingBoard(x, y) {
    const id = crypto.randomUUID()
    // Snap start point
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2
    
    boardEdges.value.push({
      id: id,
      x1: snappedX,
      y1: snappedY,
      x2: snappedX, // Initially, end = start
      y2: snappedY
    })
    isDrawingBoard.value = id
  }

  // UPDATE DRAWING (MouseMove)
  function updateDrawingBoard(x, y) {
    if (!isDrawingBoard.value) return
    
    const board = boardEdges.value.find(b => b.id === isDrawingBoard.value)
    if (board) {
      // Snap end point
      board.x2 = Math.round(x * 2) / 2
      board.y2 = Math.round(y * 2) / 2
    }
  }

  // FINISH DRAWING (MouseUp)
  function stopDrawingBoard() {
    if (!isDrawingBoard.value) return
    
    // Cleanup: If length is 0 (just a click), remove it
    const board = boardEdges.value.find(b => b.id === isDrawingBoard.value)
    if (board && board.x1 === board.x2 && board.y1 === board.y2) {
      boardEdges.value = boardEdges.value.filter(b => b.id !== isDrawingBoard.value)
    }
    
    isDrawingBoard.value = null
  }

// ACTIONS
  function generateMasterBlinds(count) {
    const newBlinds = []
    for (let i = 0; i < count; i++) {
      const set = []
      for (let j = 0; j < 5; j++) {
        // Generate random number 1-5
        set.push(Math.floor(Math.random() * 5) + 1)
      }
      newBlinds.push(set)
    }
    masterBlinds.value = newBlinds
  }


  function addHide(x, y) {
    hides.value.push({
      id: crypto.randomUUID(),
      x: Math.round(x * 2) / 2,
      y: Math.round(y * 2) / 2,
      type: 'rat' // Default start color
    })
  }

  function removeHide(id) {
    hides.value = hides.value.filter(h => h.id !== id)
  }

  function cycleHideType(id) {
    const hide = hides.value.find(h => h.id === id)
    if (hide) {
      if (hide.type === 'rat') hide.type = 'litter'
      else if (hide.type === 'litter') hide.type = 'empty'
      else hide.type = 'rat'
    }
  }
function addDCMat(x, y) {
    dcMats.value.push({
      id: crypto.randomUUID(),
      x: Math.round(x * 2) / 2, // Snap to grid
      y: Math.round(y * 2) / 2,
      rotation: 0 
    })
  }

  function removeDCMat(id) {
    dcMats.value = dcMats.value.filter(m => m.id !== id)
  }

  function rotateDCMat(id) {
    const mat = dcMats.value.find(m => m.id === id)
    if (mat) {
      // Rotate 90 degrees (Portrait <-> Landscape)
      mat.rotation = (mat.rotation + 90) % 180
    }
  }


// Replace the big CLASS_RULES object with just the import usage
const currentGuidelines = computed(() => {
  return CLASS_RULES[classLevel.value] || CLASS_RULES['Other']
})


  function addStartBox(x, y) {
    // Default to a 4x4 foot box (standard size)
    // Snapped to grid
    startBox.value = {
      x: Math.round(x * 2) / 2,
      y: Math.round(y * 2) / 2
    }
  }

  function removeStartBox() {
    startBox.value = null
  }
  

  async function deleteMap(id) {
    try {
      await deleteDoc(doc(db, "maps", id))
      
      // If we just deleted the map currently open in the editor, 
      // treat the editor content as a "new" unsaved map to prevent errors.
      if (currentMapId.value === id) {
        currentMapId.value = null
      }
    } catch (e) {
      console.error("Delete failed", e)
      alert("Failed to delete map.")
    }
  }

  async function renameMap(id, newName) {
    try {
      const mapRef = doc(db, "maps", id)
      await updateDoc(mapRef, { name: newName })
      
      // If this map is currently open, update the name in the UI too
      if (currentMapId.value === id) {
        mapName.value = newName
      }
    } catch (e) {
      console.error("Rename failed", e)
      alert("Failed to rename map.")
    }
  }
  function exportMapToJSON() {
    const data = {
      version: 1,
      name: mapName.value,
      level: classLevel.value, // <--- Add this
      dcMats: dcMats.value,
      dimensions: ringDimensions.value,
      bales: bales.value,
      hides: hides.value,
      isShared: isShared.value,
      masterBlinds: masterBlinds.value,
      boardEdges: boardEdges.value,
      previousClassCount: previousClassCount.value
    }

    // Create a blob and trigger download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${mapName.value.replace(/\s+/g, '_')}.json`
    link.click()
  }

  function importMapFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      // Basic validation could go here
      mapName.value = data.name || "Imported Map"
      classLevel.value = data.level || 'Novice' // <--- Add this
      ringDimensions.value = data.dimensions || { width: 24, height: 24 }
      bales.value = data.bales || []
      dcMats.value = data.dcMats || []
      boardEdges.value = data.boardEdges || []
      hides.value = data.hides || []
      masterBlinds.value = data.masterBlinds || []
      isShared.value = data.isShared || false
      previousClassCount.value = data.previousClassCount || 0
      currentMapId.value = null // Reset ID because this is a "new" copy
      validateAllBales() // Re-check gravity
    } catch (e) {
      alert("Failed to parse map file.")
      console.error(e)
    }
  }

  // --- ACTIONS: FIREBASE CLOUD SAVE/LOAD ---

  async function saveToCloud() {
    const userStore = useUserStore()
    if (!userStore.user) return alert("Please log in to save.")
    // 2. Check Map Name (NEW VALIDATION)
if (!mapName.value || 
        mapName.value.trim() === "" || 
        mapName.value === "Untitled Map") {
      return alert("Please enter a custom name for your map.")
    }
    const mapData = {
      uid: userStore.user.uid,
      name: mapName.value.trim(),
      folderId: currentFolderId.value,
      isShared: isShared.value,
      level: classLevel.value, 
      updatedAt: new Date(),
      data: {
        dimensions: ringDimensions.value,
        bales: bales.value,
        dcMats: dcMats.value,
        masterBlinds: masterBlinds.value,
        boardEdges: boardEdges.value,
        previousClassCount: previousClassCount.value,
        isShared: isShared.value,
        hides: hides.value
      }
    }

    try {
      if (currentMapId.value) {
        // Update existing
        const mapRef = doc(db, "maps", currentMapId.value)
        await updateDoc(mapRef, mapData)
        alert("Map updated!")
      } else {
        // Create new
        const docRef = await addDoc(collection(db, "maps"), {
          ...mapData,
          createdAt: new Date()
        })
        currentMapId.value = docRef.id
        alert("Map saved to cloud!")
      }
    } catch (e) {
      console.error("Save failed", e)
      alert("Error saving map.")
    }
  }

  async function loadUserMaps() {
    const userStore = useUserStore()
    if (!userStore.user) return []

    const q = query(collection(db, "maps"), where("uid", "==", userStore.user.uid))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  // --- FOLDER ACTIONS ---

  async function createFolder(name) {
    const userStore = useUserStore()
    if (!userStore.user) return

    try {
      await addDoc(collection(db, "folders"), {
        uid: userStore.user.uid,
        name: name,
        createdAt: new Date()
      })
      await loadUserFolders() // Refresh list immediately
    } catch (e) {
      console.error(e)
    }
  }

  async function loadUserFolders() {
    const userStore = useUserStore()
    if (!userStore.user) return
    
    const q = query(collection(db, "folders"), where("uid", "==", userStore.user.uid))
    const snapshot = await getDocs(q)
    folders.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

// MOVE MAP
  async function moveMap(mapId, targetFolderId) {
    try {
      const mapRef = doc(db, "maps", mapId)
      // Update Firestore
      await updateDoc(mapRef, { folderId: targetFolderId })
      
      // Update Local State (if currently editing this map)
      if (currentMapId.value === mapId) {
        currentFolderId.value = targetFolderId
      }
    } catch (e) {
      console.error("Move failed", e)
      alert("Failed to move map.")
    }
  }

  async function deleteFolder(folderId) {
    // For MVP: We just delete the folder doc. 
    // Maps inside will still exist but have a 'ghost' folderId. 
    // They will show up in "Unfiled" if you add a check for valid folders in Dashboard,
    // or you can manually update them here.
    try {
      await deleteDoc(doc(db, "folders", folderId))
      await loadUserFolders()
    } catch (e) {
      console.error(e)
    }
  }

  function loadMapFromData(id, data) {
    currentMapId.value = id
    mapName.value = data.name
    classLevel.value = data.level || 'Novice' // <--- Add this
    isShared.value = data.isShared || false
    currentFolderId.value = data.folderId || null
    ringDimensions.value = data.data.dimensions
    bales.value = data.data.bales
    dcMats.value = data.data.dcMats || []
    boardEdges.value = data.data.boardEdges
    hides.value = data.data.hides || []
    masterBlinds.value = data.masterBlinds || []
    previousClassCount.value = data.data.previousClassCount
    validateAllBales()
  }

function reset() {
    // Note: We DO NOT reset currentFolderId here. 
    // It is controlled by the Dashboard navigation.
    
    bales.value = []
    boardEdges.value = []
    hides.value = []
    dcMats.value = []
    masterBlinds.value = []
    startBox.value = null
    
    currentMapId.value = null
    mapName.value = "Untitled Map"
    classLevel.value = "Novice"
    ringDimensions.value = { width: 24, height: 24 }
    previousClassCount.value = 0
    currentLayer.value = 1
    activeTool.value = 'bale'
    isShared.value = false
  }
  // BALE CONFIG
  // Standard 2-stringer bales. 
  // Represented in feet: Approx 3' long x 1.5' wide (18")
  const baleSize = { width: 3, height: 1.5 }

  // STATE
  // Bales: { id, x, y, rotation (0 or 90), layer (1, 2, 3) }
  const bales = ref([])
  const currentLayer = ref(1)
  const selectedBaleId = ref(null)
  const activeTool = ref('bale') // 'bale' | 'board' | 'startbox'
  const boardEdges = ref([]) // Separate list for board lines


  // GETTERS
  const inventory = computed(() => {
    const total = bales.value.length
    const base = bales.value.filter(b => b.layer === 1).length

    // Calculate Delta for Nesting rules 
    const delta = total - previousClassCount.value
    const deltaString = delta > 0 ? `+${delta}` : `${delta}`

    return {
      total,
      base,
      layer2: bales.value.filter(b => b.layer === 2).length,
      layer3: bales.value.filter(b => b.layer === 3).length,
      deltaString,
      isNestingValid: total > 0 // Simple check for now
    }
  })

  // FUNCTIONS
  function setTool(toolName) {
    activeTool.value = toolName
  }



  function removeBoardEdge(id) {
    boardEdges.value = boardEdges.value.filter(b => b.id !== id)
  }


  function cycleLean(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      // 1. Guard Clause: Only Flat bales can be leaners
      if (bale.orientation !== 'flat') return

      // 2. Cycle Logic: Null -> Right -> Left -> Null
      // We only use Right/Left because those are parallel to the longest side (width=3)
      if (bale.lean === null) {
        bale.lean = 'right'
      } else if (bale.lean === 'right') {
        bale.lean = 'left'
      } else {
        bale.lean = null
      }
    }
  }

  // ACTIONS
  function addBale(x, y) {
    // Snap to 0.5 grid (6 inches)
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2

    const newBale = {
      id: crypto.randomUUID(),
      x: snappedX,
      y: snappedY,
      rotation: 0,
      layer: currentLayer.value,
      orientation: 'flat',
      lean: null,
      supported: true // <--- New Property
    }

    // 1. Check Boundary/Collision
    if (!isValidPlacement(newBale)) {
      alert("Cannot place here: Obstruction or Out of Bounds")
      return
    }

    bales.value.push(newBale)
    validateAllBales()
  }

  function updateBalePosition(id, newX, newY) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      // Snap to 0.5 grid (6 inches)
      bale.x = Math.round(newX * 2) / 2
      bale.y = Math.round(newY * 2) / 2
    }
    validateAllBales()
  }


  function removeBale(id) {
    bales.value = bales.value.filter(b => b.id !== id)
    selectedBaleId.value = null
    validateAllBales()
  }

  function cycleOrientation(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.orientation === 'flat') {
        bale.orientation = 'tall'
        bale.lean = null // <--- RESET LEAN (Tall bales can't lean)
      } else if (bale.orientation === 'tall') {
        bale.orientation = 'pillar'
        bale.lean = null // <--- RESET LEAN
      } else {
        bale.orientation = 'flat'
      }
    }
    validateAllBales()
  }

  function rotateBale(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      // Increment by 45 degrees instead of toggling
      // We use modulo 180 because a 180-degree bale is the same as 0
      bale.rotation = (bale.rotation + 45) % 180
    }
    validateAllBales()
  }

  // VALIDATION LOGIC
// VALIDATION LOGIC
  function isValidPlacement(newBale) {
    // 1. Calculate Exact Dimensions
    let w, h
    const isRotated = newBale.rotation % 180 !== 0

    if (newBale.orientation === 'flat') {
      w = isRotated ? 1.5 : 3
      h = isRotated ? 3 : 1.5
    } else if (newBale.orientation === 'tall') {
      w = isRotated ? 1 : 3
      h = isRotated ? 3 : 1
    } else {
      // Pillar
      w = isRotated ? 1 : 1.5
      h = isRotated ? 1.5 : 1
    }

    // 2. Boundary Check
    if (newBale.x < 0 || newBale.x + w > ringDimensions.value.width ||
        newBale.y < 0 || newBale.y + h > ringDimensions.value.height) {
      return false
    }

    // 3. Collision Check (45-degree Logic skipped for MVP)
    if (newBale.rotation % 90 !== 0) return true

    const collision = bales.value.some(existing => {
      if (existing.layer !== newBale.layer) return false
      if (existing.rotation % 90 !== 0) return false

      // Calculate existing dims
      const exRotated = existing.rotation % 180 !== 0
      let exW, exH
      if (existing.orientation === 'flat') {
        exW = exRotated ? 1.5 : 3; exH = exRotated ? 3 : 1.5
      } else if (existing.orientation === 'tall') {
        exW = exRotated ? 1 : 3; exH = exRotated ? 3 : 1
      } else {
        exW = exRotated ? 1 : 1.5; exH = exRotated ? 1.5 : 1
      }

      return (
        newBale.x < existing.x + exW &&
        newBale.x + w > existing.x &&
        newBale.y < existing.y + exH &&
        newBale.y + h > existing.y
      )
    })

    return !collision
  }

  // GETTERS
  const balesByLayer = computed(() => {
    return {
      1: bales.value.filter(b => b.layer === 1),
      2: bales.value.filter(b => b.layer === 2),
      3: bales.value.filter(b => b.layer === 3)
    }
  })

  // Count logic for map key [cite: 481]
  const baleCounts = computed(() => {
    return {
      total: bales.value.length,
      base: balesByLayer.value[1].length
    }
  })


function validateAllBales() {
    bales.value.forEach(bale => {
      // 1. Calculate Exact Dimensions (Handling Rotation for ALL types)
      let w, h
      const isRotated = bale.rotation % 180 !== 0

      if (bale.orientation === 'flat') {
        w = isRotated ? 1.5 : 3
        h = isRotated ? 3 : 1.5
      } else if (bale.orientation === 'tall') {
        w = isRotated ? 1 : 3
        h = isRotated ? 3 : 1
      } else {
        // Pillar
        w = isRotated ? 1 : 1.5
        h = isRotated ? 1.5 : 1
      }

      // 2. Check Bounds
      const outOfBounds =
        bale.x < 0 ||
        bale.y < 0 ||
        bale.x + w > ringDimensions.value.width ||
        bale.y + h > ringDimensions.value.height

      // 3. Check Support (Only if in bounds)
      const hasGravity = hasSupport(bale)

      // 4. Update Status
      bale.supported = !outOfBounds && hasGravity
    })
  }

  function resizeRing(width, height) {
    // Enforce reasonable limits (e.g., minimum 10x10)
    const w = Math.max(10, parseInt(width))
    const h = Math.max(10, parseInt(height))

    ringDimensions.value = { width: w, height: h }
    validateAllBales() // Mark items red if they get "cropped" out
  }

// UPDATE ONE ENDPOINT (Drag Handle)
  function updateBoardEndpoint(id, whichPoint, newX, newY) {
    const board = boardEdges.value.find(b => b.id === id)
    if (board) {
      if (whichPoint === 'start') {
        board.x1 = Math.round(newX * 2) / 2
        board.y1 = Math.round(newY * 2) / 2
      } else {
        board.x2 = Math.round(newX * 2) / 2
        board.y2 = Math.round(newY * 2) / 2
      }
    }
  }

  // ROTATE BOARD (Right Click)
  function rotateBoard(id) {
    const board = boardEdges.value.find(b => b.id === id)
    if (board) {
      // 1. Calculate Midpoint
      const mx = (board.x1 + board.x2) / 2
      const my = (board.y1 + board.y2) / 2

      // 2. Define Rotation (45 degrees in radians)
      const rad = (45 * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      // 3. Rotate Point 1
      const dx1 = board.x1 - mx
      const dy1 = board.y1 - my
      const rx1 = (dx1 * cos - dy1 * sin) + mx
      const ry1 = (dx1 * sin + dy1 * cos) + my

      // 4. Rotate Point 2
      const dx2 = board.x2 - mx
      const dy2 = board.y2 - my
      const rx2 = (dx2 * cos - dy2 * sin) + mx
      const ry2 = (dx2 * sin + dy2 * cos) + my

      // 5. Update and Snap
      board.x1 = Math.round(rx1 * 2) / 2
      board.y1 = Math.round(ry1 * 2) / 2
      board.x2 = Math.round(rx2 * 2) / 2
      board.y2 = Math.round(ry2 * 2) / 2
    }
  }

  function hasSupport(newBale) {
    // 1. Ground is always supported
    if (newBale.layer === 1) return true

    // 2. Find all bales on the layer directly below
    // We filter manually here to avoid "ReferenceError" issues with getters
    const lowerLayer = bales.value.filter(b => b.layer === newBale.layer - 1)

    // Get dimensions for the new bale
    const newW = newBale.rotation % 180 === 0 ? 3 : 1.5 // Simplified for standard flat bales
    const newH = newBale.rotation % 180 === 0 ? 1.5 : 3

    // Check against every bale in the lower layer
    return lowerLayer.some(baseBale => {
      // Determine base bale dimensions (handle rotation)
      const baseW = baseBale.rotation % 180 === 0 ? 3 : 1.5
      const baseH = baseBale.rotation % 180 === 0 ? 1.5 : 3

      // Calculate overlap rectangle
      const x_overlap = Math.max(0, Math.min(newBale.x + newW, baseBale.x + baseW) - Math.max(newBale.x, baseBale.x))
      const y_overlap = Math.max(0, Math.min(newBale.y + newH, baseBale.y + baseH) - Math.max(newBale.y, baseBale.y))
      const overlapArea = x_overlap * y_overlap

      // Require at least 1 square foot of support
      return overlapArea >= 1
    })
  }

  return {
    ringDimensions,
    gridSize,
    bales,
    currentLayer,
    selectedBaleId,
    addBale,
    removeBale,
    rotateBale,
    cycleOrientation,
    cycleLean,
    updateBalePosition,
    hasSupport,
    validateAllBales,
    resizeRing,
    activeTool,
    setTool,
    boardEdges,
    removeBoardEdge,
    isDrawingBoard,
    updateDrawingBoard,
    stopDrawingBoard,
    startDrawingBoard,
    exportMapToJSON,
    importMapFromJSON,
    saveToCloud,
    loadUserMaps,
    loadMapFromData,
    deleteMap,
    renameMap,
    dcMats,
    addDCMat,
    removeDCMat,
    rotateDCMat,
    startBox,
    addStartBox,
    removeStartBox,
    currentGuidelines,
    classLevel,
    previousClassCount,
    inventory,
    balesByLayer,
    baleCounts,
    mapName,
    hides,
    addHide,
    removeHide,
    cycleHideType,
    reset,
    masterBlinds,
    generateMasterBlinds,
    isShared,
    updateBoardEndpoint,
    rotateBoard,
    currentMapId,
    folders,
    currentFolderId,
    createFolder,
    loadUserFolders,
    moveMap,
    deleteFolder
  }
})

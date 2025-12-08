import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch
} from 'firebase/firestore'
import { db } from '../firebase'
import { useUserStore } from './userStore'
import { BH_RULES, AGILITY_RULES, checkSupport } from '../utils/validation'

export const useMapStore = defineStore('map', () => {
  // CONFIGURATION
  const ringDimensions = ref({ width: 24, height: 24 })
  const gridSize = ref(20) 
  const previousClassCount = ref(0) 
  const currentMapId = ref(null) 
  const mapName = ref("Untitled Map")
  const isShared = ref(false)
  const folders = ref([]) 
  const currentFolderId = ref(null) 
  const isDrawingBoard = ref(false) 
  const dcMats = ref([]) 
  const classLevel = ref('Novice') 
  const startBox = ref(null) 
  const masterBlinds = ref([]) 
  const boardEdges = ref([])
  const hides = ref([])
  
  // BALE CONFIG
  const bales = ref([])
  const currentLayer = ref(1)
  const selectedBaleId = ref(null)
  const activeTool = ref('bale')

  // AGILITY CONFIG
  const sport = ref('barnhunt') 
  const agilityObstacles = ref([]) 
  const nextNumber = ref(1) // <--- NEW: Counter for Renumber Tool
  const notification = ref(null)
  // ******** FUNCTIONS ********

  // START DRAWING (MouseDown)
  function startDrawingBoard(x, y) {
    const id = crypto.randomUUID()
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2
    
    boardEdges.value.push({
      id: id,
      x1: snappedX,
      y1: snappedY,
      x2: snappedX, 
      y2: snappedY
    })
    isDrawingBoard.value = id
  }

function showNotification(message, type = 'info') {
    notification.value = { message, type }
    // Auto-clear after 3 seconds
    setTimeout(() => {
      notification.value = null
    }, 3000)
  }

  // UPDATE DRAWING (MouseMove)
  function updateDrawingBoard(x, y) {
    if (!isDrawingBoard.value) return
    
    const board = boardEdges.value.find(b => b.id === isDrawingBoard.value)
    if (board) {
      board.x2 = Math.round(x * 2) / 2
      board.y2 = Math.round(y * 2) / 2
    }
  }

  // FINISH DRAWING (MouseUp)
  function stopDrawingBoard() {
    if (!isDrawingBoard.value) return
    
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
      type: 'rat' 
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
      x: Math.round(x * 2) / 2, 
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
      mat.rotation = (mat.rotation + 90) % 180
    }
  }

  const currentGuidelines = computed(() => {
    if (sport.value === 'agility') {
      return AGILITY_RULES[classLevel.value] || AGILITY_RULES['Other']
    }
    return BH_RULES[classLevel.value] || BH_RULES['Other']
  })

  function addStartBox(x, y) {
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
      level: classLevel.value,
      sport: sport.value,
      dcMats: dcMats.value,
      dimensions: ringDimensions.value,
      bales: bales.value,
      agilityObstacles: agilityObstacles.value,
      hides: hides.value,
      isShared: isShared.value,
      masterBlinds: masterBlinds.value,
      boardEdges: boardEdges.value,
      previousClassCount: previousClassCount.value
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${mapName.value.replace(/\s+/g, '_')}.json`
    link.click()
  }

  function importMapFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      importMapFromData(data) 
    } catch (e) {
      alert("Failed to parse map file.")
      console.error(e)
    }
  }

  function importMapFromData(data) {
    mapName.value = data.name || "Imported Map"
    classLevel.value = data.level || 'Novice'
    sport.value = data.sport || 'barnhunt'
    ringDimensions.value = data.data.dimensions || { width: 24, height: 24 }
    bales.value = data.data.bales || []
    agilityObstacles.value = data.data.agilityObstacles || [] 
    dcMats.value = data.data.dcMats || []
    boardEdges.value = data.data.boardEdges || []
    hides.value = data.data.hides || []
    masterBlinds.value = data.masterBlinds || []
    isShared.value = data.isShared || false
    previousClassCount.value = data.data.previousClassCount || 0
    currentMapId.value = null 
    validateAllBales()
  }

  async function saveToCloud() {
    const userStore = useUserStore()
    if (!userStore.user) return alert("Please log in to save.")
    
    if (!mapName.value || mapName.value.trim() === "" || mapName.value === "Untitled Map") {
      return alert("Please enter a custom name for your map.")
    }

    const mapData = {
      uid: userStore.user.uid,
      name: mapName.value.trim(),
      folderId: currentFolderId.value,
      isShared: isShared.value,
      level: classLevel.value, 
      sport: sport.value,
      updatedAt: new Date(),
      data: {
        dimensions: ringDimensions.value,
        bales: bales.value,
        agilityObstacles: agilityObstacles.value,
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
        const mapRef = doc(db, "maps", currentMapId.value)
        await updateDoc(mapRef, mapData)
        alert("Map updated!")
      } else {
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

  async function createFolder(name) {
    const userStore = useUserStore()
    if (!userStore.user) return

    try {
      await addDoc(collection(db, "folders"), {
        uid: userStore.user.uid,
        name: name,
        createdAt: new Date()
      })
      await loadUserFolders()
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

  async function moveMap(mapId, targetFolderId) {
    try {
      const mapRef = doc(db, "maps", mapId)
      await updateDoc(mapRef, { folderId: targetFolderId })
      
      if (currentMapId.value === mapId) {
        currentFolderId.value = targetFolderId
      }
    } catch (e) {
      console.error("Move failed", e)
      alert("Failed to move map.")
    }
  }

  async function deleteFolder(folderId) {
    if (!confirm("Delete this folder? Maps inside will be moved to 'Unfiled'.")) return

    try {
      const batch = writeBatch(db)
      const mapsRef = collection(db, "maps")
      const q = query(mapsRef, where("folderId", "==", folderId))
      const snapshot = await getDocs(q)

      snapshot.docs.forEach((mapDoc) => {
        batch.update(mapDoc.ref, { folderId: null })
      })

      const folderRef = doc(db, "folders", folderId)
      batch.delete(folderRef)

      await batch.commit()
      await loadUserFolders() 
      await loadUserMaps() 
      
      if (currentFolderId.value === folderId) {
        currentFolderId.value = null
      }

    } catch (e) {
      console.error("Folder delete failed", e)
      alert("Failed to delete folder.")
    }
  }

  function loadMapFromData(id, data) {
    currentMapId.value = id
    mapName.value = data.name
    classLevel.value = data.level || 'Novice'
    sport.value = data.sport || 'barnhunt'
    isShared.value = data.isShared || false
    currentFolderId.value = data.folderId || null
    ringDimensions.value = data.data.dimensions
    bales.value = data.data.bales
    agilityObstacles.value = data.data.agilityObstacles || []
    dcMats.value = data.data.dcMats || []
    boardEdges.value = data.data.boardEdges
    hides.value = data.data.hides || []
    masterBlinds.value = data.masterBlinds || []
    previousClassCount.value = data.data.previousClassCount
    validateAllBales()
  }

  function reset() {
    bales.value = []
    boardEdges.value = []
    hides.value = []
    dcMats.value = []
    masterBlinds.value = []
    startBox.value = null
    
    // Clear Agility
    agilityObstacles.value = []
    nextNumber.value = 1 // Reset counter
    
    currentMapId.value = null
    mapName.value = "Untitled Map"
    classLevel.value = "Novice"
    sport.value = 'barnhunt'
    ringDimensions.value = { width: 24, height: 24 }
    previousClassCount.value = 0
    currentLayer.value = 1
    activeTool.value = 'bale'
    isShared.value = false
  }

  // GETTERS
  const inventory = computed(() => {
    const total = bales.value.length
    const base = bales.value.filter(b => b.layer === 1).length
    const delta = total - previousClassCount.value
    const deltaString = delta > 0 ? `+${delta}` : `${delta}`

    return {
      total,
      base,
      layer2: bales.value.filter(b => b.layer === 2).length,
      layer3: bales.value.filter(b => b.layer === 3).length,
      deltaString,
      isNestingValid: total > 0 
    }
  })

  function setTool(toolName) {
    activeTool.value = toolName
  }

  function removeBoardEdge(id) {
    boardEdges.value = boardEdges.value.filter(b => b.id !== id)
  }

  function cycleLean(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.orientation !== 'flat') return
      if (bale.lean === null) {
        bale.lean = 'right'
      } else if (bale.lean === 'right') {
        bale.lean = 'left'
      } else {
        bale.lean = null
      }
    }
  }

  function addBale(x, y) {
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
      supported: true 
    }

if (!isValidPlacement(newBale)) {
      // OLD: alert("Cannot place here...")
      // NEW:
      showNotification("Cannot place here: Obstruction or Out of Bounds", 'error')
      return
    }

    bales.value.push(newBale)
    validateAllBales()
  }

  function updateBalePosition(id, newX, newY) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
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
        bale.lean = null 
      } else if (bale.orientation === 'tall') {
        bale.orientation = 'pillar'
        bale.lean = null 
      } else {
        bale.orientation = 'flat'
      }
    }
    validateAllBales()
  }

  function rotateBale(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      bale.rotation = (bale.rotation + 45) % 180
    }
    validateAllBales()
  }

  function isValidPlacement(newBale) {
    let w, h
    const isRotated = newBale.rotation % 180 !== 0

    if (newBale.orientation === 'flat') {
      w = isRotated ? 1.5 : 3
      h = isRotated ? 3 : 1.5
    } else if (newBale.orientation === 'tall') {
      w = isRotated ? 1 : 3
      h = isRotated ? 3 : 1
    } else {
      w = isRotated ? 1 : 1.5
      h = isRotated ? 1.5 : 1
    }

    if (newBale.x < 0 || newBale.x + w > ringDimensions.value.width ||
        newBale.y < 0 || newBale.y + h > ringDimensions.value.height) {
      return false
    }

    if (newBale.rotation % 90 !== 0) return true

    const collision = bales.value.some(existing => {
      if (existing.layer !== newBale.layer) return false
      if (existing.rotation % 90 !== 0) return false

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

  const balesByLayer = computed(() => {
    return {
      1: bales.value.filter(b => b.layer === 1),
      2: bales.value.filter(b => b.layer === 2),
      3: bales.value.filter(b => b.layer === 3)
    }
  })

  const baleCounts = computed(() => {
    return {
      total: bales.value.length,
      base: balesByLayer.value[1].length
    }
  })

  function validateAllBales() {
    bales.value.forEach(bale => {
      let w, h
      const isRotated = bale.rotation % 180 !== 0

      if (bale.orientation === 'flat') {
        w = isRotated ? 1.5 : 3
        h = isRotated ? 3 : 1.5
      } else if (bale.orientation === 'tall') {
        w = isRotated ? 1 : 3
        h = isRotated ? 3 : 1
      } else {
        w = isRotated ? 1 : 1.5
        h = isRotated ? 1.5 : 1
      }

      const outOfBounds =
        bale.x < 0 ||
        bale.y < 0 ||
        bale.x + w > ringDimensions.value.width ||
        bale.y + h > ringDimensions.value.height

      const hasGravity = hasSupport(bale)

      bale.supported = !outOfBounds && hasGravity
    })
  }

function resizeRing(width, height) {
    const w = Math.max(10, parseInt(width))
    const h = Math.max(10, parseInt(height))

    ringDimensions.value = { width: w, height: h }
    
    // --- SAFETY CHECK: Pull stranded items back inside ---
    
    // 1. Barn Hunt Bales (Approx 3ft buffer)
    bales.value.forEach(b => {
       if (b.x >= w) b.x = w - 3.5 
       if (b.y >= h) b.y = h - 3.5
    })
    
    // 2. Agility Obstacles (Approx 2ft buffer)
    agilityObstacles.value.forEach(o => {
       if (o.x >= w) o.x = w - 5
       if (o.y >= h) o.y = h - 5
    })

    // 3. Boards
    boardEdges.value.forEach(b => {
      if (b.x1 > w) b.x1 = w
      if (b.x2 > w) b.x2 = w
      if (b.y1 > h) b.y1 = h
      if (b.y2 > h) b.y2 = h
    })

    validateAllBales() 
  }

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

  function rotateBoard(id) {
    const board = boardEdges.value.find(b => b.id === id)
    if (board) {
      const mx = (board.x1 + board.x2) / 2
      const my = (board.y1 + board.y2) / 2

      const rad = (45 * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      const dx1 = board.x1 - mx
      const dy1 = board.y1 - my
      const rx1 = (dx1 * cos - dy1 * sin) + mx
      const ry1 = (dx1 * sin + dy1 * cos) + my

      const dx2 = board.x2 - mx
      const dy2 = board.y2 - my
      const rx2 = (dx2 * cos - dy2 * sin) + mx
      const ry2 = (dx2 * sin + dy2 * cos) + my

      board.x1 = Math.round(rx1 * 2) / 2
      board.y1 = Math.round(ry1 * 2) / 2
      board.x2 = Math.round(rx2 * 2) / 2
      board.y2 = Math.round(ry2 * 2) / 2
    }
  }

  function hasSupport(newBale) {
    if (newBale.layer === 1) return true

    const lowerLayer = bales.value.filter(b => b.layer === newBale.layer - 1)
    const newW = newBale.rotation % 180 === 0 ? 3 : 1.5 
    const newH = newBale.rotation % 180 === 0 ? 1.5 : 3

    return lowerLayer.some(baseBale => {
      const baseW = baseBale.rotation % 180 === 0 ? 3 : 1.5
      const baseH = baseBale.rotation % 180 === 0 ? 1.5 : 3

      const x_overlap = Math.max(0, Math.min(newBale.x + newW, baseBale.x + baseW) - Math.max(newBale.x, baseBale.x))
      const y_overlap = Math.max(0, Math.min(newBale.y + newH, baseBale.y + baseH) - Math.max(newBale.y, baseBale.y))
      const overlapArea = x_overlap * y_overlap

      return overlapArea >= 1
    })
  }

  // --- AGILITY ACTIONS ---
  function addAgilityObstacle(type, x, y) {
    agilityObstacles.value.push({
      id: crypto.randomUUID(),
      type: type, 
      x: Math.round(x * 2) / 2,
      y: Math.round(y * 2) / 2,
      rotation: 0,
      number: null, // <--- No Default Number
      shape: 'straight',
      poleCount: 12,
      properties: {} 
    })
  }

  function removeAgilityObstacle(id) {
    agilityObstacles.value = agilityObstacles.value.filter(o => o.id !== id)
  }

  function rotateAgilityObstacle(id) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs) {
      obs.rotation = (obs.rotation + 45) % 360
    }
  }

  function cycleAgilityShape(id) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs && obs.type === 'tunnel') {
      const shapes = ['straight', 'L', 'U']
      const current = obs.shape || 'straight'
      const nextIndex = (shapes.indexOf(current) + 1) % shapes.length
      obs.shape = shapes[nextIndex]
    }
  }

  function cycleAgilityPoles(id) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs && obs.type === 'weave') {
      const options = [12, 6, 2, 4, 8, 10]
      const current = obs.poleCount || 12
      const nextIndex = (options.indexOf(current) + 1) % options.length
      obs.poleCount = options[nextIndex]
    }
  }

  // NEW: Renumber Action
  function renumberObstacle(id, number) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs) {
      obs.number = number
    }
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
    importMapFromData,
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
    deleteFolder,
    sport,
    agilityObstacles,
    nextNumber, // <--- Export
    addAgilityObstacle,
    removeAgilityObstacle,
    rotateAgilityObstacle,
    cycleAgilityShape,
    cycleAgilityPoles,
    renumberObstacle, // <--- Export
    notification,
    showNotification
  }
})
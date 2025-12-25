import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  collection, addDoc, getDocs, query, where, 
  doc, updateDoc, deleteDoc, writeBatch
} from 'firebase/firestore'
import { db } from '../firebase'
import { useUserStore } from './userStore'
import { BH_RULES, AGILITY_RULES } from '../utils/validation'
import { mapService } from '../services/mapService'
import { libraryService } from '../services/libraryService'

// Helper: Rotate a point (x,y) around a center (cx,cy)
function rotatePoint(x, y, cx, cy, angleDeg) {
  const rad = (Math.PI / 180) * angleDeg
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - cx
  const dy = y - cy
  return {
    x: (dx * cos - dy * sin) + cx,
    y: (dx * sin + dy * cos) + cy
  }
}

export const useMapStore = defineStore('map', () => {
  // --- CONFIGURATION ---
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
  const savedMaps = ref([])
  const sport = ref('barnhunt') // <--- RESTORED THIS VARIABLE
  
  // --- ITEMS ---
  const bales = ref([])
  const agilityObstacles = ref([]) 
  const scentWorkObjects = ref([]) 

  // --- EDITOR STATE ---
  const currentLayer = ref(1)
  const selectedBaleId = ref(null)
  const selection = ref([]) // Array of IDs
  const isDraggingSelection = ref(false)
  const activeTool = ref('bale')
  const nextNumber = ref(1) 
  const notification = ref(null)

  // === HISTORY SYSTEM (UNDO/REDO) ===
  const history = ref([])
  const future = ref([])

  function snapshot() {
    future.value = []
    const state = JSON.stringify({
      bales: bales.value,
      agilityObstacles: agilityObstacles.value,
      scentWorkObjects: scentWorkObjects.value,
      hides: hides.value,
      boardEdges: boardEdges.value,
      dcMats: dcMats.value,
      startBox: startBox.value,
      ringDimensions: ringDimensions.value,
      masterBlinds: masterBlinds.value
    })
    history.value.push(state)
    if (history.value.length > 50) history.value.shift()
  }

function clearSelection() {
    selection.value = []
  }

// src/stores/mapStore.js

  async function saveSelectionToLibrary(name, thumbnail) { // <--- FIXED LINE
    const userStore = useUserStore()
    
    // 1. Validation
    if (selection.value.length === 0) {
      alert("Nothing selected! Select a tunnel first.")
      return
    }
    if (!userStore.user) {
      alert("You must be logged in.")
      return
    }

    // 2. Extract Data 
    const exportData = {
      bales: bales.value.filter(b => selection.value.includes(b.id)),
      boardEdges: boardEdges.value.filter(b => selection.value.includes(b.id)),
      dcMats: dcMats.value.filter(m => selection.value.includes(m.id)),
    }

    // 3. Send to Service
    try {
      await libraryService.addToLibrary(userStore.user, {
        name: name,
        sport: sport.value,
        type: 'tunnel',
        data: exportData,
        thumbnail: thumbnail // <--- Now this works because 'thumbnail' is defined above
      })
      alert(`Saved "${name}" to Library!`)
    } catch (e) {
      console.error(e)
      alert(e.message) 
    }
  }

  function restoreState(jsonString) {
    const data = JSON.parse(jsonString)
    bales.value = data.bales || []
    agilityObstacles.value = data.agilityObstacles || []
    scentWorkObjects.value = data.scentWorkObjects || []
    hides.value = data.hides || []
    boardEdges.value = data.boardEdges || []
    dcMats.value = data.dcMats || []
    startBox.value = data.startBox || null
    ringDimensions.value = data.ringDimensions || ringDimensions.value
    masterBlinds.value = data.masterBlinds || []
    validateAllBales()
  }

  function undo() {
    if (history.value.length === 0) return
    const current = JSON.stringify({
      bales: bales.value,
      agilityObstacles: agilityObstacles.value,
      scentWorkObjects: scentWorkObjects.value,
      hides: hides.value,
      boardEdges: boardEdges.value,
      dcMats: dcMats.value,
      startBox: startBox.value,
      ringDimensions: ringDimensions.value,
      masterBlinds: masterBlinds.value
    })
    future.value.push(current)
    const previous = history.value.pop()
    restoreState(previous)
  }

function deleteSelection() {
    // Safety check
    if (selection.value.length === 0) return

    snapshot() // Save history so we can Undo this mass deletion

    // Filter out ANY object whose ID is in the selection array
    bales.value = bales.value.filter(b => !selection.value.includes(b.id))
    boardEdges.value = boardEdges.value.filter(b => !selection.value.includes(b.id))
    dcMats.value = dcMats.value.filter(m => !selection.value.includes(m.id))
    hides.value = hides.value.filter(h => !selection.value.includes(h.id))
    
    // (Future proofing for other sports)
    agilityObstacles.value = agilityObstacles.value.filter(o => !selection.value.includes(o.id))
    scentWorkObjects.value = scentWorkObjects.value.filter(o => !selection.value.includes(o.id))

    // Clear the selection since those items are gone
    selection.value = []
    
    // Recalculate support for anything left behind
    validateAllBales()
  }

  function redo() {
    if (future.value.length === 0) return
    const current = JSON.stringify({
      bales: bales.value,
      agilityObstacles: agilityObstacles.value,
      scentWorkObjects: scentWorkObjects.value,
      hides: hides.value,
      boardEdges: boardEdges.value,
      dcMats: dcMats.value,
      startBox: startBox.value,
      ringDimensions: ringDimensions.value,
      masterBlinds: masterBlinds.value
    })
    history.value.push(current)
    const nextState = future.value.pop()
    restoreState(nextState)
  }

  // --- ACTIONS ---

  function showNotification(message, type = 'info') {
    notification.value = { message, type }
    setTimeout(() => { notification.value = null }, 3000)
  }

  function startDrawingBoard(x, y) {
    snapshot()
    const id = crypto.randomUUID()
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2
    boardEdges.value.push({ id, x1: snappedX, y1: snappedY, x2: snappedX, y2: snappedY })
    isDrawingBoard.value = id
  }

  function updateDrawingBoard(x, y) {
    if (!isDrawingBoard.value) return
    const board = boardEdges.value.find(b => b.id === isDrawingBoard.value)
    if (board) {
      board.x2 = Math.round(x * 2) / 2
      board.y2 = Math.round(y * 2) / 2
    }
  }

  function stopDrawingBoard() {
    if (!isDrawingBoard.value) return
    const board = boardEdges.value.find(b => b.id === isDrawingBoard.value)
    if (board && board.x1 === board.x2 && board.y1 === board.y2) {
      boardEdges.value = boardEdges.value.filter(b => b.id !== isDrawingBoard.value)
    }
    isDrawingBoard.value = null
  }

  // --- OBJECT MANAGEMENT ---

  function addBale(x, y) {
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2
    const newBale = {
      id: crypto.randomUUID(), x: snappedX, y: snappedY,
      rotation: 0, layer: currentLayer.value, orientation: 'flat', lean: null, supported: true 
    }
    if (!isValidPlacement(newBale)) {
      showNotification("Cannot place here: Obstruction or Out of Bounds", 'error')
      return
    }
    snapshot()
    bales.value.push(newBale)
    validateAllBales()
  }


function selectArea(x, y, w, h) {
    const rX = w < 0 ? x + w : x
    const rY = h < 0 ? y + h : y
    const rW = Math.abs(w)
    const rH = Math.abs(h)

    // 1. Find Bales
    const hitBales = bales.value.filter(b => {
      const r = getBaleRect(b)
      return (r.x < rX + rW && r.x + r.w > rX && r.y < rY + rH && r.y + r.h > rY)
    }).map(b => b.id)

    // 2. Find Boards (Check if any part of the line is in the box)
    const hitBoards = boardEdges.value.filter(b => {
      // simplified: check if midpoint or endpoints are in rect
      // (For perfect line intersection, we'd need more math, but this is usually enough for a drag box)
      const minBx = Math.min(b.x1, b.x2); const maxBx = Math.max(b.x1, b.x2)
      const minBy = Math.min(b.y1, b.y2); const maxBy = Math.max(b.y1, b.y2)
      
      // Check overlap of bounding boxes
      return (minBx < rX + rW && maxBx > rX && minBy < rY + rH && maxBy > rY)
    }).map(b => b.id)

    selection.value = [...hitBales, ...hitBoards]
  }

function moveSelection(dx, dy) {
    // No snapshot here (handled by DragStart/End)
    // Apply delta to ALL selected items
    bales.value.forEach(b => {
      if (selection.value.includes(b.id)) {
        b.x += dx
        b.y += dy
      }
    })
    // Don't validate on every pixel move (performance), 
    // we validate on DragEnd in the component
  }
  
  function removeBale(id) {
    snapshot()
    bales.value = bales.value.filter(b => b.id !== id)
    selectedBaleId.value = null
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

  function rotateBale(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      snapshot()
      bale.rotation = (bale.rotation + 45) % 180
      validateAllBales()
    }
  }

  function cycleOrientation(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      snapshot()
      if (bale.orientation === 'flat') { bale.orientation = 'tall'; bale.lean = null }
      else if (bale.orientation === 'tall') { bale.orientation = 'pillar'; bale.lean = null }
      else { bale.orientation = 'flat' }
      validateAllBales()
    }
  }

  function cycleLean(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale && bale.orientation === 'flat') {
      snapshot()
      if (bale.lean === null) bale.lean = 'right'
      else if (bale.lean === 'right') bale.lean = 'left'
      else bale.lean = null
    }
  }

  // --- GENERIC ADD/REMOVE ---
  function addHide(x, y) {
    snapshot()
    hides.value.push({ id: crypto.randomUUID(), x: Math.round(x*2)/2, y: Math.round(y*2)/2, type: 'rat' })
  }
  function removeHide(id) { snapshot(); hides.value = hides.value.filter(h => h.id !== id) }
  function cycleHideType(id) { 
    const hide = hides.value.find(h => h.id === id)
    if (hide) {
      snapshot()
      hide.type = hide.type === 'rat' ? 'litter' : (hide.type === 'litter' ? 'empty' : 'rat')
    }
  }

  function addDCMat(x, y) {
    snapshot()
    dcMats.value.push({ id: crypto.randomUUID(), x: Math.round(x*2)/2, y: Math.round(y*2)/2, rotation: 0 })
  }
  function removeDCMat(id) { snapshot(); dcMats.value = dcMats.value.filter(m => m.id !== id) }
  function rotateDCMat(id) {
    const mat = dcMats.value.find(m => m.id === id)
    if (mat) { snapshot(); mat.rotation = (mat.rotation + 90) % 180 }
  }

  function addStartBox(x, y) { snapshot(); startBox.value = { x: Math.round(x*2)/2, y: Math.round(y*2)/2 } }
  function removeStartBox() { snapshot(); startBox.value = null }

  // --- AGILITY ---
  function addAgilityObstacle(type, x, y) {
    snapshot()
    agilityObstacles.value.push({ id: crypto.randomUUID(), type, x: Math.round(x*2)/2, y: Math.round(y*2)/2, rotation: 0, number: null, shape: 'straight', poleCount: 12 })
  }
  function removeAgilityObstacle(id) { snapshot(); agilityObstacles.value = agilityObstacles.value.filter(o => o.id !== id) }
  function rotateAgilityObstacle(id) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs) { snapshot(); obs.rotation = (obs.rotation + 45) % 360 }
  }
  function cycleAgilityShape(id) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs) { 
      snapshot()
      const shapes = ['straight', 'L', 'U']; 
      obs.shape = shapes[(shapes.indexOf(obs.shape || 'straight') + 1) % shapes.length]
    }
  }
  function cycleAgilityPoles(id) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs) {
      snapshot()
      const options = [12, 6, 2, 4, 8, 10]
      obs.poleCount = options[(options.indexOf(obs.poleCount || 12) + 1) % options.length]
    }
  }
  function renumberObstacle(id, number) {
    const obs = agilityObstacles.value.find(o => o.id === id)
    if (obs) { snapshot(); obs.number = number }
  }

  // --- SCENT WORK ---
  function addScentWorkObject(type, x, y) {
    snapshot()
    scentWorkObjects.value.push({ id: crypto.randomUUID(), type, x: Math.round(x*2)/2, y: Math.round(y*2)/2, rotation: 0, isHot: false })
  }
  function removeScentWorkObject(id) { snapshot(); scentWorkObjects.value = scentWorkObjects.value.filter(o => o.id !== id) }
  function rotateScentWorkObject(id) {
    const obj = scentWorkObjects.value.find(o => o.id === id)
    if (obj) { snapshot(); obj.rotation = (obj.rotation + 45) % 360 }
  }
  function toggleScentWorkHot(id) {
    const obj = scentWorkObjects.value.find(o => o.id === id)
    if (obj) { snapshot(); obj.isHot = !obj.isHot }
  }

  // --- BOARDS ---
  function removeBoardEdge(id) { snapshot(); boardEdges.value = boardEdges.value.filter(b => b.id !== id) }
  function updateBoardEndpoint(id, p, x, y) {
    const b = boardEdges.value.find(b => b.id === id)
    if (b) { if(p==='start'){b.x1=Math.round(x*2)/2; b.y1=Math.round(y*2)/2}else{b.x2=Math.round(x*2)/2; b.y2=Math.round(y*2)/2} }
  }
  function rotateBoard(id) {
    const board = boardEdges.value.find(b => b.id === id)
    if (board) {
      snapshot()
      const mx = (board.x1 + board.x2) / 2; const my = (board.y1 + board.y2) / 2
      const rad = (45 * Math.PI) / 180; const cos = Math.cos(rad); const sin = Math.sin(rad)
      const dx1 = board.x1 - mx; const dy1 = board.y1 - my; const rx1 = (dx1 * cos - dy1 * sin) + mx; const ry1 = (dx1 * sin + dy1 * cos) + my
      const dx2 = board.x2 - mx; const dy2 = board.y2 - my; const rx2 = (dx2 * cos - dy2 * sin) + mx; const ry2 = (dx2 * sin + dy2 * cos) + my
      board.x1 = Math.round(rx1*2)/2; board.y1 = Math.round(ry1*2)/2; board.x2 = Math.round(rx2*2)/2; board.y2 = Math.round(ry2*2)/2
    }
  }

  // --- BARN HUNT HELPER: GENERATE MASTER BLINDS ---
  function generateMasterBlinds(count) {
    snapshot()
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

// Helper for true dimensions
  function getBaleRect(bale) {
    let w, h
    const isRotated = bale.rotation % 180 !== 0
    if (bale.orientation === 'tall') { w = isRotated ? 1 : 3; h = isRotated ? 3 : 1 }
    else if (bale.orientation === 'pillar') { w = isRotated ? 1 : 1.5; h = isRotated ? 1.5 : 1 }
    else { w = isRotated ? 1.5 : 3; h = isRotated ? 3 : 1.5 }
    return { x: bale.x, y: bale.y, w, h }
  }


function selectBale(id, multi = false) {
    if (multi) {
      if (selection.value.includes(id)) {
        selection.value = selection.value.filter(i => i !== id)
      } else {
        selection.value.push(id)
      }
    } else {
      selection.value = [id]
    }
  }

  // --- HELPERS ---
  const currentGuidelines = computed(() => sport.value === 'agility' ? (AGILITY_RULES[classLevel.value] || AGILITY_RULES['Other']) : (BH_RULES[classLevel.value] || BH_RULES['Other']))
  function setTool(tool) { activeTool.value = tool }
  
function hasSupport(newBale) {
    if (newBale.layer === 1) return true
    
    const r1 = getBaleRect(newBale)
    let totalSupportArea = 0
    
    // Find bales on the layer directly below
    const lowerLayer = bales.value.filter(b => b.layer === newBale.layer - 1)
    
    lowerLayer.forEach(baseBale => {
      const r2 = getBaleRect(baseBale)
      
      // Calculate Overlap
      const x_overlap = Math.max(0, Math.min(r1.x + r1.w, r2.x + r2.w) - Math.max(r1.x, r2.x))
      const y_overlap = Math.max(0, Math.min(r1.y + r1.h, r2.y + r2.h) - Math.max(r1.y, r2.y))
      
      totalSupportArea += (x_overlap * y_overlap)
    })
    
    // Rule: Needs at least 1 sq ft of support (approx 20% of a bale) to be safe
    return totalSupportArea >= 1.0
  }

function isValidPlacement(newBale) {
    const r1 = getBaleRect(newBale)
    
    // 1. Check Ring Bounds
    if (r1.x < 0 || r1.y < 0 || r1.x + r1.w > ringDimensions.value.width || r1.y + r1.h > ringDimensions.value.height) {
      return false
    }

    // 2. Check Collision with SAME layer
    // (We accept 90-degree rotations, but simple overlap check is enough for now)
    return !bales.value.some(existing => {
      if (existing.id === newBale.id) return false // Don't collide with self
      if (existing.layer !== newBale.layer) return false // Ignore other layers
      
      const r2 = getBaleRect(existing)
      
      // AABB Collision Check
      return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y)
    })
  }

function validateAllBales() {
    bales.value.forEach(bale => {
      const r = getBaleRect(bale)
      const outOfBounds = r.x < 0 || r.y < 0 || r.x + r.w > ringDimensions.value.width || r.y + r.h > ringDimensions.value.height
      bale.supported = !outOfBounds && hasSupport(bale)
    })
  }

// src/stores/mapStore.js

  function mergeMapFromJSON(jsonString) {
    snapshot()
    try {
      const data = JSON.parse(jsonString)
      const newItems = []
      
      // 1. Merge Bales
      if (data.bales) {
        data.bales.forEach(b => {
          const newId = crypto.randomUUID()
          // create a copy to avoid reference issues
          const newBale = { ...b, id: newId }
          bales.value.push(newBale)
          newItems.push(newId)
        })
      }

      // 2. Merge Boards (THIS WAS MISSING)
      if (data.boardEdges) {
        data.boardEdges.forEach(b => {
          const newId = crypto.randomUUID()
          const newBoard = { ...b, id: newId }
          boardEdges.value.push(newBoard)
          newItems.push(newId)
        })
      }

      // 3. Merge DC Mats (Just in case you have mats in your tunnels)
      if (data.dcMats) {
        data.dcMats.forEach(m => {
          const newId = crypto.randomUUID()
          const newMat = { ...m, id: newId }
          dcMats.value.push(newMat)
          newItems.push(newId)
        })
      }
      
      // 4. Select the new items
      // This allows you to immediately drag the imported group
      selection.value = newItems
      
      validateAllBales()
      // Force reactivity
      bales.value = [...bales.value]
      boardEdges.value = [...boardEdges.value]
      
      alert("Tunnel loaded successfully!")
      
    } catch (e) {
      console.error(e)
      alert("Failed to merge file. Invalid JSON.")
    }
  }


  function resizeRing(width, height) {
    snapshot()
    const w = Math.max(10, parseInt(width)); const h = Math.max(10, parseInt(height))
    ringDimensions.value = { width: w, height: h }
    bales.value.forEach(b => { if (b.x >= w) b.x = w - 3.5; if (b.y >= h) b.y = h - 3.5 })
    agilityObstacles.value.forEach(o => { if (o.x >= w) o.x = w - 5; if (o.y >= h) o.y = h - 5 })
    scentWorkObjects.value.forEach(o => { if (o.x >= w) o.x = w - 3; if (o.y >= h) o.y = h - 3 })
    boardEdges.value.forEach(b => { if (b.x1 > w) b.x1 = w; if (b.x2 > w) b.x2 = w; if (b.y1 > h) b.y1 = h; if (b.y2 > h) b.y2 = h })
    validateAllBales() 
  }

  // --- STATISTICS ---
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

  // --- PERSISTENCE ---
  function reset() {
    bales.value = []; boardEdges.value = []; hides.value = []; dcMats.value = []; masterBlinds.value = []; startBox.value = null
    agilityObstacles.value = []; scentWorkObjects.value = []; nextNumber.value = 1; history.value = []; future.value = []
    currentMapId.value = null; mapName.value = "Untitled Map"; classLevel.value = "Novice"; sport.value = 'barnhunt'
    ringDimensions.value = { width: 24, height: 24 }; previousClassCount.value = 0; currentLayer.value = 1; activeTool.value = 'bale'
  }
  function exportMapToJSON() {
    const data = { version: 1, name: mapName.value, level: classLevel.value, sport: sport.value, dcMats: dcMats.value, dimensions: ringDimensions.value, bales: bales.value, agilityObstacles: agilityObstacles.value, scentWorkObjects: scentWorkObjects.value, hides: hides.value, isShared: isShared.value, masterBlinds: masterBlinds.value, boardEdges: boardEdges.value, previousClassCount: previousClassCount.value }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${mapName.value.replace(/\s+/g, '_')}.json`; link.click()
  }
  function importMapFromJSON(jsonString) { try { importMapFromData(JSON.parse(jsonString)) } catch (e) { alert("Failed to parse map file."); console.error(e) } }
  
  function importMapFromData(data) {
    reset()
    mapName.value = data.name || "Imported Map"; classLevel.value = data.level || 'Novice'; sport.value = data.sport || 'barnhunt'
    ringDimensions.value = data.data?.dimensions || data.dimensions || { width: 24, height: 24 }
    bales.value = data.data?.bales || data.bales || []; agilityObstacles.value = data.data?.agilityObstacles || data.agilityObstacles || []
    scentWorkObjects.value = data.data?.scentWorkObjects || data.scentWorkObjects || []; dcMats.value = data.data?.dcMats || data.dcMats || []
    boardEdges.value = data.data?.boardEdges || data.boardEdges || []; hides.value = data.data?.hides || data.hides || []
    startBox.value = data.data?.startBox || null
    validateAllBales()
  }

  function loadMapFromData(id, data) {
    reset()
    currentMapId.value = id
    mapName.value = data.name
    classLevel.value = data.level || 'Novice'
    sport.value = data.sport || 'barnhunt'
    isShared.value = data.isShared || false
    currentFolderId.value = data.folderId || null
    
    // Support legacy and new data structures
    const mapData = data.data || data
    ringDimensions.value = mapData.dimensions || { width: 24, height: 24 }
    bales.value = mapData.bales || []
    agilityObstacles.value = mapData.agilityObstacles || []
    scentWorkObjects.value = mapData.scentWorkObjects || []
    dcMats.value = mapData.dcMats || []
    boardEdges.value = mapData.boardEdges || []
    hides.value = mapData.hides || []
    masterBlinds.value = data.masterBlinds || []
    startBox.value = mapData.startBox || null
    previousClassCount.value = mapData.previousClassCount || 0
    
    validateAllBales()
  }

// src/stores/mapStore.js

function commitDrag(id, newX, newY) {
    snapshot()
    
    // Attempt to find the "Leader" (the object we dragged)
    let startX, startY
    const bale = bales.value.find(b => b.id === id)
    
    if (bale) { 
      startX = bale.x; startY = bale.y 
    } else {
      // If we dragged something else (like a board handle?), we might need different logic.
      // For now, assuming we dragged a bale to move the group is safest.
      return 
    }

    const dx = newX - startX
    const dy = newY - startY

    if (!selection.value.includes(id)) {
      bale.x = Math.round(newX * 2) / 2
      bale.y = Math.round(newY * 2) / 2
    } else {
      // Move Bales
      bales.value.forEach(b => {
        if (selection.value.includes(b.id)) {
          b.x = Math.round((b.x + dx) * 2) / 2
          b.y = Math.round((b.y + dy) * 2) / 2
        }
      })
      // Move Boards
      boardEdges.value.forEach(b => {
        if (selection.value.includes(b.id)) {
          b.x1 = Math.round((b.x1 + dx) * 2) / 2
          b.y1 = Math.round((b.y1 + dy) * 2) / 2
          b.x2 = Math.round((b.x2 + dx) * 2) / 2
          b.y2 = Math.round((b.y2 + dy) * 2) / 2
        }
      })
    }
    
    validateAllBales()
    bales.value = [...bales.value]     // Trigger Reactivity
    boardEdges.value = [...boardEdges.value] 
  }

  function rotateSelection() {
    if (selection.value.length === 0) return
    snapshot()

    // 1. Calculate Center of Selection
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    // Bounds of Bales
    bales.value.forEach(b => {
      if (selection.value.includes(b.id)) {
        const r = getBaleRect(b)
        minX = Math.min(minX, r.x); minY = Math.min(minY, r.y)
        maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h)
      }
    })
    // Bounds of Boards
    boardEdges.value.forEach(b => {
      if (selection.value.includes(b.id)) {
        minX = Math.min(minX, b.x1, b.x2); minY = Math.min(minY, b.y1, b.y2)
        maxX = Math.max(maxX, b.x1, b.x2); maxY = Math.max(maxY, b.y1, b.y2)
      }
    })

    if (minX === Infinity) return 

    // Center point (Grid Aligned)
    const cx = Math.round(((minX + maxX) / 2) * 2) / 2
    const cy = Math.round(((minY + maxY) / 2) * 2) / 2

    // 2. Rotate Bales (90 deg clockwise)
    bales.value.forEach(b => {
      if (selection.value.includes(b.id)) {
        // We rotate the CENTER of the bale
        const r = getBaleRect(b)
        const bcx = r.x + r.w/2
        const bcy = r.y + r.h/2
        
        const newCenter = rotatePoint(bcx, bcy, cx, cy, 90)
        
        // Update Rotation (Keep it 0-360 positive)
        b.rotation = (b.rotation + 90) % 360
        
        // Recalculate Top-Left from new center + new dimensions
        const newR = getBaleRect(b) // b has new rotation now
        b.x = Math.round((newCenter.x - newR.w/2)*2)/2
        b.y = Math.round((newCenter.y - newR.h/2)*2)/2
      }
    })

    // 3. Rotate Boards
    boardEdges.value.forEach(b => {
      if (selection.value.includes(b.id)) {
        const p1 = rotatePoint(b.x1, b.y1, cx, cy, 90)
        const p2 = rotatePoint(b.x2, b.y2, cx, cy, 90)
        b.x1 = Math.round(p1.x*2)/2; b.y1 = Math.round(p1.y*2)/2
        b.x2 = Math.round(p2.x*2)/2; b.y2 = Math.round(p2.y*2)/2
      }
    })

    validateAllBales()
    bales.value = [...bales.value]
    boardEdges.value = [...boardEdges.value]
  }

  async function deleteMap(id) { try { await deleteDoc(doc(db, "maps", id)); if (currentMapId.value === id) currentMapId.value = null } catch (e) { console.error("Delete failed", e); alert("Failed to delete map.") } }
  async function renameMap(id, newName) { try { await updateDoc(doc(db, "maps", id), { name: newName }); if (currentMapId.value === id) mapName.value = newName } catch (e) { console.error(e) } }
  async function saveToCloud(isAutoSave = false) {
    const userStore = useUserStore()
    
    // 1. Silent fail if not logged in (don't bug user while editing)
    if (!userStore.user) {
      if (!isAutoSave) alert("Please log in to save.")
      return
    }
    
    // 2. Silent fail if untitled (user hasn't formally named/saved it yet)
    if (!mapName.value || mapName.value === "Untitled Map") {
      if (!isAutoSave) alert("Please enter a custom name for your map.")
      return
    }

    const mapData = {
      uid: userStore.user.uid,
      name: mapName.value.trim(),
      folderId: currentFolderId.value,
      isShared: isShared.value,
      level: classLevel.value, 
      sport: sport.value,
      thumbnail: thumbnail,
      updatedAt: new Date(),
      data: {
        dimensions: ringDimensions.value,
        bales: bales.value,
        agilityObstacles: agilityObstacles.value,
        scentWorkObjects: scentWorkObjects.value, 
        dcMats: dcMats.value,
        masterBlinds: masterBlinds.value,
        boardEdges: boardEdges.value,
        previousClassCount: previousClassCount.value,
        isShared: isShared.value,
        hides: hides.value,
        startBox: startBox.value
      }
    }

try {
    if (currentMapId.value) {
      await mapService.updateMap(currentMapId.value, mapData)
      if (!isAutoSave) alert("Map updated!")
    } else {
      if (!isAutoSave) {
        const newId = await mapService.createMap(mapData)
        currentMapId.value = newId
        alert("Map saved!")
      }
    }
  } catch (e) {
    console.error(e)
  }
  }
 async function loadUserMaps() {
     if (!useUserStore().user) return
     const q = query(collection(db, "maps"), where("uid", "==", useUserStore().user.uid))
     const snapshot = await getDocs(q)
     savedMaps.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
     return savedMaps.value
  }
  async function createFolder(name) { if (!useUserStore().user) return; await addDoc(collection(db, "folders"), { uid: useUserStore().user.uid, name, createdAt: new Date() }); await loadUserFolders() }
  async function loadUserFolders() { if (!useUserStore().user) return; folders.value = (await getDocs(query(collection(db, "folders"), where("uid", "==", useUserStore().user.uid)))).docs.map(doc => ({ id: doc.id, ...doc.data() })) }
  async function moveMap(mapId, fid) { await updateDoc(doc(db, "maps", mapId), { folderId: fid }); if (currentMapId.value === mapId) currentFolderId.value = fid }
  async function deleteFolder(fid) { if (!confirm("Delete folder?")) return; const batch = writeBatch(db); (await getDocs(query(collection(db, "maps"), where("folderId", "==", fid)))).docs.forEach(d => batch.update(d.ref, { folderId: null })); batch.delete(doc(db, "folders", fid)); await batch.commit(); await loadUserFolders(); await loadUserMaps() }

  return {
    ringDimensions, gridSize, bales, currentLayer, selectedBaleId, addBale, removeBale, rotateBale, cycleOrientation, cycleLean, updateBalePosition, hasSupport, validateAllBales, resizeRing, activeTool, setTool, boardEdges, removeBoardEdge, isDrawingBoard, updateDrawingBoard, stopDrawingBoard, startDrawingBoard, exportMapToJSON, importMapFromJSON, importMapFromData, saveToCloud, loadUserMaps, loadMapFromData, deleteMap, renameMap, dcMats, addDCMat, removeDCMat, rotateDCMat, startBox, addStartBox, removeStartBox, currentGuidelines, classLevel, previousClassCount, inventory, balesByLayer, baleCounts, mapName, hides, addHide, removeHide, cycleHideType, reset, masterBlinds, generateMasterBlinds, isShared, updateBoardEndpoint, rotateBoard, currentMapId, folders, currentFolderId, createFolder, loadUserFolders, moveMap, deleteFolder, sport, agilityObstacles, nextNumber, addAgilityObstacle, removeAgilityObstacle, rotateAgilityObstacle, cycleAgilityShape, cycleAgilityPoles, renumberObstacle, notification, showNotification, scentWorkObjects, addScentWorkObject, removeScentWorkObject, rotateScentWorkObject, toggleScentWorkHot,
    history, future, mergeMapFromJSON, savedMaps,deleteSelection, saveSelectionToLibrary, rotateSelection, undo, redo, snapshot, selection, clearSelection, selectBale, selectArea, moveSelection, isDraggingSelection, commitDrag 
  }
})
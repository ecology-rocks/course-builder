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
  const sport = ref('barnhunt') // <--- RESTORED THIS VARIABLE
  
  // --- ITEMS ---
  const bales = ref([])
  const agilityObstacles = ref([]) 
  const scentWorkObjects = ref([]) 

  // --- EDITOR STATE ---
  const currentLayer = ref(1)
  const selectedBaleId = ref(null)
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

  // --- HELPERS ---
  const currentGuidelines = computed(() => sport.value === 'agility' ? (AGILITY_RULES[classLevel.value] || AGILITY_RULES['Other']) : (BH_RULES[classLevel.value] || BH_RULES['Other']))
  function setTool(tool) { activeTool.value = tool }
  
  function hasSupport(newBale) {
    if (newBale.layer === 1) return true
    const lowerLayer = bales.value.filter(b => b.layer === newBale.layer - 1)
    const newW = newBale.rotation % 180 === 0 ? 3 : 1.5; const newH = newBale.rotation % 180 === 0 ? 1.5 : 3
    let totalSupportArea = 0
    lowerLayer.forEach(baseBale => {
      const baseW = baseBale.rotation % 180 === 0 ? 3 : 1.5; const baseH = baseBale.rotation % 180 === 0 ? 1.5 : 3
      const x_overlap = Math.max(0, Math.min(newBale.x + newW, baseBale.x + baseW) - Math.max(newBale.x, baseBale.x))
      const y_overlap = Math.max(0, Math.min(newBale.y + newH, baseBale.y + baseH) - Math.max(newBale.y, baseBale.y))
      totalSupportArea += (x_overlap * y_overlap)
    })
    return totalSupportArea >= 1.0
  }

  function isValidPlacement(newBale) {
    let w, h; const isRotated = newBale.rotation % 180 !== 0
    if (newBale.orientation === 'flat') { w = isRotated ? 1.5 : 3; h = isRotated ? 3 : 1.5 }
    else if (newBale.orientation === 'tall') { w = isRotated ? 1 : 3; h = isRotated ? 3 : 1 }
    else { w = isRotated ? 1 : 1.5; h = isRotated ? 1.5 : 1 }
    if (newBale.x < 0 || newBale.x + w > ringDimensions.value.width || newBale.y < 0 || newBale.y + h > ringDimensions.value.height) return false
    if (newBale.rotation % 90 !== 0) return true
    return !bales.value.some(existing => {
      if (existing.layer !== newBale.layer || existing.rotation % 90 !== 0) return false
      const exRotated = existing.rotation % 180 !== 0; let exW, exH
      if (existing.orientation === 'flat') { exW = exRotated ? 1.5 : 3; exH = exRotated ? 3 : 1.5 }
      else if (existing.orientation === 'tall') { exW = exRotated ? 1 : 3; exH = exRotated ? 3 : 1 }
      else { exW = exRotated ? 1 : 1.5; exH = exRotated ? 1.5 : 1 }
      return (newBale.x < existing.x + exW && newBale.x + w > existing.x && newBale.y < existing.y + exH && newBale.y + h > existing.y)
    })
  }

  function validateAllBales() {
    bales.value.forEach(bale => {
      let w, h; const isRotated = bale.rotation % 180 !== 0
      if (bale.orientation === 'flat') { w = isRotated ? 1.5 : 3; h = isRotated ? 3 : 1.5 }
      else if (bale.orientation === 'tall') { w = isRotated ? 1 : 3; h = isRotated ? 3 : 1 }
      else { w = isRotated ? 1 : 1.5; h = isRotated ? 1.5 : 1 }
      const outOfBounds = bale.x < 0 || bale.y < 0 || bale.x + w > ringDimensions.value.width || bale.y + h > ringDimensions.value.height
      bale.supported = !outOfBounds && hasSupport(bale)
    })
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
  async function loadUserMaps() { if (!useUserStore().user) return []; const q = query(collection(db, "maps"), where("uid", "==", useUserStore().user.uid)); return (await getDocs(q)).docs.map(doc => ({ id: doc.id, ...doc.data() })) }
  async function createFolder(name) { if (!useUserStore().user) return; await addDoc(collection(db, "folders"), { uid: useUserStore().user.uid, name, createdAt: new Date() }); await loadUserFolders() }
  async function loadUserFolders() { if (!useUserStore().user) return; folders.value = (await getDocs(query(collection(db, "folders"), where("uid", "==", useUserStore().user.uid)))).docs.map(doc => ({ id: doc.id, ...doc.data() })) }
  async function moveMap(mapId, fid) { await updateDoc(doc(db, "maps", mapId), { folderId: fid }); if (currentMapId.value === mapId) currentFolderId.value = fid }
  async function deleteFolder(fid) { if (!confirm("Delete folder?")) return; const batch = writeBatch(db); (await getDocs(query(collection(db, "maps"), where("folderId", "==", fid)))).docs.forEach(d => batch.update(d.ref, { folderId: null })); batch.delete(doc(db, "folders", fid)); await batch.commit(); await loadUserFolders(); await loadUserMaps() }

  return {
    ringDimensions, gridSize, bales, currentLayer, selectedBaleId, addBale, removeBale, rotateBale, cycleOrientation, cycleLean, updateBalePosition, hasSupport, validateAllBales, resizeRing, activeTool, setTool, boardEdges, removeBoardEdge, isDrawingBoard, updateDrawingBoard, stopDrawingBoard, startDrawingBoard, exportMapToJSON, importMapFromJSON, importMapFromData, saveToCloud, loadUserMaps, loadMapFromData, deleteMap, renameMap, dcMats, addDCMat, removeDCMat, rotateDCMat, startBox, addStartBox, removeStartBox, currentGuidelines, classLevel, previousClassCount, inventory, balesByLayer, baleCounts, mapName, hides, addHide, removeHide, cycleHideType, reset, masterBlinds, generateMasterBlinds, isShared, updateBoardEndpoint, rotateBoard, currentMapId, folders, currentFolderId, createFolder, loadUserFolders, moveMap, deleteFolder, sport, agilityObstacles, nextNumber, addAgilityObstacle, removeAgilityObstacle, rotateAgilityObstacle, cycleAgilityShape, cycleAgilityPoles, renumberObstacle, notification, showNotification, scentWorkObjects, addScentWorkObject, removeScentWorkObject, rotateScentWorkObject, toggleScentWorkHot,
    history, future, undo, redo, snapshot 
  }
})
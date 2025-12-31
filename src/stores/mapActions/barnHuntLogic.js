import { computed } from 'vue'

/**
 * src/stores/mapActions/barnHuntLogic.js
 * Contains logic for Barn Hunt: Bales, Boards, Mats, Hides, Start Boxes, and Statistics.
 */
export function useBarnHuntLogic(state, snapshot, notifications) {

  // --- STATISTICS (Moved from Main Store) ---
  const balesByLayer = computed(() => ({
      1: state.bales.value.filter(b => b.layer === 1),
      2: state.bales.value.filter(b => b.layer === 2),
      3: state.bales.value.filter(b => b.layer === 3)
  }))

  const baleCounts = computed(() => ({ 
    total: state.bales.value.length, 
    base: balesByLayer.value[1].length 
  }))

  const inventory = computed(() => {
    const total = state.bales.value.length
    const delta = total - state.previousClassCount.value
    return {
      total,
      base: state.bales.value.filter(b => b.layer === 1).length,
      layer2: state.bales.value.filter(b => b.layer === 2).length,
      layer3: state.bales.value.filter(b => b.layer === 3).length,
      deltaString: delta > 0 ? `+${delta}` : `${delta}`,
      isNestingValid: total > 0 
    }
  })

  // --- PHYSICS & VALIDATION HELPERS ---

function getBaleRect(bale) {
    // 1. Determine "Unrotated" Dimensions (How the bale is stored in memory)
    // These must match the visual offsets used in your Layer component
    const L = state.baleConfig.value.length
    const W = state.baleConfig.value.width
    const H = state.baleConfig.value.height


let uw, uh
    if (bale.orientation === 'tall') { 
      // On side: Length x Height
      uw = L; uh = H 
    } else if (bale.orientation === 'pillar') { 
      // On end: Width x Height
      uw = W; uh = H 
    } else { 
      // Flat: Length x Width
      uw = L; uh = W 
    }

    // 2. Determine Center Point (Rotation happens around this point)
    const cx = bale.x + (uw / 2)
    const cy = bale.y + (uh / 2)

    // 3. Determine "Rotated" Dimensions (The actual visual bounding box)
    const isRotated = bale.rotation % 180 !== 0
    const rw = isRotated ? uh : uw
    const rh = isRotated ? uw : uh

    // 4. Calculate True Top-Left of the bounding box
    const rx = cx - (rw / 2)
    const ry = cy - (rh / 2)

    return { x: rx, y: ry, w: rw, h: rh }
  }

  function hasSupport(newBale) {
    if (newBale.layer === 1) return true
    
    const r1 = getBaleRect(newBale)
    let totalSupportArea = 0
    
    // Find bales on the layer directly below
    const lowerLayer = state.bales.value.filter(b => b.layer === newBale.layer - 1)
    
    lowerLayer.forEach(baseBale => {
      const r2 = getBaleRect(baseBale)
      
      // Calculate Overlap
      const x_overlap = Math.max(0, Math.min(r1.x + r1.w, r2.x + r2.w) - Math.max(r1.x, r2.x))
      const y_overlap = Math.max(0, Math.min(r1.y + r1.h, r2.y + r2.h) - Math.max(r1.y, r2.y))
      
      totalSupportArea += (x_overlap * y_overlap)
    })
    
    // Rule: Needs at least 1 sq ft of support
    return totalSupportArea >= 1.0
  }

function isValidPlacement(newBale) {
    const r1 = getBaleRect(newBale)
    
    // 1. Check Ring Bounds
    if (r1.x < 0 || r1.y < 0 || r1.x + r1.w > state.ringDimensions.value.width || r1.y + r1.h > state.ringDimensions.value.height) {
      return false
    }

    // 2. Collision Check REMOVED
    return true
  }

function validateAllBales() {
    state.bales.value.forEach(bale => {
      const r = getBaleRect(bale)
      const outOfBounds = r.x < 0 || r.y < 0 || r.x + r.w > state.ringDimensions.value.width || r.y + r.h > state.ringDimensions.value.height
      // Logic stripped: Bale is supported if it is not out of bounds
      bale.supported = !outOfBounds
    })
  }

  // --- BALE ACTIONS ---

  function addBale(x, y) {
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2
    const newBale = {
      id: crypto.randomUUID(), x: snappedX, y: snappedY,
      rotation: 0, layer: state.currentLayer.value, orientation: 'flat', lean: null, supported: true 
    }
    if (!isValidPlacement(newBale)) {
      notifications.show("Cannot place here: Obstruction or Out of Bounds", 'error')
      return
    }
    snapshot()
    state.bales.value.push(newBale)
    validateAllBales()
  }

  function removeBale(id) {
    snapshot()
    state.bales.value = state.bales.value.filter(b => b.id !== id)
    if (state.selectedBaleId.value === id) state.selectedBaleId.value = null
    validateAllBales()
  }

  function updateBalePosition(id, newX, newY) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      bale.x = Math.round(newX * 2) / 2
      bale.y = Math.round(newY * 2) / 2
    }
    validateAllBales()
  }

  function rotateBale(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      snapshot()
      bale.rotation = (bale.rotation + 45) % 180
      validateAllBales()
    }
  }

  function cycleOrientation(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      snapshot()
      if (bale.orientation === 'flat') { bale.orientation = 'tall'; bale.lean = null }
      else if (bale.orientation === 'tall') { bale.orientation = 'pillar'; bale.lean = null }
      else { bale.orientation = 'flat' }
      validateAllBales()
    }
  }

  function cycleLean(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale && bale.orientation === 'flat') {
      snapshot()
      if (bale.lean === null) bale.lean = 'right'
      else if (bale.lean === 'right') bale.lean = 'left'
      else bale.lean = null
    }
  }

  // --- BOARD ACTIONS ---

  function startDrawingBoard(x, y) {
    snapshot()
    const id = crypto.randomUUID()
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2
    state.boardEdges.value.push({ id, x1: snappedX, y1: snappedY, x2: snappedX, y2: snappedY })
    state.isDrawingBoard.value = id
  }

  function updateDrawingBoard(x, y) {
    if (!state.isDrawingBoard.value) return
    const board = state.boardEdges.value.find(b => b.id === state.isDrawingBoard.value)
    if (board) {
      board.x2 = Math.round(x * 2) / 2
      board.y2 = Math.round(y * 2) / 2
    }
  }

  function stopDrawingBoard() {
    if (!state.isDrawingBoard.value) return
    const board = state.boardEdges.value.find(b => b.id === state.isDrawingBoard.value)
    if (board && board.x1 === board.x2 && board.y1 === board.y2) {
      state.boardEdges.value = state.boardEdges.value.filter(b => b.id !== state.isDrawingBoard.value)
    }
    state.isDrawingBoard.value = null
  }

  function removeBoardEdge(id) { snapshot(); state.boardEdges.value = state.boardEdges.value.filter(b => b.id !== id) }
  
  function updateBoardEndpoint(id, p, x, y) {
    const b = state.boardEdges.value.find(b => b.id === id)
    if (b) { if(p==='start'){b.x1=Math.round(x*2)/2; b.y1=Math.round(y*2)/2}else{b.x2=Math.round(x*2)/2; b.y2=Math.round(y*2)/2} }
  }
  
  function rotateBoard(id) {
    const board = state.boardEdges.value.find(b => b.id === id)
    if (board) {
      snapshot()
      const mx = (board.x1 + board.x2) / 2; const my = (board.y1 + board.y2) / 2
      const rad = (45 * Math.PI) / 180; const cos = Math.cos(rad); const sin = Math.sin(rad)
      const dx1 = board.x1 - mx; const dy1 = board.y1 - my; const rx1 = (dx1 * cos - dy1 * sin) + mx; const ry1 = (dx1 * sin + dy1 * cos) + my
      const dx2 = board.x2 - mx; const dy2 = board.y2 - my; const rx2 = (dx2 * cos - dy2 * sin) + mx; const ry2 = (dx2 * sin + dy2 * cos) + my
      board.x1 = Math.round(rx1*2)/2; board.y1 = Math.round(ry1*2)/2; board.x2 = Math.round(rx2*2)/2; board.y2 = Math.round(ry2*2)/2
    }
  }

  // --- HIDE/MAT/MISC ACTIONS ---

  function addHide(x, y) {
    snapshot()
    state.hides.value.push({ id: crypto.randomUUID(), x: Math.round(x*2)/2, y: Math.round(y*2)/2, type: 'rat' })
  }
  function removeHide(id) { snapshot(); state.hides.value = state.hides.value.filter(h => h.id !== id) }
  function cycleHideType(id) { 
    const hide = state.hides.value.find(h => h.id === id)
    if (hide) {
      snapshot()
      hide.type = hide.type === 'rat' ? 'litter' : (hide.type === 'litter' ? 'empty' : 'rat')
    }
  }

  function addDCMat(x, y) {
    snapshot()
    state.dcMats.value.push({ id: crypto.randomUUID(), x: Math.round(x*2)/2, y: Math.round(y*2)/2, rotation: 0 })
  }
  function removeDCMat(id) { snapshot(); state.dcMats.value = state.dcMats.value.filter(m => m.id !== id) }
  function rotateDCMat(id) {
    const mat = state.dcMats.value.find(m => m.id === id)
    if (mat) { snapshot(); mat.rotation = (mat.rotation + 90) % 180 }
  }

  function addStartBox(x, y) { snapshot(); state.startBox.value = { x: Math.round(x*2)/2, y: Math.round(y*2)/2 } }
  function removeStartBox() { snapshot(); state.startBox.value = null }

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
    state.masterBlinds.value = newBlinds
  }

  return {
    validateAllBales, getBaleRect, hasSupport, isValidPlacement,
    addBale, removeBale, rotateBale, cycleOrientation, cycleLean, updateBalePosition,
    addHide, removeHide, cycleHideType, 
    addDCMat, removeDCMat, rotateDCMat,
    addStartBox, removeStartBox, generateMasterBlinds,
    startDrawingBoard, updateDrawingBoard, stopDrawingBoard, removeBoardEdge, updateBoardEndpoint, rotateBoard,
    // Exports computed stats
    balesByLayer, baleCounts, inventory
  }
}
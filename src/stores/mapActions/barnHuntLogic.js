import { computed } from 'vue'

/**
 * src/stores/mapActions/barnHuntLogic.js
 * Contains logic for Barn Hunt: Bales, Boards, Mats, Hides, Start Boxes, and Statistics.
 */
export function useBarnHuntLogic(state, snapshot, notifications) {


  function snapToGrid(val) {
  return Math.round(val * 6) / 6
}

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

  const differentials = computed(() => {
    // If no previous map data, return null
    if (!state.previousBales.value || state.previousBales.value.length === 0) return null

    const stats = {
      1: { net: 0, moved: 0 },
      2: { net: 0, moved: 0 },
      3: { net: 0, moved: 0 }
    }

    const getLayers = (baleList) => ({
      1: baleList.filter(b => b.layer === 1),
      2: baleList.filter(b => b.layer === 2),
      3: baleList.filter(b => b.layer === 3)
    })

    const currentLayers = getLayers(state.bales.value)
    const prevLayers = getLayers(state.previousBales.value)

    ;[1, 2, 3].forEach(layer => {
      const curr = currentLayers[layer]
      const prev = prevLayers[layer] // We will clone this to splice out matches

      // 1. Calculate Net Change (e.g. 10 -> 12 = +2)
      stats[layer].net = curr.length - prev.length

      // 2. Calculate "Moved" using Spatial Matching (Ignore IDs)
      // Logic: Count how many bales are physically identical (Static).
      // Any bale that ISN'T static but is within the count of "reused" bales is a Move.
      
      let staticCount = 0
      const prevPool = [...prev] // Clone to consume matches

      curr.forEach(bale => {
        // Look for a bale in previous map at same X, Y, Rotation, Orientation
        const matchIndex = prevPool.findIndex(p => 
          Math.abs(p.x - bale.x) < 0.05 && 
          Math.abs(p.y - bale.y) < 0.05 &&
          p.rotation === bale.rotation &&
          p.orientation === bale.orientation
        )

        if (matchIndex !== -1) {
          staticCount++
          prevPool.splice(matchIndex, 1) // Remove so we don't count it twice
        }
      })

      // Formula: 
      // If we have 10 old bales and 12 new bales, and 8 are static:
      // We reused 10 old bales. 8 sat still. 2 moved. (And 2 were added).
      // Moved = Min(OldTotal, NewTotal) - Static
      const reusedCount = Math.min(curr.length, prev.length)
      stats[layer].moved = reusedCount - staticCount
    })

    return stats
  })

  // --- PHYSICS & VALIDATION HELPERS ---

// --- ADD THESE DELETION FUNCTIONS ---
  function removeStep(id) {
    snapshot()
    state.steps.value = state.steps.value.filter(s => s.id !== id)
  }

  function removeZone(id) {
    snapshot()
    state.zones.value = state.zones.value.filter(z => z.id !== id)
  }

  function removeGate() {
    snapshot()
    state.gate.value = null
  }

  
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

    // [UPDATED] Trigonometric Bounding Box (AABB)
    // This calculates the total width/height needed to encompass the rotated bale
    const rad = (bale.rotation * Math.PI) / 180
    const absCos = Math.abs(Math.cos(rad))
    const absSin = Math.abs(Math.sin(rad))

    const rw = (uw * absCos) + (uh * absSin)
    const rh = (uw * absSin) + (uh * absCos)

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


function addStep(x, y) {
    snapshot()
    // Default rotation 0, ID based on time
    state.steps.value.push({ id: Date.now().toString(), x, y, rotation: 0 })
  }

  function updateStep(id, attrs) {
    const s = state.steps.value.find(i => i.id === id)
    if (s) {
      snapshot()
      Object.assign(s, attrs)
    }
  }

  function setGate(gateData) {
    snapshot()
    // gateData should be { x, y, rotation }
    state.gate.value = gateData
  }

  function addZone(x, y, type) {
    snapshot()
    state.zones.value.push({
      id: Date.now().toString(),
      x, y, width: 5, height: 5, type, rotation: 0
    })
  }

  function updateZone(id, attrs) {
    const z = state.zones.value.find(i => i.id === id)
    if (z) {
      // We don't snapshot on every drag pixel usually, but you can if you want
      Object.assign(z, attrs)
    }
  }
  
  // --- BALE ACTIONS ---

  function addBale(x, y) {
    const snappedX = snapToGrid(x)
    const snappedY = snapToGrid(y)
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
      bale.x = snapToGrid(newX)
      bale.y = snapToGrid(newY)
    }
    validateAllBales()
  }

function rotateBale(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      snapshot()
      // [UPDATED] 15-degree increments, full 360 circle
      bale.rotation = (bale.rotation + 15) % 360
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
    const snappedX = snapToGrid(x)
    const snappedY = snapToGrid(y)
    state.boardEdges.value.push({ id, x1: snappedX, y1: snappedY, x2: snappedX, y2: snappedY })
    state.isDrawingBoard.value = id
  }

  function updateDrawingBoard(x, y) {
    if (!state.isDrawingBoard.value) return
    const board = state.boardEdges.value.find(b => b.id === state.isDrawingBoard.value)
    if (board) {
      board.x2 = snapToGrid(x)
      board.y2 = snapToGrid(y)
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
    if (b) { if(p==='start'){ b.x1=snapToGrid(x); b.y1=snapToGrid(y) }
      else{ b.x2=snapToGrid(x); b.y2=snapToGrid(y) } }
  }
  
  function rotateBoard(id) {
    const board = state.boardEdges.value.find(b => b.id === id)
    if (board) {
      snapshot()
      const mx = (board.x1 + board.x2) / 2; const my = (board.y1 + board.y2) / 2
      const rad = (45 * Math.PI) / 180; const cos = Math.cos(rad); const sin = Math.sin(rad)
      const dx1 = board.x1 - mx; const dy1 = board.y1 - my; const rx1 = (dx1 * cos - dy1 * sin) + mx; const ry1 = (dx1 * sin + dy1 * cos) + my
      const dx2 = board.x2 - mx; const dy2 = board.y2 - my; const rx2 = (dx2 * cos - dy2 * sin) + mx; const ry2 = (dx2 * sin + dy2 * cos) + my
      board.x1 = snapToGrid(rx1); board.y1 = snapToGrid(ry1); 
    board.x2 = snapToGrid(rx2); board.y2 = snapToGrid(ry2)
    }
  }

  // --- HIDE/MAT/MISC ACTIONS ---

  function addHide(x, y) {
    snapshot()
    state.hides.value.push({ id: crypto.randomUUID(), x: snapToGrid(x), y: snapToGrid(y), type: 'rat' })
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
    state.dcMats.value.push({ id: crypto.randomUUID(), x: snapToGrid(x), y: snapToGrid(y), rotation: 0 })
  }
  function removeDCMat(id) { snapshot(); state.dcMats.value = state.dcMats.value.filter(m => m.id !== id) }
function rotateDCMat(id) {
    const mat = state.dcMats.value.find(m => m.id === id)
    if (mat) { 
      snapshot()
      mat.rotation = (mat.rotation + 15) % 360 
    }
  }

  function addStartBox(x, y) { snapshot(); state.startBox.value = { x: snapToGrid(x), y: snapToGrid(y) } }
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
    startDrawingBoard, updateDrawingBoard, stopDrawingBoard, removeBoardEdge, updateBoardEndpoint, rotateBoard, differentials,
    addStep, updateStep, setGate, addZone, updateZone,
    removeStep, removeZone, removeGate,
    // Exports computed stats
    balesByLayer, baleCounts, inventory
  }
}
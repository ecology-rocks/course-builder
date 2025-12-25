/**
 * Extracts selection, drag, and group rotation logic from the main store.
 * * @param {Object} state - Object containing all store Refs (bales, boardEdges, selection, etc.)
 * @param {Function} snapshot - Function to save history state
 * @param {Function} validateAllBales - Function to re-check supports/collisions
 */
export function useSelectionLogic(state, snapshot, validateAllBales) {

  // --- LOCAL HELPERS ---

  // Rotates a point (x,y) around a center (cx,cy) by angleDeg
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

  // Calculates the true bounding box of a bale based on orientation/rotation
  function getBaleRect(bale) {
    let w, h
    const isRotated = bale.rotation % 180 !== 0
    
    if (bale.orientation === 'tall') { 
      w = isRotated ? 1 : 3
      h = isRotated ? 3 : 1 
    } else if (bale.orientation === 'pillar') { 
      w = isRotated ? 1 : 1.5
      h = isRotated ? 1.5 : 1 
    } else { 
      // Flat
      w = isRotated ? 1.5 : 3
      h = isRotated ? 3 : 1.5 
    }
    return { x: bale.x, y: bale.y, w, h }
  }

  // --- ACTIONS ---

  function clearSelection() {
    state.selection.value = []
  }

  function selectBale(id, multi = false) {
    if (multi) {
      if (state.selection.value.includes(id)) {
        state.selection.value = state.selection.value.filter(i => i !== id)
      } else {
        state.selection.value.push(id)
      }
    } else {
      state.selection.value = [id]
    }
  }

  function selectArea(x, y, w, h) {
    const rX = w < 0 ? x + w : x
    const rY = h < 0 ? y + h : y
    const rW = Math.abs(w)
    const rH = Math.abs(h)

    // 1. Find Bales
    const hitBales = state.bales.value.filter(b => {
      const r = getBaleRect(b)
      // Check intersection
      return (r.x < rX + rW && r.x + r.w > rX && r.y < rY + rH && r.y + r.h > rY)
    }).map(b => b.id)

    // 2. Find Boards (Check if any part of the line is in the box)
    const hitBoards = state.boardEdges.value.filter(b => {
      const minBx = Math.min(b.x1, b.x2)
      const maxBx = Math.max(b.x1, b.x2)
      const minBy = Math.min(b.y1, b.y2)
      const maxBy = Math.max(b.y1, b.y2)
      
      // Simple bounding box overlap check
      return (minBx < rX + rW && maxBx > rX && minBy < rY + rH && maxBy > rY)
    }).map(b => b.id)

    // 3. Find DC Mats
    const hitMats = state.dcMats.value.filter(m => {
       // Mats are approx 2x3 or 3x2
       const w = m.rotation % 180 !== 0 ? 3 : 2
       const h = m.rotation % 180 !== 0 ? 2 : 3
       return (m.x < rX + rW && m.x + w > rX && m.y < rY + rH && m.y + h > rY)
    }).map(m => m.id)

    state.selection.value = [...hitBales, ...hitBoards, ...hitMats]
  }

  function moveSelection(dx, dy) {
    // No snapshot here (handled by DragStart/End events in component)
    // Apply delta to ALL selected items visually
    
    // Move Bales
    state.bales.value.forEach(b => {
      if (state.selection.value.includes(b.id)) {
        b.x += dx
        b.y += dy
      }
    })
    
    // Note: We don't validate on every pixel move for performance.
    // Validation happens on 'commitDrag'
  }

  function deleteSelection() {
    // Safety check
    if (state.selection.value.length === 0) return

    snapshot() // Save history so we can Undo this mass deletion

    // Helper to filter out selected IDs
    const keep = (item) => !state.selection.value.includes(item.id)

    state.bales.value = state.bales.value.filter(keep)
    state.boardEdges.value = state.boardEdges.value.filter(keep)
    state.dcMats.value = state.dcMats.value.filter(keep)
    state.hides.value = state.hides.value.filter(keep)
    
    // Future proofing for other sports
    if (state.agilityObstacles.value) {
       state.agilityObstacles.value = state.agilityObstacles.value.filter(keep)
    }
    if (state.scentWorkObjects.value) {
       state.scentWorkObjects.value = state.scentWorkObjects.value.filter(keep)
    }

    // Clear the selection since those items are gone
    state.selection.value = []
    
    // Recalculate support for anything left behind
    validateAllBales()
  }

  function commitDrag(id, newX, newY) {
    snapshot()
    
    // Attempt to find the "Leader" (the object we dragged)
    let startX, startY
    const bale = state.bales.value.find(b => b.id === id)
    
    if (bale) { 
      startX = bale.x
      startY = bale.y 
    } else {
      // Logic for non-bale drags (like mats) could go here
      // For now, if we can't find the leader bale, we abort group move
      // (Or handle single item move logic elsewhere)
      return 
    }

    const dx = newX - startX
    const dy = newY - startY

    if (!state.selection.value.includes(id)) {
      // If we dragged an item that WASN'T selected, just move that one item
      bale.x = Math.round(newX * 2) / 2
      bale.y = Math.round(newY * 2) / 2
    } else {
      // Move Bales
      state.bales.value.forEach(b => {
        if (state.selection.value.includes(b.id)) {
          b.x = Math.round((b.x + dx) * 2) / 2
          b.y = Math.round((b.y + dy) * 2) / 2
        }
      })
      // Move Boards
      state.boardEdges.value.forEach(b => {
        if (state.selection.value.includes(b.id)) {
          b.x1 = Math.round((b.x1 + dx) * 2) / 2
          b.y1 = Math.round((b.y1 + dy) * 2) / 2
          b.x2 = Math.round((b.x2 + dx) * 2) / 2
          b.y2 = Math.round((b.y2 + dy) * 2) / 2
        }
      })
      // Move DC Mats
      state.dcMats.value.forEach(m => {
        if (state.selection.value.includes(m.id)) {
           m.x = Math.round((m.x + dx) * 2) / 2
           m.y = Math.round((m.y + dy) * 2) / 2
        }
      })
    }
    
    validateAllBales()
    
    // Force Reactivity (Vue sometimes misses deep array updates)
    state.bales.value = [...state.bales.value]
    state.boardEdges.value = [...state.boardEdges.value]
    state.dcMats.value = [...state.dcMats.value]
  }

  function rotateSelection() {
    if (state.selection.value.length === 0) return
    snapshot()

    // 1. Calculate Center of Selection
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let found = false
    
    // Bounds of Bales
    state.bales.value.forEach(b => {
      if (state.selection.value.includes(b.id)) {
        found = true
        const r = getBaleRect(b)
        minX = Math.min(minX, r.x); minY = Math.min(minY, r.y)
        maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h)
      }
    })
    // Bounds of Boards
    state.boardEdges.value.forEach(b => {
      if (state.selection.value.includes(b.id)) {
        found = true
        minX = Math.min(minX, b.x1, b.x2); minY = Math.min(minY, b.y1, b.y2)
        maxX = Math.max(maxX, b.x1, b.x2); maxY = Math.max(maxY, b.y1, b.y2)
      }
    })

    if (!found || minX === Infinity) return 

    // Center point (Grid Aligned)
    const cx = Math.round(((minX + maxX) / 2) * 2) / 2
    const cy = Math.round(((minY + maxY) / 2) * 2) / 2

    // 2. Rotate Bales (90 deg clockwise)
    state.bales.value.forEach(b => {
      if (state.selection.value.includes(b.id)) {
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
    state.boardEdges.value.forEach(b => {
      if (state.selection.value.includes(b.id)) {
        const p1 = rotatePoint(b.x1, b.y1, cx, cy, 90)
        const p2 = rotatePoint(b.x2, b.y2, cx, cy, 90)
        b.x1 = Math.round(p1.x*2)/2; b.y1 = Math.round(p1.y*2)/2
        b.x2 = Math.round(p2.x*2)/2; b.y2 = Math.round(p2.y*2)/2
      }
    })
    
    // 4. Rotate DC Mats
    state.dcMats.value.forEach(m => {
       if (state.selection.value.includes(m.id)) {
          // Mats rotate around their center (width 2/3 depends on rotation)
          const w = m.rotation % 180 !== 0 ? 3 : 2
          const h = m.rotation % 180 !== 0 ? 2 : 3
          const mcx = m.x + w/2
          const mcy = m.y + h/2
          
          const newCenter = rotatePoint(mcx, mcy, cx, cy, 90)
          
          m.rotation = (m.rotation + 90) % 180 // Mats only care about 0/90 usually
          
          // New dims
          const newW = m.rotation % 180 !== 0 ? 3 : 2
          const newH = m.rotation % 180 !== 0 ? 2 : 3
          
          m.x = Math.round((newCenter.x - newW/2)*2)/2
          m.y = Math.round((newCenter.y - newH/2)*2)/2
       }
    })

    validateAllBales()
    
    // Force Reactivity
    state.bales.value = [...state.bales.value]
    state.boardEdges.value = [...state.boardEdges.value]
    state.dcMats.value = [...state.dcMats.value]
  }

  return {
    clearSelection,
    selectBale,
    selectArea,
    moveSelection,
    deleteSelection,
    commitDrag,
    rotateSelection
  }
}
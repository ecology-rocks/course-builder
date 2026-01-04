/**
 * Extracts selection, drag, and group rotation logic from the main store.
 * * @param {Object} state - Object containing all store Refs (bales, boardEdges, selection, etc.)
 * @param {Function} snapshot - Function to save history state
 * @param {Function} validateAllBales - Function to re-check supports/collisions
 */
export function useSelectionLogic(state, snapshot, validateAllBales) {

  // --- LOCAL HELPERS ---

  function smartSnap(val, dimension) {
    const gridSize = 0.5
    const half = dimension / 2

    // Calculate how far the center is from the grid lines naturally
    // For a 1.5' wide bale, remainder is 0.25
    const remainder = half % gridSize

    // 1. Subtract remainder to find the "base" grid line
    // 2. Snap to nearest grid
    // 3. Add remainder back to offset the Top-Left correctly
    return Math.round((val - remainder) / gridSize) * gridSize + remainder
  }

  // [HELPER] Line Segment (x1,y1)-(x2,y2) intersects Rectangle (rx,ry,rw,rh)
  function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    // 1. Check if either endpoint is inside
    if ((x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) ||
      (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)) return true

    // 2. Check intersection with any of the 4 rectangle sides
    // Helper: Segment-Segment intersection
    const lineLine = (x3, y3, x4, y4) => {
      const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
      const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
      return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1)
    }

    return lineLine(rx, ry, rx + rw, ry) ||       // Top
      lineLine(rx + rw, ry, rx + rw, ry + rh) || // Right
      lineLine(rx, ry + rh, rx + rw, ry + rh) || // Bottom
      lineLine(rx, ry, rx, ry + rh)          // Left
  }

  function copySelection() {
    const selectedIds = state.selection.value
    if (selectedIds.length === 0) return

    const clip = []

    // Helper to find selected items in a specific array and tag them
    const capture = (sourceArray, type) => {
      sourceArray.forEach(item => {
        if (selectedIds.includes(item.id)) {
          // Deep clone to prevent reference issues
          clip.push({ type, data: JSON.parse(JSON.stringify(item)) })
        }
      })
    }

    // Check all possible arrays
    capture(state.bales.value, 'bale')
    capture(state.boardEdges.value, 'board')
    capture(state.dcMats.value, 'dcmat')
    capture(state.hides.value, 'hide')
    capture(state.steps.value, 'step')
    capture(state.zones.value, 'zone')

    if (state.agilityObstacles.value) capture(state.agilityObstacles.value, 'agility')
    if (state.scentWorkObjects.value) capture(state.scentWorkObjects.value, 'scent')

    state.clipboard.value = clip
    // Optional: console.log(`Copied ${clip.length} items`)
  }

  function pasteSelection() {
    if (!state.clipboard.value || state.clipboard.value.length === 0) return

    snapshot() // Save history before pasting

    // Deselect current items so we can select the NEW pasted ones
    state.selection.value = []
    const newSelection = []
    const OFFSET = 1 // Offset pasted items by 1ft so they are visible

    state.clipboard.value.forEach(clipItem => {
      // Generate NEW ID
      const newId = crypto.randomUUID()
      const newItem = { ...clipItem.data, id: newId }

      // Apply Offset
      if (clipItem.type === 'board') {
        newItem.x1 += OFFSET; newItem.y1 += OFFSET
        newItem.x2 += OFFSET; newItem.y2 += OFFSET
      } else {
        newItem.x += OFFSET; newItem.y += OFFSET
      }

      // Add to correct array
      if (clipItem.type === 'bale') state.bales.value.push(newItem)
      else if (clipItem.type === 'board') state.boardEdges.value.push(newItem)
      else if (clipItem.type === 'dcmat') state.dcMats.value.push(newItem)
      else if (clipItem.type === 'hide') state.hides.value.push(newItem)
      else if (clipItem.type === 'step') state.steps.value.push(newItem)
      else if (clipItem.type === 'zone') state.zones.value.push(newItem)
      else if (clipItem.type === 'agility') state.agilityObstacles.value.push(newItem)
      else if (clipItem.type === 'scent') state.scentWorkObjects.value.push(newItem)

      // Add to selection
      newSelection.push(newId)
    })

    state.selection.value = newSelection
    validateAllBales()
  }



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
    const L = state.baleConfig.value.length
    const W = state.baleConfig.value.width
    const H = state.baleConfig.value.height

    let w, h
    const isRotated = bale.rotation % 180 !== 0

    if (bale.orientation === 'tall') {
      w = isRotated ? H : L
      h = isRotated ? L : H
    } else if (bale.orientation === 'pillar') {
      w = isRotated ? H : W
      h = isRotated ? W : H
    } else {
      // Flat
      w = isRotated ? W : L
      h = isRotated ? L : W
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

    // Helper to check rect overlap
    const overlap = (ox, oy, ow, oh) => (ox < rX + rW && ox + ow > rX && oy < rY + rH && oy + oh > rY)

    // 1. Bales
    const hitBales = state.bales.value.filter(b => {
      return overlap(b.x, b.y, state.baleConfig.value.width, state.baleConfig.value.length)
    }).map(b => b.id)

    // 2. Mats (2x3 approx)
    const hitMats = state.dcMats.value.filter(m => overlap(m.x, m.y, 2, 3)).map(m => m.id)

    // 3. Steps
    const hitSteps = state.steps.value ? state.steps.value.filter(s => overlap(s.x, s.y, 1.5, 1)).map(s => s.id) : []

    // 4. Zones
    const hitZones = state.zones.value ? state.zones.value.filter(z => overlap(z.x, z.y, z.width, z.height)).map(z => z.id) : []

    // 5. Board Edges (Line Intersection)
    const hitBoards = state.boardEdges.value.filter(b => {
      return lineIntersectsRect(b.x1, b.y1, b.x2, b.y2, rX, rY, rW, rH)
    }).map(b => b.id)

    // --- NEW ITEMS ---

    // 6. Agility Obstacles (Assumed approx 5x5 hit box for selection)
    const hitAgility = state.agilityObstacles.value ? state.agilityObstacles.value.filter(a => {
      return overlap(a.x, a.y, 5, 5) 
    }).map(a => a.id) : []

    // 7. Scent Work Objects (Assumed 2x2 hit box)
    const hitScent = state.scentWorkObjects.value ? state.scentWorkObjects.value.filter(s => {
      return overlap(s.x, s.y, 2, 2)
    }).map(s => s.id) : []

    // 8. Hides (Assumed 1x1 hit box)
    const hitHides = state.hides.value.filter(h => overlap(h.x, h.y, 1, 1)).map(h => h.id)

    // 9. Markers
    const hitMarkers = state.markers.value ? state.markers.value.filter(m => overlap(m.x, m.y, 1, 1)).map(m => m.id) : []

    state.selection.value = [
      ...hitBales, ...hitMats, ...hitSteps, ...hitZones, ...hitBoards,
      ...hitAgility, ...hitScent, ...hitHides, ...hitMarkers
    ]
  }

  function toggleSelection(id, multi = false) {
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
  function moveSelection(dx, dy) {
    const ids = state.selection.value
    // Move Bales
    state.bales.value.forEach(b => { if (ids.includes(b.id)) { b.x += dx; b.y += dy } })
    // Move Mats
    state.dcMats.value.forEach(m => { if (ids.includes(m.id)) { m.x += dx; m.y += dy } })
    // Move Steps
    if (state.steps.value) state.steps.value.forEach(s => { if (ids.includes(s.id)) { s.x += dx; s.y += dy } })
    // Move Zones
    if (state.zones.value) state.zones.value.forEach(z => { if (ids.includes(z.id)) { z.x += dx; z.y += dy } })
  }

  function deleteSelection() {
    if (state.selection.value.length === 0) return
    snapshot()

    const keep = (item) => !state.selection.value.includes(item.id)

    state.bales.value = state.bales.value.filter(keep)
    state.boardEdges.value = state.boardEdges.value.filter(keep)
    state.dcMats.value = state.dcMats.value.filter(keep)
    state.hides.value = state.hides.value.filter(keep)

    // UPDATED: Delete new items
    if (state.steps.value) state.steps.value = state.steps.value.filter(keep)
    if (state.zones.value) state.zones.value = state.zones.value.filter(keep)

    if (state.agilityObstacles.value) state.agilityObstacles.value = state.agilityObstacles.value.filter(keep)
    if (state.scentWorkObjects.value) state.scentWorkObjects.value = state.scentWorkObjects.value.filter(keep)

    state.selection.value = []
    validateAllBales()
  }

function commitDrag(id, newX, newY) {
    snapshot() 

    // 1. Find the "Leader" 
    // (You might need to expand this search if the leader isn't a bale, 
    // but usually the UI passes the specific ID of what was clicked)
    let startX, startY
    
    // Check all lists to find the start position of the dragged item
    const allItems = [
      ...state.bales.value, 
      ...state.dcMats.value,
      ...(state.steps.value || []),
      ...(state.zones.value || []),
      ...(state.agilityObstacles.value || []),
      ...(state.scentWorkObjects.value || []),
      ...state.hides.value,
      ...(state.markers.value || [])
    ]
    
    // For boards, we handle them separately or use x1/y1, 
    // but for simple point objects:
    const leader = allItems.find(i => i.id === id)
    if (leader) {
      startX = leader.x
      startY = leader.y
    } else {
       // Check boards if not found yet
       const board = state.boardEdges.value.find(b => b.id === id)
       if (board) { startX = board.x1; startY = board.y1 }
       else return 
    }

    const dx = newX - startX
    const dy = newY - startY
    const snap = (val) => Math.round(val * 6) / 6

    if (!state.selection.value.includes(id)) {
      // Single Item Drag (logic depends on item type, simplified here)
      if (leader) { leader.x = snap(newX); leader.y = snap(newY) }
    } else {
      // Group Drag
      
      // Bales
      state.bales.value.forEach(b => {
        if (state.selection.value.includes(b.id)) { b.x = snap(b.x + dx); b.y = snap(b.y + dy) }
      })
      // Boards
      state.boardEdges.value.forEach(b => {
        if (state.selection.value.includes(b.id)) {
          b.x1 = snap(b.x1 + dx); b.y1 = snap(b.y1 + dy)
          b.x2 = snap(b.x2 + dx); b.y2 = snap(b.y2 + dy)
        }
      })
      // Mats
      state.dcMats.value.forEach(m => {
        if (state.selection.value.includes(m.id)) { m.x = snap(m.x + dx); m.y = snap(m.y + dy) }
      })
      // Steps
      if (state.steps.value) state.steps.value.forEach(s => {
        if (state.selection.value.includes(s.id)) { s.x = snap(s.x + dx); s.y = snap(s.y + dy) }
      })
      // Zones
      if (state.zones.value) state.zones.value.forEach(z => {
        if (state.selection.value.includes(z.id)) { z.x = snap(z.x + dx); z.y = snap(z.y + dy) }
      })

      // --- NEW ITEMS ---
      // Agility
      if (state.agilityObstacles.value) state.agilityObstacles.value.forEach(a => {
        if (state.selection.value.includes(a.id)) { a.x = snap(a.x + dx); a.y = snap(a.y + dy) }
      })
      // Scent Work
      if (state.scentWorkObjects.value) state.scentWorkObjects.value.forEach(s => {
        if (state.selection.value.includes(s.id)) { s.x = snap(s.x + dx); s.y = snap(s.y + dy) }
      })
      // Hides
      state.hides.value.forEach(h => {
        if (state.selection.value.includes(h.id)) { h.x = snap(h.x + dx); h.y = snap(h.y + dy) }
      })
      // Markers
      if (state.markers.value) state.markers.value.forEach(m => {
        if (state.selection.value.includes(m.id)) { m.x = snap(m.x + dx); m.y = snap(m.y + dy) }
      })
    }

    validateAllBales()
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


    if (state.steps.value) {
      state.steps.value.forEach(s => {
        if (state.selection.value.includes(s.id)) {
          found = true
          minX = Math.min(minX, s.x); minY = Math.min(minY, s.y)
          maxX = Math.max(maxX, s.x); maxY = Math.max(maxY, s.y)
        }
      })
    }
    // Zones
    if (state.zones.value) {
      state.zones.value.forEach(z => {
        if (state.selection.value.includes(z.id)) {
          found = true
          minX = Math.min(minX, z.x); minY = Math.min(minY, z.y)
          maxX = Math.max(maxX, z.x + z.width); maxY = Math.max(maxY, z.y + z.height)
        }
      })
    }

    if (!found || minX === Infinity) return

    // Center point (Grid Aligned)
    const cx = Math.round(((minX + maxX) / 2) * 2) / 2
    const cy = Math.round(((minY + maxY) / 2) * 2) / 2

    // 2. Rotate Bales (90 deg clockwise)
    state.bales.value.forEach(b => {
      if (state.selection.value.includes(b.id)) {
        // We rotate the CENTER of the bale
        const r = getBaleRect(b)
        const bcx = r.x + r.w / 2
        const bcy = r.y + r.h / 2

        const newCenter = rotatePoint(bcx, bcy, cx, cy, 90)

        // Update Rotation (Keep it 0-360 positive)
        b.rotation = (b.rotation + 90) % 360

        // Recalculate Top-Left from new center + new dimensions
        const newR = getBaleRect(b) // b has new rotation now
        b.x = Math.round((newCenter.x - newR.w / 2) * 2) / 2
        b.y = Math.round((newCenter.y - newR.h / 2) * 2) / 2
      }
    })

    // 3. Rotate Boards
    state.boardEdges.value.forEach(b => {
      if (state.selection.value.includes(b.id)) {
        const p1 = rotatePoint(b.x1, b.y1, cx, cy, 90)
        const p2 = rotatePoint(b.x2, b.y2, cx, cy, 90)
        b.x1 = Math.round(p1.x * 2) / 2; b.y1 = Math.round(p1.y * 2) / 2
        b.x2 = Math.round(p2.x * 2) / 2; b.y2 = Math.round(p2.y * 2) / 2
      }
    })

    // 4. Rotate DC Mats
    state.dcMats.value.forEach(m => {
      if (state.selection.value.includes(m.id)) {
        const confW = state.dcMatConfig.value.width
        const confH = state.dcMatConfig.value.height

        // 1. Find current center
        // Existing logic handled 90-degree swaps. We preserve that check 
        // to correctly find the center of currently rotated items.
        // For arbitrary angles (like 15), we assume standard unrotated dimensions 
        // unless it's exactly 90/270 where previous logic applied.
        const isSwapped = Math.abs(m.rotation % 180) === 90
        const currentW = isSwapped ? confH : confW
        const currentH = isSwapped ? confW : confH

        const mcx = m.x + currentW / 2
        const mcy = m.y + currentH / 2

        // 2. Rotate Center by 15 degrees
        const angle = 15
        const newCenter = rotatePoint(mcx, mcy, cx, cy, angle)

        // 3. Update Rotation
        m.rotation = (m.rotation + angle) % 360
        if (m.rotation < 0) m.rotation += 360

        // 4. Update Position
        // We set x,y to the "unrotated" top-left that corresponds to the new center.
        // This decouples the position from the rotation, allowing 15-degree increments.
        m.x = Math.round((newCenter.x - confW / 2) * 2) / 2
        m.y = Math.round((newCenter.y - confH / 2) * 2) / 2
      }
    })


// Steps (Center Anchor)
    if (state.steps.value) {
      state.steps.value.forEach(s => {
        if (state.selection.value.includes(s.id)) {
          // Simply rotate the center point around selection center
          const newPos = rotatePoint(s.x, s.y, cx, cy, 90)
          s.x = Math.round(newPos.x * 2) / 2
          s.y = Math.round(newPos.y * 2) / 2
          s.rotation = (s.rotation + 90) % 360
        }
      })
    }

    // Zones (Top-Left Anchor)
    if (state.zones.value) {
      state.zones.value.forEach(z => {
        if (state.selection.value.includes(z.id)) {
          // 1. Calculate Current Center of Zone
          // Convert rotation to radians (Konva rotates clockwise)
          const rad = (z.rotation * Math.PI) / 180
          const w = z.width
          const h = z.height
          
          // Formula for center of a rotated rect (top-left origin)
          const zoneCx = z.x + (w/2 * Math.cos(rad)) - (h/2 * Math.sin(rad))
          const zoneCy = z.y + (w/2 * Math.sin(rad)) + (h/2 * Math.cos(rad))

          // 2. Rotate that center around the Selection Center
          const newZoneCenter = rotatePoint(zoneCx, zoneCy, cx, cy, 90)

          // 3. Update Rotation
          z.rotation = (z.rotation + 90) % 360
          
          // 4. Back-calculate New Top-Left (x,y) from New Center + New Rotation
          const newRad = (z.rotation * Math.PI) / 180
          z.x = newZoneCenter.x - (w/2 * Math.cos(newRad)) + (h/2 * Math.sin(newRad))
          z.y = newZoneCenter.y - (w/2 * Math.sin(newRad)) - (h/2 * Math.cos(newRad))
          
          // Round to nearest quarter grid to keep things clean
          z.x = Math.round(z.x * 4) / 4
          z.y = Math.round(z.y * 4) / 4
        }
      })
    }


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
    toggleSelection: selectBale,
    deleteSelection,
    commitDrag,
    rotateSelection,
    copySelection,
    pasteSelection,
  }
}
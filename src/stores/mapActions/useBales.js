export function useBales(state, snapshot, notifications) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  // --- PHYSICS & VALIDATION ---
  function getBaleRect(bale) {
    const L = state.baleConfig.value.length
    const W = state.baleConfig.value.width
    const H = state.baleConfig.value.height

    let uw, uh
    if (bale.orientation === 'tall') { uw = L; uh = H } 
    else if (bale.orientation === 'pillar') { uw = W; uh = H } 
    else { uw = L; uh = W }

    const cx = bale.x + (uw / 2)
    const cy = bale.y + (uh / 2)
    const rad = (bale.rotation * Math.PI) / 180
    const absCos = Math.abs(Math.cos(rad))
    const absSin = Math.abs(Math.sin(rad))

    return {
      x: cx - ((uw * absCos) + (uh * absSin)) / 2,
      y: cy - ((uw * absSin) + (uh * absCos)) / 2,
      w: (uw * absCos) + (uh * absSin),
      h: (uw * absSin) + (uh * absCos)
    }
  }

  function hasSupport(newBale) {
    if (newBale.layer === 1) return true
    const r1 = getBaleRect(newBale)
    let totalSupportArea = 0
    
    // Filter from the reactive array
    const lowerLayer = state.bales.value.filter(b => b.layer === newBale.layer - 1)

    lowerLayer.forEach(baseBale => {
      const r2 = getBaleRect(baseBale)
      const x_overlap = Math.max(0, Math.min(r1.x + r1.w, r2.x + r2.w) - Math.max(r1.x, r2.x))
      const y_overlap = Math.max(0, Math.min(r1.y + r1.h, r2.y + r2.h) - Math.max(r1.y, r2.y))
      totalSupportArea += (x_overlap * y_overlap)
    })
    return totalSupportArea >= 1.0
  }

  function isValidPlacement(newBale) {
    const r1 = getBaleRect(newBale)
    if (r1.x < 0 || r1.y < 0 || 
        r1.x + r1.w > state.ringDimensions.value.width || 
        r1.y + r1.h > state.ringDimensions.value.height) {
      return false
    }
    return true
  }

  function validateAllBales() {
    // This updates state, which triggers the history watcher automatically.
    state.bales.value.forEach(bale => {
      const r = getBaleRect(bale)
      const outOfBounds = r.x < 0 || r.y < 0 || 
                          r.x + r.w > state.ringDimensions.value.width || 
                          r.y + r.h > state.ringDimensions.value.height
      bale.supported = !outOfBounds
      // Note: We could add hasSupport(bale) check here for layers > 1
    })
  }

  // --- ACTIONS (No Snapshots!) ---

  function addBale(x, y) {
    const newBale = {
      id: crypto.randomUUID(),
      x: snapToGrid(x),
      y: snapToGrid(y),
      rotation: 0,
      layer: state.currentLayer.value,
      orientation: 'flat',
      lean: null,
      supported: true
    }

    if (!isValidPlacement(newBale)) {
      notifications.show("Cannot place here: Out of Bounds", 'error')
      return
    }

    state.bales.value.push(newBale)
    validateAllBales()
  }

  function removeBale(id) {
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
      bale.rotation = (bale.rotation + 15) % 360
      validateAllBales()
    }
  }

  function cycleOrientation(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.orientation === 'flat') { bale.orientation = 'tall'; bale.lean = null }
      else if (bale.orientation === 'tall') { bale.orientation = 'pillar'; bale.lean = null }
      else { bale.orientation = 'flat' }
      validateAllBales()
    }
  }

  function cycleLean(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.orientation !== 'flat') {
        notifications.show("Only FLAT bales can have a lean.", 'error')
        return
      }
      if (bale.lean === null) bale.lean = 'right'
      else if (bale.lean === 'right') bale.lean = 'left'
      else bale.lean = null
    }
  }

  return {
    getBaleRect,
    hasSupport,
    isValidPlacement,
    validateAllBales,
    addBale,
    removeBale,
    updateBalePosition,
    rotateBale,
    cycleOrientation,
    cycleLean
  }
}
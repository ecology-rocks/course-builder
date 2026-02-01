export function useBales(state, snapshot, notifications) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  // --- PHYSICS & VALIDATION (DISABLED) ---
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

    state.bales.value.push(newBale)
  }

  function removeBale(id) {
    state.bales.value = state.bales.value.filter(b => b.id !== id)
    if (state.selectedBaleId.value === id) state.selectedBaleId.value = null
  }

  function updateBalePosition(id, newX, newY) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      bale.x = snapToGrid(newX)
      bale.y = snapToGrid(newY)
    }
  }

function rotateBale(id, amount = 15) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      bale.rotation = (bale.rotation + amount) % 360
    }
  }

  function cycleOrientation(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.orientation === 'flat') { bale.orientation = 'tall'; bale.lean = null }
      else if (bale.orientation === 'tall') { bale.orientation = 'pillar'; bale.lean = null }
      else { bale.orientation = 'flat' }
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
    addBale,
    removeBale,
    updateBalePosition,
    rotateBale,
    cycleOrientation,
    cycleLean
  }
}
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

// --- EXTENDED ACTIONS ---

  function toggleAnchor() {
    if (state.selection.value.length === 0) return;
    
    // Optional: Safety check for layer
    if (state.currentLayer.value !== 1) {
      if (notifications && notifications.show) {
        notifications.show("Anchor bales must be on Layer 1.", "error");
      }
      return;
    }

    state.bales.value.forEach((b) => {
      if (state.selection.value.includes(b.id)) {
        b.isAnchor = !b.isAnchor;
      }
    });
  }

  function setComparisonBales(bales, name = "Custom Map") {
    state.previousBales.value = JSON.parse(JSON.stringify(bales));
    state.comparisonMapName.value = name;
  }

  function realignBales() {
    const { length: L, width: W, height: H } = state.baleConfig.value;
    const snap = (val) => Math.round(val * 6) / 6;

    state.bales.value.forEach((b) => {
      // Determine unrotated dimensions
      let w = L, h = W;
      if (b.orientation === "pillar") { w = W; h = H; } 
      else if (b.orientation === "tall") { w = L; h = H; }

      const rot = Math.abs(b.rotation || 0) % 180;
      
      // Check if rectilinear (0, 90, 180, 270)
      const isRectilinear = Math.abs(rot) < 1 || Math.abs(rot - 90) < 1;

      if (isRectilinear) {
        // If rotated 90/270, dimensions swap visually
        const isVertical = Math.abs(rot - 90) < 1;
        const effectiveW = isVertical ? h : w;
        const effectiveH = isVertical ? w : h;

        // Calculate Visual Top-Left (The visible edge)
        // Pivot (Center) = x + w/2
        const pivotX = b.x + w / 2;
        const pivotY = b.y + h / 2;

        const currentMinX = pivotX - effectiveW / 2;
        const currentMinY = pivotY - effectiveH / 2;

        // Snap the VISUAL edge to the grid
        const newMinX = snap(currentMinX);
        const newMinY = snap(currentMinY);

        // Back-calculate the real X/Y
        b.x = newMinX + effectiveW / 2 - w / 2;
        b.y = newMinY + effectiveH / 2 - h / 2;
      } else {
        // Fallback for weird angles: Just snap the top-left point
        b.x = snap(b.x);
        b.y = snap(b.y);
      }
    });
  }




  return {
    getBaleRect,
    addBale,
    removeBale,
    updateBalePosition,
    rotateBale,
    cycleOrientation,
    cycleLean,
    toggleAnchor,
    setComparisonBales,
    realignBales
  }
}
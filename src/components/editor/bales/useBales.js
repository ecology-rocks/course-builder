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
    supported: true,
    custom: {
        fillColor: null,
        strokeColor: null,
        // [NEW] Dimension Overrides (null = use global defaults)
        length: null, 
        width: null, 
        height: null
      }
  }
  state.bales.value.push(newBale)
}

function setLean(id, direction) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      // [FIX] Guard Clause
      if (bale.isAnchor) {
         notifications.show("Anchor bales cannot have a lean.", "error")
         return
      }
      
      if (bale.orientation !== 'flat') {
        notifications.show("Only FLAT bales can have a lean.", 'error')
        return
      }
      bale.lean = direction
      if (snapshot) snapshot()
    }
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

// Add to the returned object in useBales
function setBaleOrientation(id, orientation) {
    const targets = state.selection.value.includes(id) ? state.selection.value : [id]
    
    // [FIX] Filter out anchors before applying changes
    const validTargets = targets.filter(tid => {
      const b = state.bales.value.find(item => item.id === tid);
      return b && !b.isAnchor; 
    });

    if (validTargets.length < targets.length) {
       notifications.show("Cannot change orientation of Anchor bales.", "error");
    }

    state.bales.value.forEach(b => {
      if (validTargets.includes(b.id)) {
        b.orientation = orientation
        if (orientation !== 'flat') b.lean = null
      }
    })
    
    if (snapshot) snapshot();
  }


// Update rotateBale to handle selection
function rotateBale(id, amount = 15) {
  const targets = state.selection.value.includes(id) ? state.selection.value : [id]
  state.bales.value.forEach(b => {
    if (targets.includes(b.id)) {
      b.rotation = (b.rotation + amount) % 360
    }
  })
}

function cycleOrientation(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      // [FIX] Guard Clause
      if (bale.isAnchor) {
        notifications.show("Cannot change orientation of Anchor bales.", "error")
        return
      }

      if (bale.orientation === 'flat') { bale.orientation = 'tall'; bale.lean = null }
      else if (bale.orientation === 'tall') { bale.orientation = 'pillar'; bale.lean = null }
      else { bale.orientation = 'flat' }
      
      if (snapshot) snapshot();
    }
  }

function cycleLean(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      // [FIX] Guard Clause
      if (bale.isAnchor) {
         notifications.show("Anchor bales cannot have a lean.", "error")
         return
      }

      if (bale.orientation !== 'flat') {
        notifications.show("Only FLAT bales can have a lean.", 'error')
        return
      }
      if (bale.lean === null) bale.lean = 'right'
      else if (bale.lean === 'right') bale.lean = 'left'
      else bale.lean = null
      
      if (snapshot) snapshot();
    }
  }

// --- EXTENDED ACTIONS ---

  function toggleAnchor(targetId = null) {
    // 1. Determine targets (Specific ID or Selection)
    const targets = targetId 
      ? (state.selection.value.includes(targetId) ? state.selection.value : [targetId]) 
      : state.selection.value

    if (targets.length === 0) return

    // 2. Guard Clause: Layer Check
    if (state.currentLayer.value !== 1) {
      notifications.show("Anchors can only be created on Layer 1.", "error")
      return
    }

    let changeCount = 0

    state.bales.value.forEach((b) => {
      if (targets.includes(b.id)) {
        
        // 3. Guard Clause: Orientation Check (Must be Flat)
        if (!b.isAnchor && b.orientation !== 'flat') {
          notifications.show("Only FLAT bales can be anchors.", "error")
          return 
        }

        // 4. Guard Clause: Rotation Check (Must be 90-degree increments)
        const rot = Math.abs(b.rotation) % 90
        if (!b.isAnchor && rot !== 0) {
           notifications.show("Anchors must be aligned to the grid (0, 90, 180, 270).", "error")
           return
        }

        // Apply Toggle
        b.isAnchor = !b.isAnchor
        
        // If becoming an anchor, force cleanup of lean just in case
        if (b.isAnchor) {
          b.lean = null 
        }
        changeCount++
      }
    })

    if (changeCount > 0 && snapshot) snapshot()
  }

  function setComparisonBales(bales, name = "Custom Map") {
    state.previousBales.value = JSON.parse(JSON.stringify(bales));
    state.comparisonMapName.value = name;
  }

  function realignBales() {
    const { length: L, width: W, height: H } = state.baleConfig.value;
    const snap = (val) => Math.round(val * 6) / 6;

    state.bales.value.forEach((b) => {
      
      // [FIX] Guard Clause: Do not realign Anchors if they are already perfect
      // (Or alternatively, FORCE them to snap perfectly to the grid lines)
      
      let w = L, h = W;
      if (b.orientation === "pillar") { w = W; h = H; } 
      else if (b.orientation === "tall") { w = L; h = H; }

      const rot = Math.abs(b.rotation || 0) % 180;
      const isRectilinear = Math.abs(rot) < 1 || Math.abs(rot - 90) < 1;

      if (isRectilinear) {
        const isVertical = Math.abs(rot - 90) < 1;
        const effectiveW = isVertical ? h : w;
        const effectiveH = isVertical ? w : h;

        const pivotX = b.x + w / 2;
        const pivotY = b.y + h / 2;

        const currentMinX = pivotX - effectiveW / 2;
        const currentMinY = pivotY - effectiveH / 2;

        const newMinX = snap(currentMinX);
        const newMinY = snap(currentMinY);

        b.x = newMinX + effectiveW / 2 - w / 2;
        b.y = newMinY + effectiveH / 2 - h / 2;
      } else {
        // [FIX] If it's an anchor but somehow not rectilinear, force it? 
        // For now, we just snap position.
        b.x = snap(b.x);
        b.y = snap(b.y);
      }
    });
    
    if (snapshot) snapshot()
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
    realignBales, 
    setBaleOrientation,
    setLean,
  }
}
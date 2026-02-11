import { unref } from 'vue'

export function useBales(state, snapshot, notifications) {

  // --- MATH HELPERS (New) ---

  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function getRayIntersection(rayOrigin, rayDir, p1, p2) {
    const v1 = { x: rayOrigin.x - p1.x, y: rayOrigin.y - p1.y }
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y }
    const v3 = { x: -rayDir.y, y: rayDir.x }

    const dot = v2.x * v3.x + v2.y * v3.y
    if (Math.abs(dot) < 0.000001) return null

    const t1 = (v2.x * v1.y - v2.y * v1.x) / dot
    const t2 = (v1.x * v3.x + v1.y * v3.y) / dot

    if (t1 >= 0 && (t2 >= 0 && t2 <= 1)) {
      return {
        x: rayOrigin.x + rayDir.x * t1,
        y: rayOrigin.y + rayDir.y * t1,
        dist: t1
      }
    }
    return null
  }

  function findBestAnchorOnAxis(origin, axisVector, walls, gridW, gridH) {
    const segments = []

    // 1. Grid Edges
    segments.push({ p1: {x:0, y:0}, p2: {x:gridW, y:0} }) // Top
    segments.push({ p1: {x:0, y:gridH}, p2: {x:gridW, y:gridH} }) // Bottom
    segments.push({ p1: {x:0, y:0}, p2: {x:0, y:gridH} }) // Left
    segments.push({ p1: {x:gridW, y:0}, p2: {x:gridW, y:gridH} }) // Right

    // 2. Custom Walls
    walls.forEach(w => {
      for(let i=0; i < w.points.length; i++) {
        segments.push({
          p1: w.points[i],
          p2: w.points[(i+1) % w.points.length]
        })
      }
    })

    // 3. Cast rays in BOTH directions (e.g. Left and Right) to find nearest wall
    const directions = [
        { x: axisVector.x, y: axisVector.y },
        { x: -axisVector.x, y: -axisVector.y }
    ]

    let bestPoint = null
    let minDist = Infinity

    directions.forEach(dir => {
        segments.forEach(seg => {
            const hit = getRayIntersection(origin, dir, seg.p1, seg.p2)
            if (hit && hit.dist < minDist) {
                minDist = hit.dist
                bestPoint = { x: hit.x, y: hit.y }
            }
        })
    })

    return bestPoint
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

  // --- ACTIONS ---

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
      customAnchors: [],
      custom: {
          fillColor: null,
          strokeColor: null,
          borderStyle: null,
          length: null, 
          width: null, 
          height: null
        }
    }
    state.bales.value.push(newBale)
    if (snapshot) snapshot()
  }

  function setLean(id, direction) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
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
    if (snapshot) snapshot()
  }

  function updateBalePosition(id, newX, newY) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      bale.x = snapToGrid(newX)
      bale.y = snapToGrid(newY)
    }
  }

  function setBaleOrientation(id, orientation) {
    const targets = state.selection.value.includes(id) ? state.selection.value : [id]
    
    // Filter out anchors before applying changes
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

  function rotateBale(id, amount = 15) {
    const targets = state.selection.value.includes(id) ? state.selection.value : [id]
    state.bales.value.forEach(b => {
      if (targets.includes(b.id)) {
        b.rotation = (b.rotation + amount) % 360
      }
    })
    if (snapshot) snapshot()
  }

  function cycleOrientation(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
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

  // --- ANCHOR LOGIC (UPDATED) ---

  function toggleAnchor(targetId = null) {
    const targets = targetId 
      ? (state.selection.value.includes(targetId) ? state.selection.value : [targetId]) 
      : state.selection.value

    if (targets.length === 0) return
    if (state.currentLayer.value !== 1) {
      notifications.show("Anchors can only be created on Layer 1.", "error")
      return
    }

    let changeCount = 0
    state.bales.value.forEach((b) => {
      if (targets.includes(b.id)) {
        if (!b.isAnchor && b.orientation == 'pillar') {
          notifications.show("Only FLAT/TALL bales can be anchors.", "error")
          return 
        }
        
        b.isAnchor = !b.isAnchor
        
        if (b.isAnchor) {
          b.lean = null 
          
          // [NEW] Auto-calculate 2 starter points (Closest X and Closest Y)
          const config = state.baleConfig.value
          
          let w = b.custom?.length ?? config.length ?? 3
          let h = b.custom?.width ?? config.width ?? 1.5
          
          // Adjust for visual dimensions based on orientation
          if (b.orientation === 'tall') { w = config.length; h = config.width } // Usually same as flat but vertical
          else if (b.orientation === 'pillar') { w = config.width; h = config.width }

          // Center of the bale
          const cx = b.x + w / 2
          const cy = b.y + h / 2
          const center = { x: cx, y: cy }

          const walls = unref(state.customWalls) || []
          const GW = state.ringDimensions.value.width
          const GH = state.ringDimensions.value.height

          // 1. Find best Horizontal Anchor (Left or Right)
          const p1 = findBestAnchorOnAxis(center, {x: 1, y: 0}, walls, GW, GH)

          // 2. Find best Vertical Anchor (Top or Bottom)
          const p2 = findBestAnchorOnAxis(center, {x: 0, y: 1}, walls, GW, GH)

          b.customAnchors = [p1, p2].filter(p => p !== null)

        } else {
          // Reset custom anchors when toggling off
          b.customAnchors = [] 
        }
        changeCount++
      }
    })
    if (changeCount > 0 && snapshot) snapshot()
  }

  // Bulk update for dragging anchors
  function setCustomAnchors(id, anchors) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      bale.customAnchors = anchors
      if (snapshot) snapshot()
    }
  }

  // [LEGACY] Kept for compatibility, but likely unused in new workflow
  function addAnchor(baleId, point) {
    const bale = state.bales.value.find(b => b.id === baleId)
    if (bale) {
      if (!bale.customAnchors) bale.customAnchors = []
      
      if (bale.customAnchors.length >= 2) {
        bale.customAnchors.shift()
      }
      
      bale.customAnchors.push(point)
      if (snapshot) snapshot()
      
      return bale.customAnchors.length
    }
    return 0
  }
  
  // Update single manual anchor point (used during drag)
  function updateAnchor(baleId, index, point) {
    const bale = state.bales.value.find(b => b.id === baleId)
    if (bale && bale.customAnchors && bale.customAnchors[index]) {
      bale.customAnchors[index] = point
    }
  }

  function setComparisonBales(bales, name = "Custom Map") {
    state.previousBales.value = JSON.parse(JSON.stringify(bales));
    state.comparisonMapName.value = name;
  }

  function realignBales() {
    const { length: L, width: W, height: H } = state.baleConfig.value;
    const snap = (val) => Math.round(val * 6) / 6;

    state.bales.value.forEach((b) => {
      
      // Do not realign Anchors if they are already perfect
      if (b.isAnchor) return
      
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
    addAnchor,
    updateAnchor,
    setCustomAnchors
  }
}
import { unref } from 'vue'

export function useBales(state, snapshot, notifications) {

  // --- MATH HELPERS ---

  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  // Rotates a point (px, py) around a center (cx, cy) by angleDeg
  function rotatePoint(px, py, cx, cy, angleDeg) {
    const rad = angleDeg * (Math.PI / 180)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const dx = px - cx
    const dy = py - cy
    return {
      x: cx + (dx * cos - dy * sin),
      y: cy + (dx * sin + dy * cos)
    }
  }

  // --- CORE ANCHOR CALCULATION (Helper) ---
  // This logic is now shared between toggle, rotate, and move actions
  function recalculateAnchors(bale) {
    // Only calculate if it's actually an anchor
    if (!bale.isAnchor) {
        bale.customAnchors = []
        return
    }

    // 1. Gather all Wall Segments (Grid + Custom)
    const segments = []
    const GW = Number(state.ringDimensions.value.width) || 24
    const GH = Number(state.ringDimensions.value.height) || 24
    const customWalls = unref(state.customWalls) || []

    // Standard Ring Edges
    segments.push({ p1: {x:0, y:0}, p2: {x:GW, y:0} }) // Top
    segments.push({ p1: {x:GW, y:0}, p2: {x:GW, y:GH} }) // Right
    segments.push({ p1: {x:GW, y:GH}, p2: {x:0, y:GH} }) // Bottom
    segments.push({ p1: {x:0, y:GH}, p2: {x:0, y:0} }) // Left

    // Custom Interior Walls
    customWalls.forEach(w => {
      if (!w.points || w.points.length < 2) return
      for(let i=0; i < w.points.length; i++) {
          segments.push({
              p1: w.points[i],
              p2: w.points[(i+1) % w.points.length]
          })
      }
    })

    // 2. Determine Bale Dimensions & Center
    const config = state.baleConfig.value || {}
    let w = bale.custom?.length ?? config.length ?? 3
    let h = bale.custom?.width ?? config.width ?? 1.5
    if (bale.orientation === 'tall') { w = config.length; h = config.width }
    else if (bale.orientation === 'pillar') { w = config.width; h = config.width }

    const cx = bale.x + w / 2
    const cy = bale.y + h / 2

    // 3. Calculate 4 Corners in World Space (Rotated)
    const hw = w / 2
    const hh = h / 2
    const localCorners = [
      { x: cx - hw, y: cy - hh }, // Top-Left
      { x: cx + hw, y: cy - hh }, // Top-Right
      { x: cx + hw, y: cy + hh }, // Bottom-Right
      { x: cx - hw, y: cy + hh }  // Bottom-Left
    ]

    const worldCorners = localCorners.map(p => rotatePoint(p.x, p.y, cx, cy, bale.rotation || 0))

    // 4. Find Best Corner
    // We want the corner that minimizes the total distance to a vertical wall AND a horizontal wall
    let best = null
    let minScore = Infinity

    worldCorners.forEach(corner => {
      let bestH = null // Intersection along y = corner.y (Horizontal Ray)
      let minH = Infinity
      let bestV = null // Intersection along x = corner.x (Vertical Ray)
      let minV = Infinity

      segments.forEach(seg => {
        // -- CHECK HORIZONTAL RAY (y = corner.y) --
        const yMin = Math.min(seg.p1.y, seg.p2.y)
        const yMax = Math.max(seg.p1.y, seg.p2.y)
        
        // Does the wall span across our Y level?
        if (corner.y >= yMin - 0.01 && corner.y <= yMax + 0.01) {
            // Ensure the wall isn't flat horizontal (avoid divide by zero)
            if (Math.abs(seg.p2.y - seg.p1.y) > 0.001) {
                // Solve X for Y = corner.y
                const t = (corner.y - seg.p1.y) / (seg.p2.y - seg.p1.y)
                const ix = seg.p1.x + t * (seg.p2.x - seg.p1.x)
                const dist = Math.abs(ix - corner.x)
                if (dist < minH) {
                    minH = dist
                    bestH = { x: ix, y: corner.y } // Point on wall
                }
            }
        }

        // -- CHECK VERTICAL RAY (x = corner.x) --
        const xMin = Math.min(seg.p1.x, seg.p2.x)
        const xMax = Math.max(seg.p1.x, seg.p2.x)

        // Does the wall span across our X level?
        if (corner.x >= xMin - 0.01 && corner.x <= xMax + 0.01) {
            // Ensure the wall isn't flat vertical
            if (Math.abs(seg.p2.x - seg.p1.x) > 0.001) {
                // Solve Y for X = corner.x
                const t = (corner.x - seg.p1.x) / (seg.p2.x - seg.p1.x)
                const iy = seg.p1.y + t * (seg.p2.y - seg.p1.y)
                const dist = Math.abs(iy - corner.y)
                if (dist < minV) {
                    minV = dist
                    bestV = { x: corner.x, y: iy } // Point on wall
                }
            }
        }
      })

      // Score = Sum of distances. Missing walls are heavily penalized (1000).
      const score = (bestH ? minH : 1000) + (bestV ? minV : 1000)

      if (score < minScore) {
        minScore = score
        best = { corner, hPoint: bestH, vPoint: bestV }
      }
    })

    // 5. Apply Results
    if (best) {
      const anchors = []
      if (best.hPoint) anchors.push(best.hPoint)
      if (best.vPoint) anchors.push(best.vPoint)
      bale.customAnchors = anchors
    } else {
      bale.customAnchors = []
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
      custom: { fillColor: null, strokeColor: null, borderStyle: null, length: null, width: null, height: null }
    }
    state.bales.value.push(newBale)
    if (snapshot) snapshot()
  }

  function setLean(id, direction) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.isAnchor) { notifications.show("Anchor bales cannot have a lean.", "error"); return }
      if (bale.orientation !== 'flat') { notifications.show("Only FLAT bales can have a lean.", 'error'); return }
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
      // [UPDATE] Auto-recalculate if it is an anchor
      if (bale.isAnchor) recalculateAnchors(bale)
    }
  }

  // [NEW] Exposed action to manually force a recalculation
  // Useful when moved by generic tools (like drag selection) that bypass updateBalePosition
  function refreshAnchors(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale && bale.isAnchor) {
        recalculateAnchors(bale)
    }
  }

  function setBaleOrientation(id, orientation) {
    const targets = state.selection.value.includes(id) ? state.selection.value : [id]
    const validTargets = targets.filter(tid => {
      const b = state.bales.value.find(item => item.id === tid);
      return b && !b.isAnchor; 
    });

    if (validTargets.length < targets.length) notifications.show("Cannot change orientation of Anchor bales.", "error");

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
        // [UPDATE] Auto-recalculate if it is an anchor
        if (b.isAnchor) recalculateAnchors(b)
      }
    })
    if (snapshot) snapshot()
  }

  function cycleOrientation(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.isAnchor) { notifications.show("Cannot change orientation of Anchor bales.", "error"); return }
      if (bale.orientation === 'flat') { bale.orientation = 'tall'; bale.lean = null }
      else if (bale.orientation === 'tall') { bale.orientation = 'pillar'; bale.lean = null }
      else { bale.orientation = 'flat' }
      if (snapshot) snapshot();
    }
  }

  function cycleLean(id) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.isAnchor) { notifications.show("Anchor bales cannot have a lean.", "error"); return }
      if (bale.orientation !== 'flat') { notifications.show("Only FLAT bales can have a lean.", 'error'); return }
      if (bale.lean === null) bale.lean = 'right'
      else if (bale.lean === 'right') bale.lean = 'left'
      else bale.lean = null
      if (snapshot) snapshot();
    }
  }

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
            recalculateAnchors(b) // [UPDATE] Initial calculation
        } else {
            b.customAnchors = []
        }
        changeCount++
      }
    })
    if (changeCount > 0 && snapshot) snapshot()
  }

  function setCustomAnchors(id, anchors) {
    const bale = state.bales.value.find(b => b.id === id)
    if (bale) {
      bale.customAnchors = anchors
      if (snapshot) snapshot()
    }
  }

  // [LEGACY SUPPORT]
  function addAnchor(baleId, point) {
    const bale = state.bales.value.find(b => b.id === baleId)
    if (bale) {
      if (!bale.customAnchors) bale.customAnchors = []
      if (bale.customAnchors.length >= 2) bale.customAnchors.shift()
      bale.customAnchors.push(point)
      if (snapshot) snapshot()
      return bale.customAnchors.length
    }
    return 0
  }
  
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
    const config = state.baleConfig.value || {}
    const L = Number(config.length) || 3
    const W = Number(config.width) || 1.5
    const H = Number(config.height) || 1
    
    const snap = (val) => Math.round(val * 6) / 6;

    state.bales.value.forEach((b) => {
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

      // [UPDATE] Fix alignment for anchors too
      if (b.isAnchor) recalculateAnchors(b)
    });
    
    if (snapshot) snapshot()
  }

  function getBaleRect(bale) {
    // ... existing logic ...
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
    setCustomAnchors,
    refreshAnchors // Exported for BarnHuntLayer
  }
}
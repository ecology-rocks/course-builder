import { ref, unref } from 'vue'

export function useCustomWalls(state, snapshot) {
  // ... [Keep existing addWallPoint, finishWall, removeWall, updateWallPoint, setSegmentType, toggleSegmentType] ...
  function addWallPoint(x, y) {
    const currentActive = unref(state.activeWall)
    if (!currentActive) {
      const newWall = {
        id: crypto.randomUUID(),
        points: [{ x, y }], 
        segmentTypes: [] 
      }
      if (state.activeWall && typeof state.activeWall === 'object' && 'value' in state.activeWall) {
        state.activeWall.value = newWall
      } else {
        state.activeWall = newWall
      }
    } else {
      const origin = currentActive.points[0]
      if (Math.abs(x - origin.x) < 0.5 && Math.abs(y - origin.y) < 0.5) {
        finishWall()
        return
      }
      currentActive.points.push({ x, y })
      currentActive.segmentTypes.push('fence') 
    }
  }

  function finishWall() {
    const currentActive = unref(state.activeWall)
    if (currentActive && currentActive.points.length > 2) {
      const poly = JSON.parse(JSON.stringify(currentActive))
      poly.segmentTypes.push('fence') 
      const currentWalls = unref(state.customWalls) || []
      const newWalls = [...currentWalls, poly]
      if (state.customWalls && typeof state.customWalls === 'object' && 'value' in state.customWalls) {
        state.customWalls.value = newWalls
      } else {
        state.customWalls = newWalls
      }
    }
    if (state.activeWall && typeof state.activeWall === 'object' && 'value' in state.activeWall) {
      state.activeWall.value = null
    } else {
      state.activeWall = null
    }
    if (snapshot) snapshot()
  }

  function removeWall(id) {
    const currentWalls = unref(state.customWalls) || []
    const newWalls = currentWalls.filter(w => w.id !== id)
    if (state.customWalls && typeof state.customWalls === 'object' && 'value' in state.customWalls) {
        state.customWalls.value = newWalls
    } else {
        state.customWalls = newWalls
    }
    if (snapshot) snapshot()
  }

  function updateWallPoint(wallId, pointIndex, x, y) {
    const currentWalls = unref(state.customWalls) || []
    const wall = currentWalls.find(w => w.id === wallId)
    if (wall && wall.points[pointIndex]) {
      wall.points[pointIndex] = { x, y }
    }
  }

  function setSegmentType(wallId, segmentIndex, type) {
    const currentWalls = unref(state.customWalls) || []
    const wall = currentWalls.find(w => w.id === wallId)
    if (wall && wall.segmentTypes[segmentIndex]) {
      wall.segmentTypes[segmentIndex] = type
      if (snapshot) snapshot()
    }
  }

  function toggleSegmentType(wallId, segmentIndex) {
    const currentWalls = unref(state.customWalls) || []
    const wall = currentWalls.find(w => w.id === wallId)
    if (wall && wall.segmentTypes[segmentIndex]) {
      wall.segmentTypes[segmentIndex] = wall.segmentTypes[segmentIndex] === 'fence' ? 'solid' : 'fence'
      if (snapshot) snapshot()
    }
  }

  // --- MATH HELPERS ---

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

  // [NEW] Raycast from Origin (Bale Center) -> Mouse Angle -> Nearest Wall/Grid
  function getAngleSnapPoint(origin, mousePos, gridW, gridH) {
    // 1. Calculate Angle
    const dx = mousePos.x - origin.x
    const dy = mousePos.y - origin.y
    let angle = Math.atan2(dy, dx)

    // 2. Snap to nearest 15 degrees (PI/12)
    const SNAP_RAD = (15 * Math.PI) / 180
    angle = Math.round(angle / SNAP_RAD) * SNAP_RAD

    // 3. Define Ray Direction
    const dir = { x: Math.cos(angle), y: Math.sin(angle) }

    // 4. Collect all segments (Custom Walls + Grid Edges)
    const segments = []
    
    // Grid Edges
    segments.push({ p1: {x:0, y:0}, p2: {x:gridW, y:0} }) // Top
    segments.push({ p1: {x:0, y:gridH}, p2: {x:gridW, y:gridH} }) // Bottom
    segments.push({ p1: {x:0, y:0}, p2: {x:0, y:gridH} }) // Left
    segments.push({ p1: {x:gridW, y:0}, p2: {x:gridW, y:gridH} }) // Right

    // Custom Walls
    const walls = unref(state.customWalls) || []
    walls.forEach(w => {
        for(let i=0; i < w.points.length; i++) {
            segments.push({
                p1: w.points[i],
                p2: w.points[(i+1) % w.points.length]
            })
        }
    })

    // 5. Find Closest Intersection
    let bestPoint = null
    let minDist = Infinity

    segments.forEach(seg => {
        const hit = getRayIntersection(origin, dir, seg.p1, seg.p2)
        if (hit && hit.dist < minDist) {
            minDist = hit.dist
            bestPoint = { x: hit.x, y: hit.y }
        }
    })

    return bestPoint
  }

  // Keep existing helpers for legacy support if needed
  function projectPointToSegment(px, py, x1, y1, x2, y2) { /* ... same as before ... */ 
    const A = px - x1; const B = py - y1
    const C = x2 - x1; const D = y2 - y1
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    if (lenSq !== 0) param = dot / lenSq
    let xx, yy
    if (param < 0) { xx = x1; yy = y1 }
    else if (param > 1) { xx = x2; yy = y2 }
    else { xx = x1 + param * C; yy = y1 + param * D }
    const dist = Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
    const angle = (Math.atan2(D, C) * 180 / Math.PI)
    return { x: xx, y: yy, dist, angle }
  }

  function getNearestWallPoint(x, y) { /* ... same as before ... */
    let bestDist = Infinity
    let bestPoint = null
    let bestAngle = 0
    const walls = unref(state.customWalls) || []
    walls.forEach(wall => {
      const pts = wall.points
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i]
        const p2 = pts[(i + 1) % pts.length] 
        const res = projectPointToSegment(x, y, p1.x, p1.y, p2.x, p2.y)
        if (res.dist < bestDist) {
          bestDist = res.dist
          bestPoint = { x: res.x, y: res.y }
          bestAngle = res.angle
        }
      }
    })
    return { point: bestPoint, dist: bestDist, angle: bestAngle }
  }

  function getNearestSnapPoint(x, y, gridW, gridH) { /* ... same as before ... */
     // 1. Check Custom Walls
    let result = getNearestWallPoint(x, y)
    // 2. Check Grid Edges
    const edges = [
      { p1: {x:0, y:0}, p2: {x:gridW, y:0} },       // Top
      { p1: {x:0, y:gridH}, p2: {x:gridW, y:gridH} }, // Bottom
      { p1: {x:0, y:0}, p2: {x:0, y:gridH} },       // Left
      { p1: {x:gridW, y:0}, p2: {x:gridW, y:gridH} }  // Right
    ]
    edges.forEach(edge => {
      const res = projectPointToSegment(x, y, edge.p1.x, edge.p1.y, edge.p2.x, edge.p2.y)
      if (res.dist < result.dist) {
        result = { point: {x: res.x, y: res.y}, dist: res.dist, angle: res.angle }
      }
    })
    return result
  }

  return { 
      addWallPoint, finishWall, removeWall, toggleSegmentType, 
      getNearestWallPoint, setSegmentType, updateWallPoint, 
      getNearestSnapPoint, getAngleSnapPoint // [NEW Export]
  }
}
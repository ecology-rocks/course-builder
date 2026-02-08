import { ref } from 'vue'

export function useCustomWalls(state, snapshot) {
  function addWallPoint(x, y) {
    if (!state.activeWall.value) {
      state.activeWall.value = {
        id: crypto.randomUUID(),
        points: [{ x, y }], // Start point
        segmentTypes: [] // Store metadata for each line segment
      }
    } else {
      const origin = state.activeWall.value.points[0]
      // Check if closing the loop (click near start)
      if (Math.abs(x - origin.x) < 0.5 && Math.abs(y - origin.y) < 0.5) {
        finishWall()
        return
      }
      state.activeWall.value.points.push({ x, y })
      // Default new segment to 'fence'
      state.activeWall.value.segmentTypes.push('fence') 
    }
  }

  function finishWall() {
    if (state.activeWall.value && state.activeWall.value.points.length > 2) {
      // Close the loop explicitly for data consistency
      const poly = JSON.parse(JSON.stringify(state.activeWall.value))
      // Add final segment closing back to start
      poly.segmentTypes.push('fence') 
      state.customWalls.value = [...(state.customWalls.value || []), poly]
    }
    state.activeWall.value = null
    if (snapshot) snapshot()
  }

  function removeWall(id) {
    state.customWalls.value = state.customWalls.value.filter(w => w.id !== id)
    if (snapshot) snapshot()
  }

  function updateWallPoint(wallId, pointIndex, x, y) {
    const wall = state.customWalls.value.find(w => w.id === wallId)
    if (wall && wall.points[pointIndex]) {
      wall.points[pointIndex] = { x, y }
      // Note: We don't snapshot on every move, usually only on dragend
    }
  }

  // [NEW] Explicitly set type (for Context Menu)
  function setSegmentType(wallId, segmentIndex, type) {
    const wall = state.customWalls.value.find(w => w.id === wallId)
    if (wall && wall.segmentTypes[segmentIndex]) {
      wall.segmentTypes[segmentIndex] = type
      if (snapshot) snapshot()
    }
  }

  function toggleSegmentType(wallId, segmentIndex) {
    const wall = state.customWalls.value.find(w => w.id === wallId)
    if (wall && wall.segmentTypes[segmentIndex]) {
      wall.segmentTypes[segmentIndex] = wall.segmentTypes[segmentIndex] === 'fence' ? 'solid' : 'fence'
      if (snapshot) snapshot()
    }
  }

  // Math Helper: Find nearest point on any custom wall
  function getNearestWallPoint(x, y) {
    let bestDist = Infinity
    let bestPoint = null
    let bestAngle = 0
    
    // Iterate all walls
    state.customWalls.value.forEach(wall => {
      const pts = wall.points
      // Iterate segments (wrapping around)
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i]
        const p2 = pts[(i + 1) % pts.length] // Wrap to 0
        
        // Project point onto segment
        const A = x - p1.x; const B = y - p1.y
        const C = p2.x - p1.x; const D = p2.y - p1.y
        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let param = -1
        if (lenSq !== 0) param = dot / lenSq
        
        let xx, yy
        if (param < 0) { xx = p1.x; yy = p1.y }
        else if (param > 1) { xx = p2.x; yy = p2.y }
        else { xx = p1.x + param * C; yy = p1.y + param * D }
        
        const dist = Math.sqrt((x - xx) ** 2 + (y - yy) ** 2)
        
        if (dist < bestDist) {
          bestDist = dist
          bestPoint = { x: xx, y: yy }
          // Calculate angle perpendicular to wall
          bestAngle = (Math.atan2(D, C) * 180 / Math.PI)
        }
      }
    })
    return { point: bestPoint, dist: bestDist, angle: bestAngle }
  }

  return { addWallPoint, finishWall, removeWall, toggleSegmentType, getNearestWallPoint, setSegmentType, updateWallPoint }
}
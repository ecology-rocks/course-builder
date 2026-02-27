// src/components/editor/tunnels/useTunnelLogic.js
import { ref, computed } from 'vue'


// [INSERT] At the top of the file, add this graph helper
// [REPLACE] The existing buildGraph function
function buildGraph(paths, resolveFn) {
  const adj = new Map()
  const addNode = (pt) => {
    const key = `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`
    if (!adj.has(key)) adj.set(key, { ...pt, neighbors: [] })
    return key
  }

  // 1. Collect all points from all paths
  const allPoints = []
  paths.forEach(p => {
    const pts = resolveFn(p)
    pts.forEach(pt => allPoints.push(pt))
  })

  // 2. Iterate every segment of every path and split at intersections
  paths.forEach(p => {
    const pts = resolveFn(p)
    for (let i = 0; i < pts.length - 1; i++) {
      const pStart = pts[i]
      const pEnd = pts[i+1]
      
      // Find all points that lie on this segment
      const pointsOnSegment = []
      
      allPoints.forEach(pt => {
        // Use a small epsilon for "on segment" check
        // getDistToSegment is available from the scope below
        if (getDistToSegment(pt, pStart, pEnd) < 0.1) {
           pointsOnSegment.push(pt)
        }
      })
      
      // Sort points linearly from Start to End
      const dx = pEnd.x - pStart.x
      const dy = pEnd.y - pStart.y
      
      pointsOnSegment.sort((a, b) => {
        const projA = (a.x - pStart.x) * dx + (a.y - pStart.y) * dy
        const projB = (b.x - pStart.x) * dx + (b.y - pStart.y) * dy
        return projA - projB
      })

      // Add edges between consecutive points
      for (let k = 0; k < pointsOnSegment.length - 1; k++) {
        const u = pointsOnSegment[k]
        const v = pointsOnSegment[k+1]
        
        const dist = Math.sqrt((u.x - v.x)**2 + (u.y - v.y)**2)
        if (dist < 0.1) continue // Skip duplicates

        const ku = addNode(u)
        const kv = addNode(v)
        
        // Add bidirectional edge
        adj.get(ku).neighbors.push({ key: kv, dist })
        adj.get(kv).neighbors.push({ key: ku, dist })
      }
    }
  })
  
  return adj
}

// --- MATH HELPERS ---
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

function getClosestPointOnSegment(p, p1, p2) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return p1

  let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))

  return { x: p1.x + t * dx, y: p1.y + t * dy }
}

function getDistToSegment(p, p1, p2) {
  const closest = getClosestPointOnSegment(p, p1, p2)
  const dx = p.x - closest.x
  const dy = p.y - closest.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function useTunnelLogic(store) {

  // ref defionitions
  const freeDrawAnchor = ref(null)


  // --- BALE LOGIC ---
  function getBaleDimensions(bale) {
    const rawL = Number(bale.custom?.length) || Number(store.baleConfig.length) || 3
    const rawW = Number(bale.custom?.width) || Number(store.baleConfig.width) || 1.5
    const rawH = Number(bale.custom?.height) || Number(store.baleConfig.height) || 1

    let width, height
    if (bale.orientation === 'tall') { width = rawL; height = rawH; }
    else if (bale.orientation === 'pillar') { width = rawW; height = rawH; }
    else { width = rawL; height = rawW; }
    return { width, height }
  }


  function handleFreeEdgeClick(x, y) {
    if (store.activeTool !== 'tunnel_edges') return
    
    // Simple Snap to 0.5 grid for sanity, or remove for pure freehand
    const snap = (v) => Math.round(v * 6) / 6
    const sx = snap(x)
    const sy = snap(y)

    if (!freeDrawAnchor.value) {
      freeDrawAnchor.value = { x: sx, y: sy }
    } else {
      // Prevent zero-length lines
      if (freeDrawAnchor.value.x === sx && freeDrawAnchor.value.y === sy) return

      store.mapData.boardEdges.push({
        id: crypto.randomUUID(),
        x1: freeDrawAnchor.value.x,
        y1: freeDrawAnchor.value.y,
        x2: sx,
        y2: sy,
        layer: store.currentLayer
      })
      
      // If holding Shift, we could chain them, but for now reset
      freeDrawAnchor.value = null
    }
  }

  function cancelFreeDraw() {
    freeDrawAnchor.value = null
  }
  // --- PATH LOGIC ---

  // 1. Identify "Docking Ports" (Centers of Board Edges)
  const snapTargets = computed(() => {
    return store.mapData.boardEdges
      .filter(e => {
        // [FIX] Legacy edges might be undefined. Treat them as Layer 1.
        const edgeLayer = e.layer === undefined ? 1 : e.layer
        return edgeLayer === store.currentLayer
      })
      .map(edge => ({
        id: edge.id,
        x: (edge.x1 + edge.x2) / 2,
        y: (edge.y1 + edge.y2) / 2,
        type: 'edge-center'
      }))
  })

  // 2. Click Logic for Snap Targets
  function handleSnapClick(targetId) {
    if (store.activeTool !== 'tunnel_path') return

    if (!store.tunnelConfig.activePathId) {
      const newId = crypto.randomUUID()
      store.mapData.tunnelPaths.push({
        id: newId,
        layer: store.currentLayer,
        points: [
          { type: 'edge-anchor', targetId: targetId }
        ],
      })
      store.tunnelConfig.activePathId = newId
    }
    else {
      const path = store.mapData.tunnelPaths.find(p => p.id === store.tunnelConfig.activePathId)
      if (path) {
        const lastPt = path.points[path.points.length - 1]
        if (lastPt.type === 'edge-anchor' && lastPt.targetId === targetId) return
        path.points.push({ type: 'edge-anchor', targetId: targetId })
      }
      store.tunnelConfig.activePathId = null
    }
  }

  // 3. Free Click Logic
function handleFreeClick(x, y) {
    if (store.activeTool !== 'tunnel_path' || !store.tunnelConfig.activePathId) return

    const snap = (v) => Math.round(v * 6) / 6
    const path = store.mapData.tunnelPaths.find(p => p.id === store.tunnelConfig.activePathId)
    if (path) {
      path.points.push({ type: 'static', x: snap(x), y: snap(y) })
    }
  }

  // 4. Data Resolver
  function resolvePathPoints(path) {
    if (!path.points) return []
    return path.points.map(pt => {
      if (pt.type === 'static') return { x: pt.x, y: pt.y }
      
      if (pt.type === 'edge-anchor') {
        const edge = store.mapData.boardEdges.find(e => e.id === pt.targetId)
        if (edge) {
          return {
            x: (edge.x1 + edge.x2) / 2,
            y: (edge.y1 + edge.y2) / 2
          }
        }
        // Fallback if edge deleted
        return { x: 0, y: 0 }
      }
      return { x: 0, y: 0 }
    })
  }


  function selectPath(id) {
    // We use the global selection array so it works with standard tools
    store.selection = [id]
    
    // If we are in the manager, also set the active ID for visual feedback
    // but ONLY if we aren't currently drawing a new one
    if (!store.tunnelConfig.activePathId) {
      // Optional: scroll to item in sidebar?
    }
  }

  function deletePath(id) {
    store.mapData.tunnelPaths = store.mapData.tunnelPaths.filter(p => p.id !== id)
    // Clear selection if we just deleted the selected object
    if (store.selection.includes(id)) {
      store.selection = []
    }
    // Clear active drawing if we deleted it
    if (store.tunnelConfig.activePathId === id) {
      store.tunnelConfig.activePathId = null
    }
  }


  // 5. Branching Logic
  function handlePathClick(targetPath, rawX, rawY) {
    // CHECK: Are we currently drawing a line?
    const isDrawing = store.activeTool === 'tunnel_path' && store.tunnelConfig.activePathId

    // CASE 1: DRAWING MODE (Branching)
    if (isDrawing) {
       // Prevent linking a path to itself
       if (targetPath.id === store.tunnelConfig.activePathId) return

       // A. Find the closest point on the target path to where the user clicked
       const pts = resolvePathPoints(targetPath)
       let bestPoint = { x: rawX, y: rawY }
       let minDist = Infinity

       for (let i = 0; i < pts.length - 1; i++) {
         const p1 = pts[i]
         const p2 = pts[i + 1]
         
         // Use the helper helper we defined at the top of the file
         const closest = getClosestPointOnSegment({ x: rawX, y: rawY }, p1, p2)
         
         const dist = Math.sqrt((closest.x - rawX) ** 2 + (closest.y - rawY) ** 2)
         if (dist < minDist) {
           minDist = dist
           bestPoint = closest
         }
       }

       // B. Add this calculated "Junction Point" to our CURRENT active path
       const currentPath = store.mapData.tunnelPaths.find(p => p.id === store.tunnelConfig.activePathId)
       if (currentPath) {
         currentPath.points.push({ 
           type: 'static', 
           x: bestPoint.x, 
           y: bestPoint.y 
         })
         
         // C. Finish the drawing session (since we linked to another tunnel)
         store.tunnelConfig.activePathId = null
       }
    } 
    // CASE 2: SELECTION MODE
    else {
      // We aren't drawing, so this click just means "Select this tunnel"
      selectPath(targetPath.id)
    }
  }

  function findPathDist(startPt, endPt, graph) {
  const startKey = `${startPt.x.toFixed(2)},${startPt.y.toFixed(2)}`
  const endKey = `${endPt.x.toFixed(2)},${endPt.y.toFixed(2)}`
  if (!graph.has(startKey) || !graph.has(endKey)) return 0

  // Dijkstra
  const dists = new Map(); dists.set(startKey, 0)
  const queue = [startKey]
  
  while(queue.length) {
    queue.sort((a,b) => (dists.get(a)||Infinity) - (dists.get(b)||Infinity))
    const u = queue.shift()
    if (u === endKey) return dists.get(u)

    const neighbors = graph.get(u).neighbors
    for(const n of neighbors) {
      const alt = dists.get(u) + n.dist
      if (alt < (dists.get(n.key) || Infinity)) {
        dists.set(n.key, alt)
        queue.push(n.key)
      }
    }
  }
  return 0
}

// [REPLACE] The tunnelGroups computed property
const tunnelGroups = computed(() => {
    const paths = store.mapData.tunnelPaths
    const visited = new Set()
    const groups = []

    // 1. Cluster paths (Keep existing clustering logic)
    const areConnected = (p1, p2) => {
      const pts1 = resolvePathPoints(p1); const pts2 = resolvePathPoints(p2)
      const THRESHOLD = 0.15 
      return pts1.some(pt => {
        for (let i = 0; i < pts2.length - 1; i++) {
          if (getDistToSegment(pt, pts2[i], pts2[i+1]) < THRESHOLD) return true
        }
        return false
      }) || pts2.some(pt => {
         for (let i = 0; i < pts1.length - 1; i++) {
          if (getDistToSegment(pt, pts1[i], pts1[i+1]) < THRESHOLD) return true
        }
        return false
      })
    }

    const buildCluster = (currentPath, cluster) => {
      visited.add(currentPath.id)
      cluster.push(currentPath)
      paths.forEach(p2 => {
        if (!visited.has(p2.id) && areConnected(currentPath, p2)) buildCluster(p2, cluster)
      })
    }

    paths.forEach(p => {
      if (!visited.has(p.id)) {
        const cluster = []
        buildCluster(p, cluster)
        
        // --- Portal & Segment Logic ---
        
        // 1. Calculate Total Length (Sum of lines)
        let totalLen = 0
        cluster.forEach(subPath => {
          const pts = resolvePathPoints(subPath)
          for (let i = 0; i < pts.length - 1; i++) {
             totalLen += Math.sqrt((pts[i+1].x - pts[i].x)**2 + (pts[i+1].y - pts[i].y)**2)
          }
        })

        // 2. Identify Portals (Board Edges)
        const portalIds = new Set()
        cluster.forEach(subPath => {
          if(!subPath.points) return
          subPath.points.forEach(pt => {
            if(pt.type === 'edge-anchor' && pt.targetId) portalIds.add(pt.targetId)
          })
        })

        const portals = Array.from(portalIds).map((eid, idx) => {
          const edge = store.mapData.boardEdges.find(e => e.id === eid)
          if(!edge) return null
          
          // Position label at 25% of the line to avoid the center snap handle
          const t = 0.25 
          return {
            id: eid,
            label: String.fromCharCode(65 + idx), // A, B, C...
            x: edge.x1 + (edge.x2 - edge.x1) * t,
            y: edge.y1 + (edge.y2 - edge.y1) * t,
            rawX: (edge.x1 + edge.x2) / 2, // Keep center for graph calculation
            rawY: (edge.y1 + edge.y2) / 2
          }
        }).filter(Boolean)

        // 3. Build Graph & Calculate Pairwise Distances
        const segments = []
        if(portals.length > 1) {
           const graph = buildGraph(cluster, resolvePathPoints)
           
           for(let i=0; i<portals.length; i++) {
             for(let j=i+1; j<portals.length; j++) {
               const pA = portals[i]; const pB = portals[j]
               
               // We must use the raw center points for the graph traversal
               // because the graph nodes are built from the path endpoints (which are centered on edges)
               const start = { x: pA.rawX, y: pA.rawY }
               const end = { x: pB.rawX, y: pB.rawY }

               const dist = findPathDist(start, end, graph)
               if(dist > 0) {
                 segments.push({
                   label: `${pA.label}-${pB.label}`,
                   dist: dist.toFixed(1)
                 })
               }
             }
           }
        }

        groups.push({
          id: cluster[0].id,
          name: `Tunnel ${groups.length + 1}`,
          paths: cluster,
          totalLength: totalLen.toFixed(1),
          portals,
          segments
        })
      }
    })

    return groups
  })

  function selectGroup(group) {
    store.selection = group.paths.map(p => p.id)
  }

  function deleteGroup(group) {
    const idsToRemove = group.paths.map(p => p.id)
    store.mapData.tunnelPaths = store.mapData.tunnelPaths.filter(p => !idsToRemove.includes(p.id))
    store.selection = []
  }

  function findPathAtPoint(x, y, threshold = 0.5) {
    const paths = store.mapData.tunnelPaths.filter(p => p.layer === store.currentLayer)
    
    for (const path of paths) {
      // Don't snap to self while drawing (optional, but usually good)
      if (path.id === store.tunnelConfig.activePathId) continue

      const pts = resolvePathPoints(path)
      for (let i = 0; i < pts.length - 1; i++) {
        const dist = getDistToSegment({ x, y }, pts[i], pts[i+1])
        if (dist <= threshold) {
          return path
        }
      }
    }
    return null
  }

  function updatePathPoint(pathId, pointIndex, x, y) {
    const path = store.mapData.tunnelPaths.find(p => p.id === pathId)
    if (!path || !path.points[pointIndex]) return

    // Convert to static point at new location
    // We snap to 0.5 grid here for consistency
    const snap = (v) => Math.round(v * 6) / 6
    
    path.points[pointIndex] = {
      type: 'static',
      x: snap(x),
      y: snap(y)
    }
  }

  return {
    freeDrawAnchor,
    handleFreeEdgeClick,
    cancelFreeDraw,
    tunnelGroups,
    selectGroup,
    deleteGroup,
    snapTargets,
    handleSnapClick,
    handleFreeClick,
    resolvePathPoints,
    handlePathClick,
    selectPath,
    deletePath,
    findPathAtPoint,
    updatePathPoint,
  }
}
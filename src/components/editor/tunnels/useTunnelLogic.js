// src/components/editor/tunnels/useTunnelLogic.js
import { ref, computed } from 'vue'

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

export function useTunnelLogic(store) {
  const pendingHandle = ref(null)

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

  function getBaleHandles(bale) {
    const { width, height } = getBaleDimensions(bale)
    const cx = bale.x + width / 2
    const cy = bale.y + height / 2
    const INSET = 0.5

    const dx = Math.max(0.1, width / 2 - INSET)
    const dy = Math.max(0.1, height / 2 - INSET)

    const localPoints = [
      { x: cx - dx, y: cy - dy },
      { x: cx + dx, y: cy - dy },
      { x: cx + dx, y: cy + dy },
      { x: cx - dx, y: cy + dy },
    ]

    return localPoints.map((p, idx) => ({
      ...rotatePoint(p.x, p.y, cx, cy, bale.rotation || 0),
      id: `${bale.id}_h${idx}`,
      baleId: bale.id
    }))
  }

  function handleHandleClick(handlePoint) {
    if (store.activeTool !== 'tunnel_edges') return
    if (!pendingHandle.value) {
      pendingHandle.value = handlePoint
    } else {
      if (pendingHandle.value.id === handlePoint.id) return
      store.mapData.boardEdges.push({
        id: crypto.randomUUID(),
        x1: pendingHandle.value.x,
        y1: pendingHandle.value.y,
        x2: handlePoint.x,
        y2: handlePoint.y,
        layer: store.currentLayer // New edges get a layer
      })
      pendingHandle.value = null
    }
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
        // [FIX] Use 'custom' instead of 'style'
        custom: { 
          strokeColor: 'blue', 
          strokeWidth: 2, 
          dash: [10, 5] 
        }
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

    const path = store.mapData.tunnelPaths.find(p => p.id === store.tunnelConfig.activePathId)
    if (path) {
      path.points.push({ type: 'static', x, y })
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

  return {
    pendingHandle,
    getBaleHandles,
    handleHandleClick,
    snapTargets,
    handleSnapClick,
    handleFreeClick,
    resolvePathPoints,
    handlePathClick,
    selectPath,
    deletePath
  }
}
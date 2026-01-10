import { ref } from 'vue'

export function useSelectionLogic(state, snapshot, validateFn) {
  
  // Helper: Find an object by ID across ALL data types
  function findObjectById(id) {
    // We iterate over the keys in mapData (bales, hides, zones, etc.)
    const keys = Object.keys(state.mapData.value)
    
    for (const key of keys) {
      const collection = state.mapData.value[key]
      
      // Handle Arrays (bales, hides, etc.)
      if (Array.isArray(collection)) {
        const found = collection.find(item => item.id === id)
        if (found) return { item: found, type: key }
      } 
      // Handle Singletons (startBox, gate) - if they have an ID
      else if (collection && collection.id === id) {
        return { item: collection, type: key }
      }
    }
    return null
  }

  function selectObject(id, multi = false) {
    if (!multi) {
      state.selection.value = [id]
    } else {
      const index = state.selection.value.indexOf(id)
      if (index === -1) {
        state.selection.value.push(id)
      } else {
        state.selection.value.splice(index, 1)
      }
    }
  }


function selectArea(x, y, w, h) {
    // Normalize Rect
    const rect = {
      x: w < 0 ? x + w : x,
      y: h < 0 ? y + h : y,
      w: Math.abs(w),
      h: Math.abs(h)
    }

    const newSelection = []
    const isInside = (ox, oy) => ox >= rect.x && ox <= rect.x + rect.w && oy >= rect.y && oy <= rect.y + rect.h

    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]

      if (Array.isArray(collection)) {
        collection.forEach(item => {
          // 1. Layer Check for Bales

          // 2. Determine "Center" for Selection
          let cx, cy
          
          if (item.x1 !== undefined && item.y1 !== undefined) {
             // It's a Board (Line) -> Use Midpoint
             cx = (item.x1 + item.x2) / 2
             cy = (item.y1 + item.y2) / 2
          } else {
             // Standard Object
             cx = item.x
             cy = item.y
             // Offset Bales slightly to match visual center
             if (key === 'bales') { cx += 1.5; cy += 0.75 }
          }

          if (isInside(cx, cy)) newSelection.push(item.id)
        })
      } 
      // Singletons (StartBox, Gate)
      else if (collection && collection.id) {
        if (isInside(collection.x, collection.y)) newSelection.push(collection.id)
      }
    })

    state.selection.value = newSelection
  }

  function clearSelection() {
    state.selection.value = []
  }

  function deleteSelection() {
    if (state.selection.value.length === 0) return
    

    // Iterate through mapData to remove items
    // This replaces the 15 "state.bales.value = ..." lines
    const idsToDelete = state.selection.value
    const keys = Object.keys(state.mapData.value)

    keys.forEach(key => {
      const collection = state.mapData.value[key]
      
      if (Array.isArray(collection)) {
        // Filter out the deleted items
        state.mapData.value[key] = collection.filter(item => !idsToDelete.includes(item.id))
      } else if (collection && idsToDelete.includes(collection.id)) {
        // Handle singleton deletion (set to null)
        state.mapData.value[key] = null
      }
    })

    clearSelection()
    if (validateFn) validateFn()
  }

function rotateSelection() {
    const ids = state.selection.value
    if (ids.length === 0) return

    // Helper: Get Intrinsic (Unrotated) Dimensions to calculate true centers
    const getIntrinsicDims = (item, key) => {
      if (key === 'bales') {
         const conf = state.baleConfig?.value || { length: 3, width: 1.5, height: 1 }
         if (item.orientation === 'tall') return { w: conf.length, h: conf.height }
         if (item.orientation === 'pillar') return { w: conf.width, h: conf.height }
         return { w: conf.length, h: conf.width }
      }
      return { w: item.width || 0, h: item.height || 0 }
    }

    // [FIX] Snap to 1/6 (2 inches) for final positions
    const snap = (val) => Math.round(val * 6) / 6
    
    const itemsToRotate = []
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    // 1. Calculate Group Bounds (Visual)
    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      const list = Array.isArray(collection) ? collection : (collection ? [collection] : [])

      list.forEach(item => {
        if (ids.includes(item.id)) {
          
          if (item.x1 !== undefined) { 
            // --- Boards/Lines ---
            itemsToRotate.push({ item, type: 'line' })
            minX = Math.min(minX, item.x1, item.x2); maxX = Math.max(maxX, item.x1, item.x2)
            minY = Math.min(minY, item.y1, item.y2); maxY = Math.max(maxY, item.y1, item.y2)
          } else {
            // --- Bales/Objects ---
            const { w, h } = getIntrinsicDims(item, key)
            
            // Calculate Geometric Center
            const cx = item.x + w / 2
            const cy = item.y + h / 2

            // Calculate Visual Bounds (rotated)
            const isRotated = item.rotation && Math.abs(item.rotation % 180) === 90
            const visualW = isRotated ? h : w
            const visualH = isRotated ? w : h
            
            const left = cx - visualW / 2
            const right = cx + visualW / 2
            const top = cy - visualH / 2
            const bottom = cy + visualH / 2

            itemsToRotate.push({ item, type: 'obj', w, h, cx, cy })

            minX = Math.min(minX, left); maxX = Math.max(maxX, right)
            minY = Math.min(minY, top); maxY = Math.max(maxY, bottom)
          }
        }
      })
    })

    if (itemsToRotate.length === 0) return

    // 2. Find Group Pivot Point
    // [FIX] We do NOT snap the pivot to the grid. 
    // Snapping the pivot causes the entire group to drift if the center is at, say, 0.75 ft.
    const groupCx = (minX + maxX) / 2
    const groupCy = (minY + maxY) / 2

    // 3. Rotate Items
    itemsToRotate.forEach(entry => {
      const { item } = entry
      
      const rotatePoint = (px, py) => ({
        x: groupCx - (py - groupCy),
        y: groupCy + (px - groupCx)
      })

      if (entry.type === 'line') {
        const p1 = rotatePoint(item.x1, item.y1)
        const p2 = rotatePoint(item.x2, item.y2)
        item.x1 = snap(p1.x); item.y1 = snap(p1.y)
        item.x2 = snap(p2.x); item.y2 = snap(p2.y)
      } else {
        const { w, h, cx, cy } = entry
        
        // A. Rotate the Center
        const newCenter = rotatePoint(cx, cy)
        
        // B. Update Rotation
        item.rotation = (item.rotation || 0) + 90

        // C. Calculate New Top-Left and Snap
        item.x = snap(newCenter.x - w / 2)
        item.y = snap(newCenter.y - h / 2)
      }
    })

    if (validateFn) validateFn()
  }

  // Generic Move Function
  // Moves selected items by a delta (dx, dy)
  function moveSelection(dx, dy) {
    const ids = state.selection.value
    if (ids.length === 0) return

    // Optimization: We loop through mapData once
    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      if (Array.isArray(collection)) {
         collection.forEach(item => {
           if (ids.includes(item.id)) {
             item.x += dx
             item.y += dy
           }
         })
      } else if (collection && ids.includes(collection.id)) {
         collection.x += dx
         collection.y += dy
      }
    })
  }

  return {
    selectObject,
    selectArea,
    clearSelection,
    deleteSelection,
    rotateSelection,
    moveSelection,
    findObjectById
  }
}
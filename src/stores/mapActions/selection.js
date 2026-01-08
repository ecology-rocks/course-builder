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

    // 1. Prepare items with their CURRENT VISUAL dimensions
    // We must do this first to calculate the correct Group Center
    const itemsToRotate = []
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      const list = Array.isArray(collection) ? collection : (collection ? [collection] : [])

      list.forEach(item => {
        if (ids.includes(item.id)) {
          // Determine Raw Dimensions (Defaults for Bales)
          const rawW = item.width !== undefined ? item.width : (key === 'bales' ? 3 : 0)
          const rawH = item.height !== undefined ? item.height : (key === 'bales' ? 1.5 : 0)

          // Determine Visual Dimensions based on current rotation
          // If rotated 90 or 270, width and height are visually swapped
          const isRotatedSides = item.rotation && Math.abs(item.rotation % 180) === 90
          const visualW = isRotatedSides ? rawH : rawW
          const visualH = isRotatedSides ? rawW : rawH

          itemsToRotate.push({ item, visualW, visualH })

          // Update Group Bounds
          if (item.x1 !== undefined) { // Line/Board
            minX = Math.min(minX, item.x1, item.x2); maxX = Math.max(maxX, item.x1, item.x2)
            minY = Math.min(minY, item.y1, item.y2); maxY = Math.max(maxY, item.y1, item.y2)
          } else {
            minX = Math.min(minX, item.x); maxX = Math.max(maxX, item.x + visualW)
            minY = Math.min(minY, item.y); maxY = Math.max(maxY, item.y + visualH)
          }
        }
      })
    })

    if (itemsToRotate.length === 0) return

    // 2. Find Group Pivot Point (Center of the selection)
    // We round this to the nearest 0.5 to keep rotations aligned with the grid
    const cx = Math.round(((minX + maxX) / 2) * 2) / 2
    const cy = Math.round(((minY + maxY) / 2) * 2) / 2

    // 3. Rotate Every Item around (cx, cy)
    itemsToRotate.forEach(({ item, visualW, visualH }) => {
      
      // Helper: Rotate point (px, py) 90 degrees clockwise around (cx, cy)
      const rotatePoint = (px, py) => ({
        x: cx - (py - cy),
        y: cy + (px - cx)
      })

      if (item.x1 !== undefined) { 
        // --- Handle Lines/Boards ---
        const p1 = rotatePoint(item.x1, item.y1)
        const p2 = rotatePoint(item.x2, item.y2)
        item.x1 = Math.round(p1.x * 2) / 2
        item.y1 = Math.round(p1.y * 2) / 2
        item.x2 = Math.round(p2.x * 2) / 2
        item.y2 = Math.round(p2.y * 2) / 2
      } else {
        // --- Handle Standard Objects (Bales, Zones, etc.) ---
        
        // A. Find the object's CURRENT center
        const oldCx = item.x + visualW / 2
        const oldCy = item.y + visualH / 2

        // B. Orbit that center around the Group Center
        const newCenter = rotatePoint(oldCx, oldCy)

        // C. Update Rotation
        item.rotation = (item.rotation || 0) + 90

        // D. Calculate new Top-Left (x,y)
        // Since we rotated 90deg, the New Visual Width is the Old Visual Height
        const newVisualW = visualH
        const newVisualH = visualW

        // E. Apply with Grid Snapping
        item.x = Math.round((newCenter.x - newVisualW / 2) * 2) / 2
        item.y = Math.round((newCenter.y - newVisualH / 2) * 2) / 2
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
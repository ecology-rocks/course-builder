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

    // 1. Gather Items
    const items = []
    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      if (Array.isArray(collection)) {
        collection.forEach(item => { if (ids.includes(item.id)) items.push(item) })
      } else if (collection && ids.includes(collection.id)) {
        items.push(collection)
      }
    })

    if (items.length === 0) return

    // 2. Find Center of Mass
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    items.forEach(item => {
      if (item.x1 !== undefined) {
        minX = Math.min(minX, item.x1, item.x2); maxX = Math.max(maxX, item.x1, item.x2)
        minY = Math.min(minY, item.y1, item.y2); maxY = Math.max(maxY, item.y1, item.y2)
      } else {
        // Approximate center based on x/y
        minX = Math.min(minX, item.x); maxX = Math.max(maxX, item.x)
        minY = Math.min(minY, item.y); maxY = Math.max(maxY, item.y)
      }
    })
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    // 3. Rotate
    items.forEach(item => {
      // 90 deg rotation formula: (x, y) -> (cy - (y - cy), cx + (x - cx))
      // Simplified: x' = cx - (y - cy), y' = cy + (x - cx)
      
      const rot = (x, y) => ({
        x: cx - (y - cy),
        y: cy + (x - cx)
      })

      if (item.x1 !== undefined) { // Board
        const p1 = rot(item.x1, item.y1)
        const p2 = rot(item.x2, item.y2)
        item.x1 = Math.round(p1.x * 2) / 2
        item.y1 = Math.round(p1.y * 2) / 2
        item.x2 = Math.round(p2.x * 2) / 2
        item.y2 = Math.round(p2.y * 2) / 2
      } else {
        // Correct offset for Bales to rotate around their visual center
        // If it's a bale, it is usually 3x1.5. Visual Center is x+1.5, y+0.75
        // This simple point rotation rotates the top-left corner.
        // For 90 degree turns, rotating the top-left corner usually lands it correctly 
        // relative to the group, provided we also rotate the object itself.
        
        const p = rot(item.x, item.y)
        item.x = Math.round(p.x * 2) / 2
        item.y = Math.round(p.y * 2) / 2
        
        if (item.rotation !== undefined) {
          item.rotation = (item.rotation + 90) % 360
        }
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
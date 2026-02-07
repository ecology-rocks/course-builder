import { ref } from 'vue'

export function useSelectionLogic(state, snapshot, notifications) {
  
  const clipboard = ref([]);


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

// [NEW] Select All Logic
  function selectAll() {
    const allIds = []
    
    // Iterate over all collections and gather IDs
    Object.keys(state.mapData.value).forEach(key => {
      // Gate is fixed to the wall; exclude it from bulk selection
      if (key === 'gate') return 

      const collection = state.mapData.value[key]
      if (Array.isArray(collection)) {
        collection.forEach(item => {
          if (item.id) allIds.push(item.id)
        })
      } else if (collection && collection.id) {
        allIds.push(collection.id)
      }
    })

    state.selection.value = allIds
  }
  
function selectArea(x, y, w, h) {
    const rect = {
      x: w < 0 ? x + w : x,
      y: h < 0 ? y + h : y,
      w: Math.abs(w),
      h: Math.abs(h)
    }

    const newSelection = []
    const isInside = (ox, oy) => ox >= rect.x && ox <= rect.x + rect.w && oy >= rect.y && oy <= rect.y + rect.h
    const overlaps = (r1, r2) => !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y)

    // Helper to check a specific item
    const checkItem = (item, key) => {
        if (item.x1 !== undefined && item.y1 !== undefined) {
           // Boards (Line Bounding Box)
           const minX = Math.min(item.x1, item.x2); const maxX = Math.max(item.x1, item.x2)
           const minY = Math.min(item.y1, item.y2); const maxY = Math.max(item.y1, item.y2)
           if (overlaps(rect, { x: minX, y: minY, w: maxX - minX, h: maxY - minY })) newSelection.push(item.id)
        } 
        else if (item.points && Array.isArray(item.points)) {
           // Measurements (Multi-point Bounding Box)
           const xs = item.points.map(p => p.x)
           const ys = item.points.map(p => p.y)
           const minX = Math.min(...xs); const maxX = Math.max(...xs)
           const minY = Math.min(...ys); const maxY = Math.max(...ys)
           if (overlaps(rect, { x: minX, y: minY, w: maxX - minX, h: maxY - minY })) newSelection.push(item.id)
        }
        else {
           // Standard Objects (Center point)
           let cx = item.x; let cy = item.y
           
           // Offsets for better center-detection
           if (key === 'bales') { cx += 1.5; cy += 0.75 }
           if (key === 'startBox') { cx += 2.5; cy += 2 } // Approx center of 5x4 box
           
           if (isInside(cx, cy)) newSelection.push(item.id)
        }
    }

    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      
      // Case 1: Array Collections (Bales, Hides, etc.)
      if (Array.isArray(collection)) {
        collection.forEach(item => checkItem(item, key))
      } 
      // Case 2: Singleton Objects (StartBox, Gate)
      else if (collection && collection.id) {
        checkItem(collection, key)
      }
    })

    state.selection.value = newSelection
  }

  function clearSelection() {
    state.selection.value = []
  }

function removeObject(id) {
    const keys = Object.keys(state.mapData.value)
    let found = false

    keys.forEach(key => {
      if (found) return
      const collection = state.mapData.value[key]
      
      if (Array.isArray(collection)) {
        const idx = collection.findIndex(item => item.id === id)
        if (idx !== -1) {
          state.mapData.value[key].splice(idx, 1)
          found = true
        }
      } else if (collection && collection.id === id) {
        state.mapData.value[key] = null
        found = true
      }
    })

    // Also remove from selection if present
    if (state.selection.value.includes(id)) {
      state.selection.value = state.selection.value.filter(sid => sid !== id)
    }

  }


  function deleteSelection() {

    if (state.activeMeasurement && state.activeMeasurement.value) {
      state.activeMeasurement.value = null
      return
    }

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
  }

function rotateSelection(angle = 90) {
    const ids = state.selection.value
    if (ids.length === 0) return

    const getIntrinsicDims = (item, key) => {
      if (key === 'bales') {
          const conf = state.baleConfig?.value || { length: 3, width: 1.5, height: 1 }
          if (item.orientation === 'tall') return { w: conf.length, h: conf.height }
          if (item.orientation === 'pillar') return { w: conf.width, h: conf.height }
          return { w: conf.length, h: conf.width }
      }
      return { w: item.width || 0, h: item.height || 0 }
    }

    const snap = (val) => Math.round(val * 6) / 6
    
    const itemsToRotate = []
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    // 1. Calculate Group Bounds
    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      const list = Array.isArray(collection) ? collection : (collection ? [collection] : [])

      list.forEach(item => {
        if (ids.includes(item.id)) {
          if (item.x1 !== undefined) { 
            // Lines
            itemsToRotate.push({ item, type: 'line' })
            minX = Math.min(minX, item.x1, item.x2); maxX = Math.max(maxX, item.x1, item.x2)
            minY = Math.min(minY, item.y1, item.y2); maxY = Math.max(maxY, item.y1, item.y2)
          } else {
            // Objects
            const { w, h } = getIntrinsicDims(item, key)
            const cx = item.x + w / 2
            const cy = item.y + h / 2
            
            // For bounds, we care about the visual footprint
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

    // 2. Determine Pivot Point (Center of Group)
    const groupCx = (minX + maxX) / 2
    const groupCy = (minY + maxY) / 2

    // Pre-calculate rotation math
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // 3. Rotate Items
    itemsToRotate.forEach(entry => {
      const { item } = entry
      
      // Rotate point around Group Center
      const rotatePoint = (px, py) => ({
        x: groupCx + (px - groupCx) * cos - (py - groupCy) * sin,
        y: groupCy + (px - groupCx) * sin + (py - groupCy) * cos
      })

      if (entry.type === 'line') {
        const p1 = rotatePoint(item.x1, item.y1)
        const p2 = rotatePoint(item.x2, item.y2)
        item.x1 = snap(p1.x); item.y1 = snap(p1.y)
        item.x2 = snap(p2.x); item.y2 = snap(p2.y)
      } else {
        const { w, h, cx, cy } = entry
        const newCenter = rotatePoint(cx, cy)
        
        // [UPDATED] Use dynamic angle
        item.rotation = (item.rotation || 0) + angle
        
        item.x = snap(newCenter.x - w / 2)
        item.y = snap(newCenter.y - h / 2)
      }
    })


  }

  // Generic Move Function
  // Moves selected items by a delta (dx, dy)
  function moveSelection(dx, dy) {
    const ids = state.selection.value
    if (ids.length === 0) return

    Object.keys(state.mapData.value).forEach(key => {
      // [UPDATED] Block Gate from being moved by arrow keys or group drag
      if (key === 'gate') return

      const collection = state.mapData.value[key]
      const moveItem = (item) => {
        if (!ids.includes(item.id)) return

        if (item.x1 !== undefined && item.y1 !== undefined) {
          item.x1 += dx; item.y1 += dy
          item.x2 += dx; item.y2 += dy
        } 
        else if (item.points && Array.isArray(item.points)) {
          item.points.forEach(p => { p.x += dx; p.y += dy })
        } 
        else {
          item.x += dx
          item.y += dy
        }
      }

      if (Array.isArray(collection)) {
         collection.forEach(moveItem)
      } else if (collection && ids.includes(collection.id)) {
         moveItem(collection)
      }
    })

    if (snapshot) snapshot()
  }

  function copySelection() {
    const ids = state.selection.value;
    if (ids.length === 0) return;

    const itemsToCopy = [];
    Object.keys(state.mapData.value).forEach((key) => {
      const collection = state.mapData.value[key];
      if (Array.isArray(collection)) {
        collection.forEach((item) => {
          if (ids.includes(item.id)) {
            itemsToCopy.push({ ...item, _type: key });
          }
        });
      }
    });

    clipboard.value = itemsToCopy;
    if (notifications && notifications.show) {
      notifications.show(`Copied ${itemsToCopy.length} items`)
    }

    return itemsToCopy.length; 
  }

  function pasteSelection() {
    if (clipboard.value.length === 0) return;

    state.selection.value = []; // Clear selection

    clipboard.value.forEach((clipItem) => {
      const type = clipItem._type;
      if (!state.mapData.value[type]) return;

      // Clone and assign new ID
      const newItem = JSON.parse(JSON.stringify(clipItem));
      newItem.id = crypto.randomUUID();

      // Offset slightly
      if (newItem.x !== undefined) newItem.x += 1;
      if (newItem.y !== undefined) newItem.y += 1;
      if (newItem.x1 !== undefined) {
        newItem.x1 += 1;
        newItem.x2 += 1;
        newItem.y1 += 1;
        newItem.y2 += 1;
      }

      delete newItem._type;

      if (Array.isArray(state.mapData.value[type])) {
        state.mapData.value[type].push(newItem);
        state.selection.value.push(newItem.id);
      }
    });

    if (snapshot) snapshot();
  }

  function cutSelection() {
    const count = copySelection();
    deleteSelection(); // This function should already exist in this file
    return count;
  }

  return {
    selectObject,
    selectArea,
    selectAll,
    clearSelection,
    deleteSelection,
    rotateSelection,
    removeObject,
    moveSelection,
    findObjectById,
    clipboard,
    copySelection,
    pasteSelection,
    cutSelection,
  }
}
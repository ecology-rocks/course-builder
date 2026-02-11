import { ref } from 'vue'

export function useSelectionLogic(state, snapshot, notifications) {
  
  const clipboard = ref([]);

  // [UPDATED] Helper: Find an object by ID across ALL data types, INCLUDING Blinds
  function findObjectById(id) {
    const keys = Object.keys(state.mapData.value)
    
    for (const key of keys) {
      const collection = state.mapData.value[key]
      
      // Special Handling for Blinds: Look inside them!
      if (key === 'blinds' && Array.isArray(collection)) {
        for (const blind of collection) {
          if (blind.hides) {
            const foundHide = blind.hides.find(h => h.id === id)
            if (foundHide) return { item: foundHide, type: 'blind_hide', parent: blind }
          }
        }
      }

      // Handle Arrays (bales, hides, etc.)
      else if (Array.isArray(collection)) {
        const found = collection.find(item => item.id === id)
        if (found) return { item: found, type: key }
      } 
      // Handle Singletons (startBox, gate)
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

  function selectAll() {
    const allIds = []
    
    Object.keys(state.mapData.value).forEach(key => {
      if (key === 'gate') return 

      const collection = state.mapData.value[key]

      // [UPDATED] Gather IDs from Blinds too
      if (key === 'blinds' && Array.isArray(collection)) {
        collection.forEach(blind => {
          if (blind.hides) blind.hides.forEach(h => allIds.push(h.id))
        })
      }
      else if (Array.isArray(collection)) {
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

    const checkItem = (item, key) => {
        if (item.x1 !== undefined && item.y1 !== undefined) {
           const minX = Math.min(item.x1, item.x2); const maxX = Math.max(item.x1, item.x2)
           const minY = Math.min(item.y1, item.y2); const maxY = Math.max(item.y1, item.y2)
           if (overlaps(rect, { x: minX, y: minY, w: maxX - minX, h: maxY - minY })) newSelection.push(item.id)
        } 
        else if (item.points && Array.isArray(item.points)) {
           const xs = item.points.map(p => p.x)
           const ys = item.points.map(p => p.y)
           const minX = Math.min(...xs); const maxX = Math.max(...xs)
           const minY = Math.min(...ys); const maxY = Math.max(...ys)
           if (overlaps(rect, { x: minX, y: minY, w: maxX - minX, h: maxY - minY })) newSelection.push(item.id)
        }
        else {
           let cx = item.x; let cy = item.y
           if (key === 'bales') { cx += 1.5; cy += 0.75 }
           if (key === 'startBox') { cx += 2.5; cy += 2 } 
           
           if (isInside(cx, cy)) newSelection.push(item.id)
        }
    }

    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      
      // [UPDATED] Area Select inside Blinds
      if (key === 'blinds' && Array.isArray(collection)) {
        collection.forEach(blind => {
          if (blind.hides) blind.hides.forEach(item => checkItem(item, 'blind_hide'))
        })
      }
      else if (Array.isArray(collection)) {
        collection.forEach(item => checkItem(item, key))
      } 
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
      
      // [UPDATED] Remove single object from Blind
      if (key === 'blinds' && Array.isArray(collection)) {
        collection.forEach(blind => {
           if (blind.hides) {
             const idx = blind.hides.findIndex(h => h.id === id)
             if (idx !== -1) {
               blind.hides.splice(idx, 1)
               found = true
             }
           }
        })
      }
      else if (Array.isArray(collection)) {
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
    
    const idsToDelete = state.selection.value
    const keys = Object.keys(state.mapData.value)

    keys.forEach(key => {
      const collection = state.mapData.value[key]
      
      // [UPDATED] Delete items from inside Blinds
      if (key === 'blinds' && Array.isArray(collection)) {
        collection.forEach(blind => {
          if (blind.hides) {
            blind.hides = blind.hides.filter(h => !idsToDelete.includes(h.id))
          }
        })
      }
      else if (Array.isArray(collection)) {
        state.mapData.value[key] = collection.filter(item => !idsToDelete.includes(item.id))
      } else if (collection && idsToDelete.includes(collection.id)) {
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

    // 1. Calculate Group Bounds (INCLUDING BLINDS)
    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      
      // [UPDATED] Helper to process list of items
      const processList = (list, typeKey) => {
        list.forEach(item => {
          if (ids.includes(item.id)) {
            if (item.x1 !== undefined) { 
              itemsToRotate.push({ item, type: 'line' })
              minX = Math.min(minX, item.x1, item.x2); maxX = Math.max(maxX, item.x1, item.x2)
              minY = Math.min(minY, item.y1, item.y2); maxY = Math.max(maxY, item.y1, item.y2)
            } else {
              const { w, h } = getIntrinsicDims(item, typeKey)
              const cx = item.x + w / 2
              const cy = item.y + h / 2
              
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
      }

      // [UPDATED] Check inside Blinds
      if (key === 'blinds' && Array.isArray(collection)) {
         collection.forEach(blind => {
           if (blind.hides) processList(blind.hides, 'blind_hide')
         })
      } 
      else if (Array.isArray(collection)) {
         processList(collection, key)
      } else if (collection) {
         processList([collection], key)
      }
    })

    if (itemsToRotate.length === 0) return

    // 2. Determine Pivot
    const groupCx = (minX + maxX) / 2
    const groupCy = (minY + maxY) / 2

    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // 3. Rotate
    itemsToRotate.forEach(entry => {
      const { item } = entry
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
        item.rotation = (item.rotation || 0) + angle
        item.x = snap(newCenter.x - w / 2)
        item.y = snap(newCenter.y - h / 2)
      }
    })
  }

  // [UPDATED] Move Selection: NOW UPDATES BLIND HIDES TOO
  function moveSelection(dx, dy) {
    const ids = state.selection.value
    if (ids.length === 0) return

    Object.keys(state.mapData.value).forEach(key => {
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

      // [FIX] Check inside Blinds
      if (key === 'blinds' && Array.isArray(collection)) {
        collection.forEach(blind => {
           if (blind.hides) blind.hides.forEach(moveItem)
        })
      }
      else if (Array.isArray(collection)) {
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

      // [UPDATED] Check Blinds for Copy
      if (key === 'blinds' && Array.isArray(collection)) {
         collection.forEach(blind => {
            if (blind.hides) {
               blind.hides.forEach(item => {
                  if (ids.includes(item.id)) itemsToCopy.push({ ...item, _type: 'hides' }) // Treat as normal hide on paste
               })
            }
         })
      }
      else if (Array.isArray(collection)) {
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

    state.selection.value = []; 

    clipboard.value.forEach((clipItem) => {
      const type = clipItem._type;
      // If copying from a blind, we simply paste it into the main hide list 
      // OR the current blind if logic supported it. For now, we paste to main mapData[type].
      // (Assuming 'hides' type is valid)
      if (!state.mapData.value[type]) return;

      const newItem = JSON.parse(JSON.stringify(clipItem));
      newItem.id = crypto.randomUUID();

      if (newItem.x !== undefined) newItem.x += 1;
      if (newItem.y !== undefined) newItem.y += 1;
      if (newItem.x1 !== undefined) {
        newItem.x1 += 1; newItem.x2 += 1; newItem.y1 += 1; newItem.y2 += 1;
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
    deleteSelection(); 
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
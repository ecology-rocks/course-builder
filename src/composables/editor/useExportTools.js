export function useExportTools(store, stageRef, scale, GRID_OFFSET) {

  function handleSaveMap() {
    if (!stageRef.value) return
    const stage = stageRef.value.getStage()

    const dataURL = stage.toDataURL({
      pixelRatio: 0.5,
      mimeType: 'image/jpeg',
      quality: 0.7
    })

    store.saveToCloud(false, dataURL)
  }

  function handleLibrarySave(name) {
    if (!stageRef.value) return
    if (store.selection.length === 0) {
      alert("Nothing selected! Select items to save first.")
      return
    }

    const stage = stageRef.value.getStage()
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let found = false

    const updateBounds = (x, y, w, h) => {
      found = true
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w)
      maxY = Math.max(maxY, y + h)
    }

    // Helper to calculate item dimensions based on rotation
    const getRotatedDims = (b) => {
      const isRotated = b.rotation % 180 !== 0
      // Simplified logic for brevity - matches original file
      let w = 3, h = 1.5 // Defaults
      if (b.orientation === 'tall') { w = isRotated ? 1 : 3; h = isRotated ? 3 : 1 }
      else if (b.orientation === 'pillar') { w = isRotated ? 1 : 1.5; h = isRotated ? 1.5 : 1 }
      else { w = isRotated ? 1.5 : 3; h = isRotated ? 3 : 1.5 }
      return { w, h }
    }

    // Calculate Bounds
    store.bales.forEach(b => {
      if (store.selection.includes(b.id)) {
        const d = getRotatedDims(b)
        updateBounds(b.x, b.y, d.w, d.h)
      }
    })
    store.boardEdges.forEach(b => {
      if (store.selection.includes(b.id)) {
        found = true
        minX = Math.min(minX, b.x1, b.x2); minY = Math.min(minY, b.y1, b.y2)
        maxX = Math.max(maxX, b.x1, b.x2); maxY = Math.max(maxY, b.y1, b.y2)
      }
    })
    store.dcMats.forEach(m => {
      if (store.selection.includes(m.id)) {
        const w = m.rotation % 180 !== 0 ? 3 : 2
        const h = m.rotation % 180 !== 0 ? 2 : 3
        updateBounds(m.x, m.y, w, h)
      }
    })

    if (!found || minX === Infinity) {
      alert("Could not calculate selection bounds.")
      return
    }

    const padding = 1
    const cropX = (minX - padding) * scale.value + GRID_OFFSET
    const cropY = (minY - padding) * scale.value + GRID_OFFSET
    const cropWidth = (maxX - minX + (padding * 2)) * scale.value
    const cropHeight = (maxY - minY + (padding * 2)) * scale.value

    const dataURL = stage.toDataURL({
      x: cropX, y: cropY, width: cropWidth, height: cropHeight,
      pixelRatio: 0.5, mimeType: 'image/jpeg', quality: 0.7
    })

    store.saveSelectionToLibrary(name, dataURL)
  }

  return { handleSaveMap, handleLibrarySave }
}
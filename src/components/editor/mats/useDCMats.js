import { useMapStore } from 'stores/mapStore'

export function useDCMats(state, snapshot) {
  
  function addDCMat(x, y) {
    snapshot()
    const store = useMapStore() // Access store for generic config if needed
    
    // Default to 4x3 if no config exists, or use current config as "Default Spawn Size"
    const defW = store.dcMatConfig ? store.dcMatConfig.width : 3
    const defH = store.dcMatConfig ? store.dcMatConfig.height : 4

    const newMat = {
      id: crypto.randomUUID(),
      x: x,
      y: y,
      width: defW,  // Now saved individually
      height: defH, // Now saved individually
      rotation: 0,
      layer: 1
    }
    
    state.dcMats.value.push(newMat)
    return newMat
  }

  function removeDCMat(id) {
    snapshot()
    state.dcMats.value = state.dcMats.value.filter(m => m.id !== id)
    // Clear from selection if selected
    if (state.selection.value.includes(id)) {
      state.selection.value = state.selection.value.filter(selId => selId !== id)
    }
  }

  function rotateDCMat(id) {
    snapshot()
    const mat = state.dcMats.value.find(m => m.id === id)
    if (mat) {
      mat.rotation = (mat.rotation + 45) % 360
    }
  }

  // New: Handle Resizing/Movement updates
  function updateDCMat(id, attrs) {
    // We don't snapshot here for every pixel drag (performance), 
    // usually snapshot is handled by the interaction start/end.
    const mat = state.dcMats.value.find(m => m.id === id)
    if (mat) {
      Object.assign(mat, attrs)
    }
  }

  return {
    addDCMat,
    removeDCMat,
    rotateDCMat,
    updateDCMat
  }
}
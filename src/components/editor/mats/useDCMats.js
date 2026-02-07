import { useMapStore } from 'stores/mapStore'
import { ref } from 'vue'

export function useDCMats(state, snapshot) {


  function addDCMat(x, y) {
    state.dcMats.value.push({
      id: crypto.randomUUID(),
      x,
      y,
      type: 'dcMat',
      width: state.dcMatConfig.value.width || 2,
      height: state.dcMatConfig.value.height || 3,
      rotation: 0,
      label: 'DC',
      // [NEW] Custom properties
      custom: {
        width: null,
        height: null,
        fillColor: null, // Background
        strokeColor: null, // Border
        textColor: null,
        textValue: null
      }
    })
    if (snapshot) snapshot()
  }

  function removeDCMat(id) {
    state.dcMats.value = state.dcMats.value.filter(m => m.id !== id)
    if (snapshot) snapshot()
  }

  function rotateDCMat(id) {
    snapshot()
    const mat = state.dcMats.value.find(m => m.id === id)
    if (mat) {
      mat.rotation = (mat.rotation + 45) % 360
    }
  }

  // New: Handle Resizing/Movement updates
  function updateDCMat(id, updates) {
    const mat = state.dcMats.value.find(m => m.id === id)
    if (mat) {
      Object.assign(mat, updates)
      if (snapshot) snapshot()
    }
  }

  return {
    addDCMat,
    removeDCMat,
    rotateDCMat,
    updateDCMat
  }
}
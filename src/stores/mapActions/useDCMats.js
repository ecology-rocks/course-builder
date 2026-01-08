export function useDCMats(state) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function addDCMat(x, y) {

    state.dcMats.value.push({ 
      id: crypto.randomUUID(), 
      x: snapToGrid(x), 
      y: snapToGrid(y), 
      rotation: 0 
    })
  }

  function removeDCMat(id) {

    state.dcMats.value = state.dcMats.value.filter(m => m.id !== id)
  }

  function rotateDCMat(id) {
    const mat = state.dcMats.value.find(m => m.id === id)
    if (mat) {

      mat.rotation = (mat.rotation + 15) % 360
    }
  }

  return { addDCMat, removeDCMat, rotateDCMat }
}
/**
 * src/stores/mapActions/scentWorkLogic.js
 * Logic for Scent Work objects.
 */
export function useScentWorkLogic(state, snapshot) {

  function addScentWorkObject(type, x, y) {
    snapshot()
    state.scentWorkObjects.value.push({ 
      id: crypto.randomUUID(), 
      type, 
      x: Math.round(x*2)/2, 
      y: Math.round(y*2)/2, 
      rotation: 0, 
      isHot: false 
    })
  }

  function removeScentWorkObject(id) { 
    snapshot()
    state.scentWorkObjects.value = state.scentWorkObjects.value.filter(o => o.id !== id) 
  }

  function rotateScentWorkObject(id) {
    const obj = state.scentWorkObjects.value.find(o => o.id === id)
    if (obj) { 
      snapshot()
      obj.rotation = (obj.rotation + 45) % 360 
    }
  }

  function toggleScentWorkHot(id) {
    const obj = state.scentWorkObjects.value.find(o => o.id === id)
    if (obj) { 
      snapshot()
      obj.isHot = !obj.isHot 
    }
  }

  return {
    addScentWorkObject,
    removeScentWorkObject,
    rotateScentWorkObject,
    toggleScentWorkHot
  }
}
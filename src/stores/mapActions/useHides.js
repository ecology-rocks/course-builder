// src/stores/mapActions/useHides.js

export function useHides(state, snapshot) {
  function addHide(x, y) {
    state.hides.value.push({
      id: crypto.randomUUID(),
      x, 
      y, 
      type: 'rat', // rat, litter, empty
      layer: state.currentLayer.value || 1,
      elevation: 'floor' // [NEW] floor, under, over
    })
  }

  function removeHide(id) {
    state.hides.value = state.hides.value.filter(h => h.id !== id)
  }

  function cycleHideType(id) {
    const hide = state.hides.value.find(h => h.id === id)
    if (hide) {
      if (hide.type === 'rat') hide.type = 'litter'
      else if (hide.type === 'litter') hide.type = 'empty'
      else hide.type = 'rat'
    }
  }

  // [NEW ACTION] Cycle Elevation: Floor -> Under -> Over
function cycleHideElevation(id) {
  const hide = state.hides.value.find(h => h.id === id)
  if (hide) {
    // Toggle between 'under' and 'regular_over'
    if (hide.elevation === 'under') {
      hide.elevation = 'regular_over'
    } else {
      hide.elevation = 'under'
    }
  }
}

  return { addHide, removeHide, cycleHideType, cycleHideElevation }
}
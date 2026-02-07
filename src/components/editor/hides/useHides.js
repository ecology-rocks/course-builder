// src/stores/mapActions/useHides.js

export function useHides(state, snapshot) {

function openHideMenu(id, x, y) {
    state.activeHideMenu.value = { id, x, y };
  }

  function closeHideMenu() {
    state.activeHideMenu.value = null;
  }

  function addHide(x, y) {
    state.hides.value.push({
      id: crypto.randomUUID(),
      x, 
      y, 
      type: 'rat', // rat, litter, empty
      number: null,
      layer: state.currentLayer.value || 1,
      elevation: 'regular_over', //  regular_over, under
      custom: {
        width: null,
        height: null,
        fillColor: null,
        strokeColor: null,
        borderStyle: null, // 'solid', 'dashed'
        textColor: '#000000'
      }
    })
  }

  function updateHide(id, updates) {
    const hide = state.hides.value.find(h => h.id === id)
    if (hide) {
      Object.assign(hide, updates)
      if (snapshot) snapshot() // Ensure history is captured
    }
  }

  function removeHide(id) {
    state.hides.value = state.hides.value.filter(h => h.id !== id)
    // Close menu if the deleted hide was active
    if (state.activeHideMenu.value?.id === id) {
      state.activeHideMenu.value = null;
    }
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

  return { addHide, removeHide, cycleHideType, cycleHideElevation, updateHide, openHideMenu, closeHideMenu }
}
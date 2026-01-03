export function useHides(state, snapshot) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function addHide(x, y) {
    snapshot()
    state.hides.value.push({ 
      id: crypto.randomUUID(), 
      x: snapToGrid(x), 
      y: snapToGrid(y), 
      type: 'rat' 
    })
  }

  function removeHide(id) {
    snapshot()
    state.hides.value = state.hides.value.filter(h => h.id !== id)
  }

  function cycleHideType(id) {
    const hide = state.hides.value.find(h => h.id === id)
    if (hide) {
      snapshot()
      hide.type = hide.type === 'rat' ? 'litter' : (hide.type === 'litter' ? 'empty' : 'rat')
    }
  }

  return { addHide, removeHide, cycleHideType }
}
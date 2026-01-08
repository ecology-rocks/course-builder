export function useHides(state) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function addHide(x, y) {
    state.hides.value.push({ 
      id: crypto.randomUUID(), 
      x: snapToGrid(x), 
      y: snapToGrid(y), 
      type: 'rat' 
    })
  }

  function removeHide(id) {
    state.hides.value = state.hides.value.filter(h => h.id !== id)
  }

  function cycleHideType(id) {
    const hide = state.hides.value.find(h => h.id === id)
    if (hide) {
      hide.type = hide.type === 'rat' ? 'litter' : (hide.type === 'litter' ? 'empty' : 'rat')
    }
  }

  return { addHide, removeHide, cycleHideType }
}
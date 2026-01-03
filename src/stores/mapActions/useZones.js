export function useZones(state, snapshot) {
  function addZone(x, y, type) {
    snapshot()
    state.zones.value.push({
      id: Date.now().toString(),
      x, 
      y, 
      width: 5, 
      height: 5, 
      type, 
      rotation: 0
    })
  }

  function updateZone(id, attrs) {
    const z = state.zones.value.find(i => i.id === id)
    if (z) {
      Object.assign(z, attrs)
    }
  }

  function removeZone(id) {
    snapshot()
    state.zones.value = state.zones.value.filter(z => z.id !== id)
  }

  return { addZone, updateZone, removeZone }
}
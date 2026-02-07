export function useZones(state) {
function addZone(x, y, type) {
    state.zones.value.push({
      id: crypto.randomUUID(), // Use UUID for consistency if available, else Date.now()
      x, 
      y, 
      width: 5, 
      height: 5, 
      type, 
      rotation: 0,
      // [NEW] Custom properties for customization
      custom: {
        width: null,
        height: null,
        fillColor: null,
        strokeColor: null,
        textColor: null,
        textValue: null
      }
    })
  }

  // [NEW] Added rotation logic
  function rotateZone(id) {
    const z = state.zones.value.find(i => i.id === id)
    if (z) {
      z.rotation = (z.rotation + 45) % 360
    }
  }

  function updateZone(id, attrs) {
    const z = state.zones.value.find(i => i.id === id)
    if (z) {
      Object.assign(z, attrs)
    }
  }

  function removeZone(id) {
    state.zones.value = state.zones.value.filter(z => z.id !== id)
  }

  return { addZone, updateZone, removeZone, rotateZone }
}
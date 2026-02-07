export function useStartBox(state) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function addStartBox(x, y) {
    state.startBox.value = { 
      id: crypto.randomUUID(), 
      x: snapToGrid(x), 
      y: snapToGrid(y),
      rotation: 0, // [NEW]
      // [NEW] Customization (No dimensions/text allowed)
      custom: {
        fillColor: null,
        strokeColor: null,
        textColor: null,
        borderStyle: 'solid'
      }
    }
  }

  function removeStartBox() {
    state.startBox.value = null
    // Close menu if it was open
    if (state.activeStartBoxMenu?.value) {
      state.activeStartBoxMenu.value = null
    }
  }

  // [NEW] Rotation Logic
  function rotateStartBox() {
    if (state.startBox.value) {
      const current = state.startBox.value.rotation || 0
      state.startBox.value.rotation = (current + 45) % 360
    }
  }

  return { addStartBox, removeStartBox, rotateStartBox }
}
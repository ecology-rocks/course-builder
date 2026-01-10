export function useStartBox(state) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function addStartBox(x, y) {
    // [FIX] Assign a random ID so selection/dragging logic works
    state.startBox.value = { 
      id: crypto.randomUUID(), 
      x: snapToGrid(x), 
      y: snapToGrid(y) 
    }
  }

  function removeStartBox() {
    state.startBox.value = null
  }

  return { addStartBox, removeStartBox }
}
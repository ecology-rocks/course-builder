export function useStartBox(state, snapshot) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function addStartBox(x, y) {
    snapshot()
    state.startBox.value = { x: snapToGrid(x), y: snapToGrid(y) }
  }

  function removeStartBox() {
    snapshot()
    state.startBox.value = null
  }

  return { addStartBox, removeStartBox }
}
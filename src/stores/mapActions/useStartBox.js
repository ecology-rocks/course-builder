export function useStartBox(state) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function addStartBox(x, y) {
    state.startBox.value = { x: snapToGrid(x), y: snapToGrid(y) }
  }

  function removeStartBox() {
    state.startBox.value = null
  }

  return { addStartBox, removeStartBox }
}
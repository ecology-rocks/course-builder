// src/stores/mapActions/useTunnelBoards.js
export function useTunnelBoards(state, snapshot) {
function addTunnelBoard(x, y) {
    // Standard size for a tunnel board (approx 2ft x 4 inches? or 4ft x 1ft?)
    // Adjust default width/height as per your existing logic
    state.tunnelBoards.value.push({
      id: crypto.randomUUID(),
      x, 
      y, 
      width: 4,
      height: 2, 
      rotation: 0,
      // [NEW] Custom Properties
      custom: {
        width: null,
        height: null,
        fillColor: null,
        strokeColor: null,
        textColor: null,
        // No textValue by default for boards, but we can add it if needed
      }
    })
    if (snapshot) snapshot()
  }

  // [NEW] Rotate Logic
  function rotateTunnelBoard(id) {
    const b = state.tunnelBoards.value.find(i => i.id === id)
    if (b) {
      b.rotation = (b.rotation || 0) + 45
      if (snapshot) snapshot()
    }
  }

  function updateTunnelBoard(id, attrs) {
    const t = state.tunnelBoards.value.find(i => i.id === id)
    if (t) {
      Object.assign(t, attrs)
    }
  }

  function removeTunnelBoard(id) {
    state.tunnelBoards.value = state.tunnelBoards.value.filter(t => t.id !== id)
  }

  return { addTunnelBoard, updateTunnelBoard, removeTunnelBoard, rotateTunnelBoard }
}
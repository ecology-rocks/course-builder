// src/stores/mapActions/useTunnelBoards.js
export function useTunnelBoards(state) {
  function addTunnelBoard(x, y) {
    state.tunnelBoards.value.push({
      id: crypto.randomUUID(),
      x, 
      y, 
      width: 4,  // Default width 4ft
      height: 2, // Default height 2ft
      rotation: 0,
      opacity: 0.5
    })
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

  return { addTunnelBoard, updateTunnelBoard, removeTunnelBoard }
}
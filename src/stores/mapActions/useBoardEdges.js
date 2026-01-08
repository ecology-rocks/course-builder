export function useBoardEdges(state) {
  function snapToGrid(val) {
    return Math.round(val * 6) / 6
  }

  function startDrawingBoard(x, y) {

    const id = crypto.randomUUID()
    const snappedX = snapToGrid(x)
    const snappedY = snapToGrid(y)
    state.boardEdges.value.push({ 
      id, x1: snappedX, y1: snappedY, x2: snappedX, y2: snappedY 
    })
    state.isDrawingBoard.value = id
  }

  function updateDrawingBoard(x, y) {
    if (!state.isDrawingBoard.value) return
    const board = state.boardEdges.value.find(b => b.id === state.isDrawingBoard.value)
    if (board) {
      board.x2 = snapToGrid(x)
      board.y2 = snapToGrid(y)
    }
  }

  function stopDrawingBoard() {
    if (!state.isDrawingBoard.value) return
    const board = state.boardEdges.value.find(b => b.id === state.isDrawingBoard.value)
    if (board && board.x1 === board.x2 && board.y1 === board.y2) {
      // Filter out zero-length boards
      state.boardEdges.value = state.boardEdges.value.filter(b => b.id !== state.isDrawingBoard.value)
    }
    state.isDrawingBoard.value = null
  }

  function removeBoardEdge(id) {
    state.boardEdges.value = state.boardEdges.value.filter(b => b.id !== id)
  }

  function updateBoardEndpoint(id, p, x, y) {
    const b = state.boardEdges.value.find(b => b.id === id)
    if (b) {
      if (p === 'start') {
        b.x1 = snapToGrid(x); b.y1 = snapToGrid(y)
      } else {
        b.x2 = snapToGrid(x); b.y2 = snapToGrid(y)
      }
    }
  }

  function rotateBoard(id) {
    const board = state.boardEdges.value.find(b => b.id === id)
    if (board) {
      const mx = (board.x1 + board.x2) / 2
      const my = (board.y1 + board.y2) / 2
      const rad = (45 * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      
      const dx1 = board.x1 - mx; const dy1 = board.y1 - my
      const rx1 = (dx1 * cos - dy1 * sin) + mx
      const ry1 = (dx1 * sin + dy1 * cos) + my
      
      const dx2 = board.x2 - mx; const dy2 = board.y2 - my
      const rx2 = (dx2 * cos - dy2 * sin) + mx
      const ry2 = (dx2 * sin + dy2 * cos) + my
      
      board.x1 = snapToGrid(rx1); board.y1 = snapToGrid(ry1)
      board.x2 = snapToGrid(rx2); board.y2 = snapToGrid(ry2)
    }
  }

  return {
    startDrawingBoard,
    updateDrawingBoard,
    stopDrawingBoard,
    removeBoardEdge,
    updateBoardEndpoint,
    rotateBoard
  }
}
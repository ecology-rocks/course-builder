export function useGridSystem(store, scale) {
  
  function getWallStroke(type) {
    return type === 'wall' ? 8 : 1
  }

  function getGridLabelX(index) {
    const w = store.ringDimensions.width
    const c = store.gridStartCorner
    if (c === 'top-right' || c === 'bottom-right') return (w - index).toString()
    return index.toString()
  }

  function getGridLabelY(index) {
    const h = store.ringDimensions.height
    const c = store.gridStartCorner
    if (c === 'bottom-left' || c === 'bottom-right') return (h - index).toString()
    return index.toString()
  }

  function getXAxisY() {
    return store.gridStartCorner.includes('bottom')
      ? (store.ringDimensions.height * scale.value) + 15
      : -25
  }

  function getYAxisX() {
    return store.gridStartCorner.includes('right')
      ? (store.ringDimensions.width * scale.value) + 12
      : -32
  }

  function getYAxisAlign() {
    return store.gridStartCorner.includes('right') ? 'left' : 'right'
  }

  return {
    getWallStroke,
    getGridLabelX,
    getGridLabelY,
    getXAxisY,
    getYAxisX,
    getYAxisAlign
  }
}
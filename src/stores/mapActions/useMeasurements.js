import { ref } from 'vue'

export function useMeasurements(state, snapshot) {
  
  function addMeasurementPoint(x, y) {
    if (!state.activeMeasurement.value) {
      state.activeMeasurement.value = {
        id: crypto.randomUUID(),
        points: [{ x, y }],
        layer: state.currentLayer.value
      }
    } else {
      state.activeMeasurement.value.points.push({ x, y })
    }
  }

  function finishMeasurement() {
    if (state.activeMeasurement.value) {
      if (state.activeMeasurement.value.points.length >= 2) {
        snapshot()
        state.measurements.value.push(JSON.parse(JSON.stringify(state.activeMeasurement.value)))
      }
      state.activeMeasurement.value = null
    }
  }

  function removeMeasurement(id) {
    snapshot()
    state.measurements.value = state.measurements.value.filter(m => m.id !== id)
  }

  // [NEW] Update a specific point (for dragging nodes)
  function updateMeasurementPoint(id, index, x, y) {
    const m = state.measurements.value.find(item => item.id === id)
    if (m && m.points[index]) {
      // We don't snapshot on every pixel move (handled by dragstart)
      m.points[index].x = x
      m.points[index].y = y
    }
  }

  return {
    addMeasurementPoint,
    finishMeasurement,
    removeMeasurement,
    updateMeasurementPoint // Exported
  }
}
import { ref } from 'vue'

export function useMeasurements(state, snapshot) {
  
  function addMeasurementPoint(x, y) {
    if (!state.activeMeasurement.value) {
      // 1. Start New Measurement
      state.activeMeasurement.value = {
        id: crypto.randomUUID(),
        points: [{ x, y }],
        layer: state.currentLayer.value
      }
    } else {
      // 2. Add to Existing
      const points = state.activeMeasurement.value.points
      const lastPt = points[points.length - 1]

      // [FIX] Check for "Click to Finish"
      // Since inputs are already snapped, we can check exact equality.
      // If the user clicks the last point again, finish the line.
      if (lastPt && lastPt.x === x && lastPt.y === y) {
        finishMeasurement()
        return
      }

      state.activeMeasurement.value.points.push({ x, y })
    }
  }

  function finishMeasurement() {
    if (state.activeMeasurement.value) {
      // Only save if we have at least 2 points (a line)
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
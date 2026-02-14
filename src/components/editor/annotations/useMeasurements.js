import { ref } from "vue";

export function useMeasurements(state, snapshot, deps) {
  function addMeasurementPoint(x, y) {
    // [DEBUG] check what we are receiving
    console.log(
      "Adding Point at:",
      x,
      y,
      "Existing:",
      !!state.activeMeasurement.value,
    );

    if (!state.activeMeasurement.value) {
      state.activeMeasurement.value = {
        id: crypto.randomUUID(),
        points: [{ x, y }],
        layer: state.currentLayer.value,
        isPath: state.activeTool.value === "measurePath",
      };
    } else {
      // [FIX] Use a temporary array to ensure Vue detects the change
      const newPoints = [...state.activeMeasurement.value.points, { x, y }];
      state.activeMeasurement.value.points = newPoints;

      // Check for "Line" tool auto-finish
      if (!state.activeMeasurement.value.isPath && newPoints.length === 2) {
        finishMeasurement();
        state.activeTool.value = "select";
      }
    }
  }

  function finishMeasurement() {
    if (state.activeMeasurement.value) {
      // Only save if we have at least 2 points (a line)
      if (state.activeMeasurement.value.points.length >= 2) {
        // [FIX] Use array spread to ensure reactivity triggers properly
        const current = state.measurements.value || [];
        const newMeasurement = JSON.parse(
          JSON.stringify(state.activeMeasurement.value),
        );
        state.measurements.value = [...current, newMeasurement];

        // [NEW] Use the centralized notification helper
        if (deps && deps.show) {
          deps.show("Measurement Saved", "success")
        }
      
      }

      // [NEW] Reset to Select Tool
      // This prevents the user from accidentally starting a new measurement immediately
      state.activeTool.value = "select";

      state.activeMeasurement.value = null;
    }
  }

  function removeMeasurement(id) {
    state.measurements.value = state.measurements.value.filter(
      (m) => m.id !== id,
    );
  }

  // [NEW] Update a specific point (for dragging nodes)
  function updateMeasurementPoint(id, index, x, y) {
    const m = state.measurements.value.find((item) => item.id === id);
    if (m && m.points[index]) {
      // We don't snapshot on every pixel move (handled by dragstart)
      m.points[index].x = x;
      m.points[index].y = y;
    }
  }

  return {
    addMeasurementPoint,
    finishMeasurement,
    removeMeasurement,
    updateMeasurementPoint, // Exported
  };
}

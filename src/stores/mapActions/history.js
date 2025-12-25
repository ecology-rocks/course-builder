import { ref } from 'vue'

/**
 * src/stores/mapActions/history.js
 * Manages Undo/Redo functionality for the map state.
 * @param {Object} state - The full state object containing all refs to be saved.
 * @param {Function} validateFn - A function to re-validate items after restore (e.g., validateAllBales).
 */
export function useHistory(state, validateFn) {
  const history = ref([])
  const future = ref([])

  function snapshot() {
    future.value = []
    
    // We strictly define what constitutes a "Save State"
    const snapshotData = JSON.stringify({
      bales: state.bales.value,
      agilityObstacles: state.agilityObstacles.value,
      scentWorkObjects: state.scentWorkObjects.value,
      hides: state.hides.value,
      boardEdges: state.boardEdges.value,
      dcMats: state.dcMats.value,
      startBox: state.startBox.value,
      ringDimensions: state.ringDimensions.value,
      masterBlinds: state.masterBlinds.value
    })
    
    history.value.push(snapshotData)
    if (history.value.length > 50) history.value.shift()
  }

  function restoreState(jsonString) {
    const data = JSON.parse(jsonString)
    
    state.bales.value = data.bales || []
    state.agilityObstacles.value = data.agilityObstacles || []
    state.scentWorkObjects.value = data.scentWorkObjects || []
    state.hides.value = data.hides || []
    state.boardEdges.value = data.boardEdges || []
    state.dcMats.value = data.dcMats || []
    state.startBox.value = data.startBox || null
    state.ringDimensions.value = data.ringDimensions || state.ringDimensions.value
    state.masterBlinds.value = data.masterBlinds || []
    
    // Run validation to ensure supports are calculated correctly after undo
    if (validateFn) validateFn()
  }

  function undo() {
    if (history.value.length === 0) return

    // Save current state to Future before going back
    const current = JSON.stringify({
      bales: state.bales.value,
      agilityObstacles: state.agilityObstacles.value,
      scentWorkObjects: state.scentWorkObjects.value,
      hides: state.hides.value,
      boardEdges: state.boardEdges.value,
      dcMats: state.dcMats.value,
      startBox: state.startBox.value,
      ringDimensions: state.ringDimensions.value,
      masterBlinds: state.masterBlinds.value
    })
    future.value.push(current)

    const previous = history.value.pop()
    restoreState(previous)
  }

  function redo() {
    if (future.value.length === 0) return

    // Save current state to History before going forward
    const current = JSON.stringify({
      bales: state.bales.value,
      agilityObstacles: state.agilityObstacles.value,
      scentWorkObjects: state.scentWorkObjects.value,
      hides: state.hides.value,
      boardEdges: state.boardEdges.value,
      dcMats: state.dcMats.value,
      startBox: state.startBox.value,
      ringDimensions: state.ringDimensions.value,
      masterBlinds: state.masterBlinds.value
    })
    history.value.push(current)

    const nextState = future.value.pop()
    restoreState(nextState)
  }

  return {
    history,
    future,
    snapshot,
    undo,
    redo
  }
}
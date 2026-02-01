import { ref, watch, nextTick } from 'vue'

export function useHistory(state, changeCallback) {
  const historyStack = ref([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 50
  const isUndoing = ref(false)
  const isRedoing = ref(false) // [NEW]
  const measurementRedoStack = ref([])

  watch(
    () => state.activeMeasurement?.value?.points?.length,
    () => {
      // If length changed, and we aren't Undoing or Redoing, it's a manual click.
      if (!isUndoing.value && !isRedoing.value) {
        measurementRedoStack.value = []
      }
    }
  )

  // Create a Snapshot of the current unified mapData
  function snapshot() {
    if (isUndoing.value || isRedoing.value) return

    // Remove any "future" history if we are in the middle of the stack
    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
    }

    // We only need to clone ONE object now!
    // This automatically captures bales, hides, startBox, metadata, etc.
    const data = JSON.parse(JSON.stringify(state.mapData.value))
    
    historyStack.value.push(data)
    if (historyStack.value.length > MAX_HISTORY) {
      historyStack.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function undo() {
    // 1. SMART UNDO (Active Measurement)
    if (state.activeMeasurement && state.activeMeasurement.value) {
      const pts = state.activeMeasurement.value.points
      if (pts.length > 0) {
        isUndoing.value = true 
        
        const p = pts.pop()
        measurementRedoStack.value.push(p)
        
        if (pts.length === 0) {
          state.activeMeasurement.value = null
          measurementRedoStack.value = []
        }
        
        // [FIX] Wait for watcher to fire before resetting flag
        nextTick(() => {
          isUndoing.value = false
        })
        return 
      }
    }

    // 2. STANDARD UNDO
    if (historyIndex.value > 0) {
      isUndoing.value = true
      historyIndex.value--
      const data = historyStack.value[historyIndex.value]
      
      state.mapData.value = JSON.parse(JSON.stringify(data))
      
      nextTick(() => {
        isUndoing.value = false
        if (changeCallback) changeCallback()
      })
    }
  }

  function redo() {
    // 1. SMART REDO (Active Measurement)
    if (state.activeMeasurement && state.activeMeasurement.value && measurementRedoStack.value.length > 0) {
      isRedoing.value = true
      
      const p = measurementRedoStack.value.pop()
      state.activeMeasurement.value.points.push(p)
      
      // [FIX] Wait for watcher to fire before resetting flag
      nextTick(() => {
        isRedoing.value = false
      })
      return 
    }

    // 2. STANDARD REDO
    if (historyIndex.value < historyStack.value.length - 1) {
      isRedoing.value = true
      historyIndex.value++
      const data = historyStack.value[historyIndex.value]
      
      state.mapData.value = JSON.parse(JSON.stringify(data))
      
      nextTick(() => {
        isRedoing.value = false
        if (changeCallback) changeCallback()
      })
    }
  }

  // WATCHER: The Magic Fix
  // We deep watch the single mapData object. 
  // Any change to ANY property inside it triggers a snapshot.
  watch(
    () => state.mapData.value, 
    () => {
      if (!isUndoing.value) snapshot()
    },
    { deep: true } 
  )

  // Initial snapshot
  snapshot()

  return {
    undo,
    redo,
    snapshot,
    historyIndex,
    historyStack
  }
}
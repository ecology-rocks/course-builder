import { ref, watch, nextTick } from 'vue'

export function useHistory(state, changeCallback) {
  const historyStack = ref([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 50
  const isUndoing = ref(false)

  // Create a Snapshot of the current unified mapData
  function snapshot() {
    if (isUndoing.value) return

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
    if (historyIndex.value > 0) {
      isUndoing.value = true
      historyIndex.value--
      const data = historyStack.value[historyIndex.value]
      
      // Restore the Unified State
      state.mapData.value = JSON.parse(JSON.stringify(data))
      
      // Force UI refresh if needed
      nextTick(() => {
        isUndoing.value = false
        if (changeCallback) changeCallback()
      })
    }
  }

  function redo() {
    if (historyIndex.value < historyStack.value.length - 1) {
      isUndoing.value = true
      historyIndex.value++
      const data = historyStack.value[historyIndex.value]
      
      state.mapData.value = JSON.parse(JSON.stringify(data))
      
      nextTick(() => {
        isUndoing.value = false
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
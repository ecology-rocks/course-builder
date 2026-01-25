import { onMounted, onUnmounted } from 'vue'

// [UPGRADE] Accept 'onSave' callback as the second argument
export function useKeyboardShortcuts(store, onSave) {
  function handleKeydown(e) {
    if (!e.key) return

    // --- 1. IGNORE INPUTS ---
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return
    }

    const isCtrl = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()

    // Undo: Ctrl+Z
    if (isCtrl && !e.shiftKey && key === 'z') {
      e.preventDefault()
      store.undo()
      return
    }

    // Copy: Ctrl+C
    if (isCtrl && key === 'c') {
      e.preventDefault()
      store.copySelection()
      return
    }

    // Cut: Ctrl+X
    if (isCtrl && key === 'x') {
      e.preventDefault()
      store.cutSelection()
      return
    }                           

    // Paste: Ctrl+V
    if (isCtrl && key === 'v') {
      e.preventDefault()
      store.pasteSelection()
      return
    }

    // Redo: Ctrl+Y OR Ctrl+Shift+Z
    if (isCtrl && (key === 'y' || (e.shiftKey && key === 'z'))) {
      e.preventDefault()
      store.redo()
      return
    }

    // Save: Ctrl+S
    if (isCtrl && key === 's') {
      e.preventDefault()
      // [UPGRADE] Call the secure handler passed in, not the store directly
      if (onSave) onSave() 
      return
    }

    // Delete
    if (key === 'delete' || key === 'backspace') {
      if (store.selection.length > 0) {
        store.deleteSelection()
      }
    }

    // Rotate: R
    if (key === 'r') {
      if (store.selection.length > 0) {
        e.preventDefault()
        const angle = e.shiftKey ? 45 : 15
        store.rotateSelection(angle)
      }
      return
    }

    // Nudge: Arrow Keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (store.selection.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 1 : (1 / 6)
        let dx = 0, dy = 0

        if (key === 'arrowleft') dx = -step
        if (key === 'arrowright') dx = step
        if (key === 'arrowup') dy = -step
        if (key === 'arrowdown') dy = step

        store.moveSelection(dx, dy)
      }
      return
    }

    // Cycle Elevation: U
    if (key === 'u') {
      if (store.selection.length > 0) {
        e.preventDefault()
        store.selection.forEach(id => {
          if (store.hides.find(h => h.id === id)) {
            store.cycleHideElevation(id)
          }
        })
      }
      return
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
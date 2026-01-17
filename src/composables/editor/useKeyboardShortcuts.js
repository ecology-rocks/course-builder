import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts(store) {
  function handleKeydown(e) {
    if (!e.key) return

    // --- 1. IGNORE INPUTS ---
    // If the user is typing in a form field (Map Title, etc.), 
    // let the browser handle the event (native copy/paste/undo).
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
      if (store.saveMap) store.saveMap()
      return
    }

    // Delete
if (key === 'delete' || key === 'backspace') {
      if (store.selection.length > 0) {
        store.deleteSelection()
      }
    }

if (key === 'r') {
      if (store.selection.length > 0) {
        e.preventDefault()
        // Shift+R = 45 deg, R = 15 deg (Matches Right-Click behavior)
        const angle = e.shiftKey ? 45 : 15
        store.rotateSelection(angle)
      }
      return
    }


    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (store.selection.length > 0) {
        e.preventDefault()
        
        // Step size: Shift = 1 ft, Default = 2 inches (1/6 ft)
        const step = e.shiftKey ? 1 : (1 / 6)
        
        let dx = 0
        let dy = 0

        if (key === 'arrowleft') dx = -step
        if (key === 'arrowright') dx = step
        if (key === 'arrowup') dy = -step
        if (key === 'arrowdown') dy = step

        store.moveSelection(dx, dy)
      }
      return
    }


    if (key === 'u') {
      if (store.selection.length > 0) {
        e.preventDefault()
        // Apply to all selected items (if they are hides)
        store.selection.forEach(id => {
          // Check if it's a hide by seeing if it exists in the hides array
          if (store.hides.find(h => h.id === id)) {
            store.cycleHideElevation(id)
          }
        })
      }
      return
    }




  }

  // Arrow Keys: Nudge Selection


  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
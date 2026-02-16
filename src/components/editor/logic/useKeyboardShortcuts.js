import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts(store, onSave) {
  function handleKeydown(e) {
    
    // --- 1. IGNORE INPUTS ---
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return
    }

    if (!e.key) return

    const isCtrl = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()

    // --- GLOBAL ACTIONS ---

    // Select All: Ctrl+A
    if (isCtrl && key === 'a') {
      e.preventDefault()
      store.selectAll()
      return
    }

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
      if (onSave) onSave() 
      return
    }

    // Delete
    if (key === 'delete' || key === 'backspace') {
      if (store.selection.length > 0) {
        store.deleteSelection()
      }
      return
    }

    // --- MANIPULATION ---

    // Rotate: R (15deg), Shift+R (45deg)
    if (key === 'r') {
      if (store.selection.length > 0) {
        e.preventDefault()
        const angle = e.shiftKey ? 45 : 15
        store.rotateSelection(angle)
      }
      return
    }

    // Cycle Orientation: O
    if (key === 'o') {
      if (store.selection.length > 0) {
        e.preventDefault()
        // Cycle: Flat -> Tall -> Pillar -> Flat
        const orientations = ['flat', 'tall', 'pillar']
        store.bales.forEach(b => {
          if (store.selection.includes(b.id)) {
            b.lean = null
            if(b.isAnchor == true) return
            const currentIdx = orientations.indexOf(b.orientation || 'flat')
            const nextIdx = (currentIdx + 1) % orientations.length
            b.orientation = orientations[nextIdx]
          }
        })
      }
      return
    }

    // Cycle Lean: L
    if (key === 'l') {
      if (store.selection.length > 0) {
        e.preventDefault()
        // Cycle
        const leans = [null, 'right', 'left']
        store.bales.forEach(b => {
          if (store.selection.includes(b.id)) {
            b.orientation = 'flat'
            const currentIdx = leans.indexOf(b.lean || null)
            const nextIdx = (currentIdx + 1) % leans.length
            b.lean = leans[nextIdx]
          }
        })
      }
      return
    }

    // Cycle Hide Elevation: U
    if (key === 'u') {
      if (store.selection.length > 0) {
        e.preventDefault()
        store.selection.forEach(id => {
          // Check if it's a hide
          if (store.hides.find(h => h.id === id)) {
             // Assuming this action exists in store/barnHuntLogic
             store.cycleHideElevation(id)
          }
        })
      }
      return
    }

    // Cycle Hide Type: Y
    if (key === 'y') {
      if (store.selection.length > 0) {
        e.preventDefault()
        store.selection.forEach(id => {
          // Check if it's a hide
          if (store.hides.find(h => h.id === id)) {
             // Assuming this action exists in store/barnHuntLogic
             store.cycleHideType(id)
          }
        })
      }
      return
    }

    // Nudge: Arrow Keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (store.selection.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 1 : (1 / 6) // 1 ft or 2 inches
        let dx = 0, dy = 0

        if (key === 'arrowleft') dx = -step
        if (key === 'arrowright') dx = step
        if (key === 'arrowup') dy = -step
        if (key === 'arrowdown') dy = step

        store.moveSelection(dx, dy)
      }
      return
    }

    // --- TOOL SELECTION ---
    // Only fire if we aren't holding Ctrl (avoids conflicts)
    if (!isCtrl) {
      const toolMap = {
        'b': 'bale',
        'h': 'hide',
        'g': 'gate',
        'd': 'dcmat', 
        's': 'startbox',
        't': 'step',
        'q': 'board', 
        'w': 'tunnelboard',   
        'z': 'dead',
        'x': 'obstruction',
        'm': 'measure',
        'n': 'note',
        'v': 'select', 
        'e': 'transform' 
      }

      if (toolMap[key]) {
        e.preventDefault()
        store.setTool(toolMap[key])
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
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

    // Delete
if (key === 'delete' || key === 'backspace') {
      if (store.selection.length > 0) {
        store.deleteSelection()
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
import { ref } from 'vue'

export function useContextMenu(store) {
  const contextMenu = ref({ visible: false, x: 0, y: 0 })

  function handleStageContextMenu(e) {
    e.evt.preventDefault()

    // Priority 1: Finish Measurement
    if (store.activeTool === 'measure' && store.activeMeasurement) {
      store.finishMeasurement()
      return
    }

    store.closeAllMenus()

    // Priority 2: Only show on background (Stage) clicks
    if (e.target !== e.target.getStage()) return

    // Show Menu
    contextMenu.value = {
      visible: true,
      x: e.evt.clientX,
      y: e.evt.clientY
    }
  }

  function closeContextMenu() {
    if (contextMenu.value.visible) contextMenu.value.visible = false
  }

  return {
    contextMenu,
    handleStageContextMenu,
    closeContextMenu
  }
}
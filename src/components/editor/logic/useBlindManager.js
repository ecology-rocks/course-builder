// src/components/editor/logic/useBlindManager.js

import { ref, computed } from 'vue'

export function useBlindManager(store) {
  const activeBlindIndex = ref(0)
  const activeTool = ref('select') 

  // Ensure blinds array exists
  if (!store.mapData.blinds) {
    store.mapData.blinds = []
  }

  const activeBlind = computed(() => store.mapData.blinds[activeBlindIndex.value])
  const currentDisplayHides = computed(() => activeBlind.value ? activeBlind.value.hides : [])

  function handleCanvasClick(e, gridOffset, scale) {
    if (!activeBlind.value) return

    // [SAFETY] If clicking an object, let the object handle the click (selection)
    if (e.target !== e.target.getStage()) return

    // [SELECT TOOL] Clicking background clears selection
    if (activeTool.value === 'select') {
      store.clearSelection()
      return
    }

    const stage = e.target.getStage()
    const ptr = stage.getPointerPosition()
    const x = (ptr.x - gridOffset) / scale
    const y = (ptr.y - gridOffset) / scale

    if (activeTool.value === 'eraser') {
      const idx = activeBlind.value.hides.findIndex(h => 
        Math.abs(h.x - x) < 0.5 && Math.abs(h.y - y) < 0.5
      )
      if (idx > -1) activeBlind.value.hides.splice(idx, 1)
    } else {
      // [AUTO-NUMBERING LOGIC]
      let nextNumber = null
      if (activeTool.value === 'rat') {
        // Find the highest number currently used in this blind
        const max = activeBlind.value.hides
          .filter(h => h.type === 'rat' && typeof h.number === 'number')
          .reduce((m, h) => Math.max(m, h.number), 0)
        
        nextNumber = max + 1
      }

      activeBlind.value.hides.push({
        id: Date.now(),
        x, y, 
        type: activeTool.value,
        location: 'floor',
        number: nextNumber // Assign the number
      })
    }
  }

  function copyFromPrevious() {
    if (activeBlindIndex.value === 0) return
    const prev = store.mapData.blinds[activeBlindIndex.value - 1]
    activeBlind.value.hides = JSON.parse(JSON.stringify(prev.hides))
    activeBlind.value.hides.forEach(h => h.id = Date.now() + Math.random())
  }

  return {
    activeBlindIndex,
    activeTool,
    activeBlind,
    currentDisplayHides,
    handleCanvasClick,
    copyFromPrevious
  }
}
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
    const pos = stage.getRelativePointerPosition()

    // Calculate world coordinates using relative position (handles pan automatically)
    const x = (pos.x - gridOffset) / scale
    const y = (pos.y - gridOffset) / scale

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
        id: String(Date.now()), // [FIX] Convert to String to satisfy Konva strict requirements
        x, y, 
        type: activeTool.value,
        location: 'floor',
        number: nextNumber 
      })
    }
  }

  function copyFromPrevious() {
    if (activeBlindIndex.value === 0) return
    const prev = store.mapData.blinds[activeBlindIndex.value - 1]
    activeBlind.value.hides = JSON.parse(JSON.stringify(prev.hides))
    // [FIX] Ensure new IDs are strings
    activeBlind.value.hides.forEach(h => h.id = String(Date.now() + Math.random()))
  }

  // Add a new blind to the list
  function addNewBlind() {
    const nextNum = store.mapData.blinds.length + 1
    const randoms = Array(5).fill(0).map(() => Math.floor(Math.random() * 5) + 1)

    store.mapData.blinds.push({
      id: Date.now(), // Vue internal ID (Number is fine here, but usually safer as string too)
      name: `Blind ${nextNum}`,
      hides: [],
      randoms: randoms 
    })
    // Automatically switch to the new blind
    activeBlindIndex.value = store.mapData.blinds.length - 1
  }

  // Remove a blind by index
  function removeBlind(index) {
    if (store.mapData.blinds.length <= 1) {
      alert("You cannot delete the last blind.")
      return
    }

    if (!confirm("Are you sure you want to delete this blind? This cannot be undone.")) return

    store.mapData.blinds.splice(index, 1)

    store.mapData.blinds.forEach((blind, i) => {
      if (/^Blind \d+$/.test(blind.name)) {
        blind.name = `Blind ${i + 1}`
      }
    })

    if (index === activeBlindIndex.value) {
      activeBlindIndex.value = Math.max(0, index - 1)
    } else if (index < activeBlindIndex.value) {
      activeBlindIndex.value--
    }
  }

  return {
    activeBlindIndex,
    activeTool,
    activeBlind,
    currentDisplayHides,
    handleCanvasClick,
    copyFromPrevious,
    addNewBlind,
    removeBlind
  }
}
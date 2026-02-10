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

  // Add a new blind to the list
  function addNewBlind() {
    const nextNum = store.mapData.blinds.length + 1
    
    // Generate 5 random numbers (1-5) for Master blinds
    const randoms = Array(5).fill(0).map(() => Math.floor(Math.random() * 5) + 1)

    store.mapData.blinds.push({
      id: Date.now(),
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

    // Remove the blind
    store.mapData.blinds.splice(index, 1)

    // [NEW] Renumber remaining blinds if they follow the "Blind #" pattern
    store.mapData.blinds.forEach((blind, i) => {
      // This regex checks if the name is exactly "Blind " followed by digits
      if (/^Blind \d+$/.test(blind.name)) {
        blind.name = `Blind ${i + 1}`
      }
    })

    // Adjust active index if necessary
    if (index === activeBlindIndex.value) {
      // If we deleted the active one, select the previous one (or first)
      activeBlindIndex.value = Math.max(0, index - 1)
    } else if (index < activeBlindIndex.value) {
      // If we deleted one above the active one, shift index down
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
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMapStore = defineStore('map', () => {
  // CONFIGURATION
  // Standard course size is 24'x24' [cite: 107]
  const ringDimensions = ref({ width: 24, height: 24 }) 
  const gridSize = ref(20) // pixels per foot for rendering
  const previousClassCount = ref(0) // User inputs this (e.g. "Open had 40 bales")
  
  // BALE CONFIG
  // Standard 2-stringer bales. 
  // Represented in feet: Approx 3' long x 1.5' wide (18")
  const baleSize = { width: 3, height: 1.5 } 

  // STATE
  // Bales: { id, x, y, rotation (0 or 90), layer (1, 2, 3) }
  const bales = ref([])
  const currentLayer = ref(1)
  const selectedBaleId = ref(null)


  // GETTERS
  const inventory = computed(() => {
    const total = bales.value.length
    const base = bales.value.filter(b => b.layer === 1).length
    
    // Calculate Delta for Nesting rules 
    const delta = total - previousClassCount.value
    const deltaString = delta > 0 ? `+${delta}` : `${delta}`

    return {
      total,
      base,
      layer2: bales.value.filter(b => b.layer === 2).length,
      layer3: bales.value.filter(b => b.layer === 3).length,
      deltaString,
      isNestingValid: total > 0 // Simple check for now
    }
  })

function cycleLean(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      // 1. Guard Clause: Only Flat bales can be leaners
      if (bale.orientation !== 'flat') return 

      // 2. Cycle Logic: Null -> Right -> Left -> Null
      // We only use Right/Left because those are parallel to the longest side (width=3)
      if (bale.lean === null) {
        bale.lean = 'right'
      } else if (bale.lean === 'right') {
        bale.lean = 'left'
      } else {
        bale.lean = null
      }
    }
  }

  // ACTIONS
function addBale(x, y) {
    // Snap to 0.5 grid (6 inches)
    const snappedX = Math.round(x * 2) / 2
    const snappedY = Math.round(y * 2) / 2

const newBale = {
      id: crypto.randomUUID(),
      x: snappedX,
      y: snappedY,
      rotation: 0,
      layer: currentLayer.value,
      orientation: 'flat',
      lean: null,
      supported: true // <--- New Property
    }

    // 1. Check Boundary/Collision
    if (!isValidPlacement(newBale)) {
      alert("Cannot place here: Obstruction or Out of Bounds")
      return
    }

    bales.value.push(newBale)
    validateAllBales()
  }

function updateBalePosition(id, newX, newY) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      // Snap to 0.5 grid (6 inches)
      bale.x = Math.round(newX * 2) / 2
      bale.y = Math.round(newY * 2) / 2
    }
    validateAllBales()
  }


  function removeBale(id) {
    bales.value = bales.value.filter(b => b.id !== id)
    selectedBaleId.value = null
    validateAllBales()
  }

function cycleOrientation(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      if (bale.orientation === 'flat') {
        bale.orientation = 'tall'
        bale.lean = null // <--- RESET LEAN (Tall bales can't lean)
      } else if (bale.orientation === 'tall') {
        bale.orientation = 'pillar'
        bale.lean = null // <--- RESET LEAN
      } else {
        bale.orientation = 'flat'
      }
    }
    validateAllBales()
  }

function rotateBale(id) {
    const bale = bales.value.find(b => b.id === id)
    if (bale) {
      // Increment by 45 degrees instead of toggling
      // We use modulo 180 because a 180-degree bale is the same as 0
      bale.rotation = (bale.rotation + 45) % 180
    }
    validateAllBales()
  }

  // VALIDATION LOGIC
  function isValidPlacement(newBale) {
    // 1. Boundary Check (Simplified for rotation)
    // We assume a max bounding box of 3.5' for safety when rotated
    const safeMargin = newBale.rotation % 90 !== 0 ? 3.5 : 3
    
    if (newBale.x < 0 || newBale.x + safeMargin > ringDimensions.value.width ||
        newBale.y < 0 || newBale.y + safeMargin > ringDimensions.value.height) {
      return false
    }

    // 2. Collision Check
    // If it's diagonal, we skip strict collision to allow "Leaners"
    if (newBale.rotation % 90 !== 0) return true

    // Standard collision for 0/90 degree bales
    const width = newBale.rotation === 0 ? baleSize.width : baleSize.height
    const height = newBale.rotation === 0 ? baleSize.height : baleSize.width
    
    const collision = bales.value.some(existing => {
      if (existing.layer !== newBale.layer) return false
      // Skip collision check if the OTHER bale is diagonal
      if (existing.rotation % 90 !== 0) return false
      
      const exW = existing.rotation === 0 ? baleSize.width : baleSize.height
      const exH = existing.rotation === 0 ? baleSize.height : baleSize.width
      
      return (
        newBale.x < existing.x + exW &&
        newBale.x + width > existing.x &&
        newBale.y < existing.y + exH &&
        newBale.y + height > existing.y
      )
    })

    return !collision
  }

  // GETTERS
  const balesByLayer = computed(() => {
    return {
      1: bales.value.filter(b => b.layer === 1),
      2: bales.value.filter(b => b.layer === 2),
      3: bales.value.filter(b => b.layer === 3)
    }
  })

  // Count logic for map key [cite: 481]
  const baleCounts = computed(() => {
    return {
      total: bales.value.length,
      base: balesByLayer.value[1].length
    }
  })

  
function validateAllBales() {
    // We loop through every bale in the store
    bales.value.forEach(bale => {
      // Re-use our existing logic checker
      const isSafe = hasSupport(bale)
      bale.supported = isSafe
    })
  }

function hasSupport(newBale) {
    // 1. Ground is always supported
    if (newBale.layer === 1) return true

    // 2. Find all bales on the layer directly below
    // We filter manually here to avoid "ReferenceError" issues with getters
    const lowerLayer = bales.value.filter(b => b.layer === newBale.layer - 1)
    
    // Get dimensions for the new bale
    const newW = newBale.rotation % 180 === 0 ? 3 : 1.5 // Simplified for standard flat bales
    const newH = newBale.rotation % 180 === 0 ? 1.5 : 3

    // Check against every bale in the lower layer
    return lowerLayer.some(baseBale => {
      // Determine base bale dimensions (handle rotation)
      const baseW = baseBale.rotation % 180 === 0 ? 3 : 1.5
      const baseH = baseBale.rotation % 180 === 0 ? 1.5 : 3

      // Calculate overlap rectangle
      const x_overlap = Math.max(0, Math.min(newBale.x + newW, baseBale.x + baseW) - Math.max(newBale.x, baseBale.x))
      const y_overlap = Math.max(0, Math.min(newBale.y + newH, baseBale.y + baseH) - Math.max(newBale.y, baseBale.y))
      const overlapArea = x_overlap * y_overlap

      // Require at least 1 square foot of support
      return overlapArea >= 1 
    })
  }

  return {
    ringDimensions,
    gridSize,
    bales,
    currentLayer,
    selectedBaleId,
    addBale,
    removeBale,
    rotateBale,
    cycleOrientation,
    cycleLean,
    updateBalePosition,
    hasSupport,
    validateAllBales,
    previousClassCount,
    inventory,
    balesByLayer,
    baleCounts
  }
})

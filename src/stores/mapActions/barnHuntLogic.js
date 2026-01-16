import { computed } from 'vue'
import { useHides } from './useHides'
import { useDCMats } from './useDCMats'
import { useStartBox } from './useStartBox'
import { useBoardEdges } from './useBoardEdges'
import { useSteps } from './useSteps'
import { useZones } from './useZones'
import { useGates } from './useGates'
import { useBales } from './useBales'

/**
 * src/stores/mapActions/barnHuntLogic.js
 * Main Coordinator.
 * Aggregates logic from sub-modules and handles global statistics.
 */
export function useBarnHuntLogic(state, snapshot, notifications) {

  // --- INTEGRATE SUB-MODULES ---
  const hidesLogic = useHides(state, snapshot)
  const dcMatsLogic = useDCMats(state, snapshot)
  const startBoxLogic = useStartBox(state, snapshot)
  const boardEdgesLogic = useBoardEdges(state, snapshot)
  const stepsLogic = useSteps(state, snapshot)
  const zonesLogic = useZones(state, snapshot)
  const gatesLogic = useGates(state, snapshot)
  
  // Note: useBales requires notifications for error handling
  const balesLogic = useBales(state, snapshot, notifications)

  // --- STATISTICS ---
  // These remain here as they aggregate state data for the UI
  
  const balesByLayer = computed(() => ({
      1: state.bales.value.filter(b => b.layer === 1),
      2: state.bales.value.filter(b => b.layer === 2),
      3: state.bales.value.filter(b => b.layer === 3)
  }))

  const baleCounts = computed(() => ({ 
    total: state.bales.value.length, 
    base: balesByLayer.value[1].length 
  }))

  const inventory = computed(() => {
    const total = state.bales.value.length
    const delta = total - state.previousClassCount.value
    return {
      total,
      base: state.bales.value.filter(b => b.layer === 1).length,
      layer2: state.bales.value.filter(b => b.layer === 2).length,
      layer3: state.bales.value.filter(b => b.layer === 3).length,
      deltaString: delta > 0 ? `+${delta}` : `${delta}`,
      isNestingValid: total > 0 
    }
  })

const differentials = computed(() => {
    if (!state.previousBales.value || state.previousBales.value.length === 0) return null

    const stats = {
      1: { net: 0, moved: 0 },
      2: { net: 0, moved: 0 },
      3: { net: 0, moved: 0 },
      totalNet: 0 // [NEW] Track total change
    }

    const getLayers = (baleList) => ({
      1: baleList.filter(b => b.layer === 1),
      2: baleList.filter(b => b.layer === 2),
      3: baleList.filter(b => b.layer === 3)
    })

    const currentLayers = getLayers(state.bales.value)
    const prevLayers = getLayers(state.previousBales.value)

    ;[1, 2, 3].forEach(layer => {
      const curr = currentLayers[layer]
      const prev = prevLayers[layer] 
      
      // Calculate Net per layer
      const net = curr.length - prev.length
      stats[layer].net = net
      
      // Add to Total Net
      stats.totalNet += net

      // Calculate "Moved" (Reused) bales
      let staticCount = 0
      const prevPool = [...prev] 

      curr.forEach(bale => {
        const matchIndex = prevPool.findIndex(p => 
          Math.abs(p.x - bale.x) < 0.05 && 
          Math.abs(p.y - bale.y) < 0.05 &&
          p.rotation === bale.rotation &&
          p.orientation === bale.orientation
        )

        if (matchIndex !== -1) {
          staticCount++
          prevPool.splice(matchIndex, 1) 
        }
      })
      const reusedCount = Math.min(curr.length, prev.length)
      stats[layer].moved = reusedCount - staticCount
    })

    return stats
  })

  // --- GLOBAL HELPERS ---
  
  function generateMasterBlinds(count) {
    snapshot()
    const newBlinds = []
    for (let i = 0; i < count; i++) {
      const set = []
      for (let j = 0; j < 5; j++) {
        set.push(Math.floor(Math.random() * 5) + 1)
      }
      newBlinds.push(set)
    }
    state.masterBlinds.value = newBlinds
  }

  return {
    // Aggregated Stats & Global Helpers
    differentials, 
    balesByLayer, 
    baleCounts, 
    inventory,
    generateMasterBlinds,

    // Integrated Modules
    ...hidesLogic,
    ...dcMatsLogic,
    ...startBoxLogic,
    ...boardEdgesLogic,
    ...stepsLogic,
    ...zonesLogic,
    ...gatesLogic,
    ...balesLogic
  }
}
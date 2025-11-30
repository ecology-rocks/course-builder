// src/composables/useAutosave.js
import { watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const STORAGE_KEY = 'k9_autosave_v1'

export function useAutosave() {
  const store = useMapStore()

  // 1. WATCH & SAVE
  function enableAutosave() {
    watch(
      () => [store.bales, store.boardEdges, store.dcMats, store.hides, store.ringDimensions],
      () => {
        // Only autosave if we have content
        if (store.bales.length > 0 || store.boardEdges.length > 0) {
          const data = {
            timestamp: Date.now(),
            mapData: {
              bales: store.bales,
              boardEdges: store.boardEdges,
              dcMats: store.dcMats,
              hides: store.hides,
              dimensions: store.ringDimensions
            }
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        }
      },
      { deep: true }
    )
  }

  // 2. CHECK & LOAD
  function checkAutosave() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw)
      // Optional: Expire after 24 hours?
      // if (Date.now() - parsed.timestamp > 86400000) return null
      return parsed.mapData
    } catch (e) {
      console.error("Autosave corrupt", e)
      return null
    }
  }

  // 3. CLEAR (Call this when they manually save or clear the map)
  function clearAutosave() {
    localStorage.removeItem(STORAGE_KEY)
  }

  return { enableAutosave, checkAutosave, clearAutosave }
}
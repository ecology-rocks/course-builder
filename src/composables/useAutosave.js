import { watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'

export function useAutosave(delay = 3000) {
  const store = useMapStore()
  let timeout = null

  // Watch the entire state for changes
  store.$subscribe((mutation, state) => {
    // 1. Don't autosave if we are currently dragging/drawing (performance)
    if (store.isDrawingBoard) return

    // 2. Only autosave if the map has already been saved once (has an ID)
    if (!store.currentMapId) return

    // 3. Debounce: Clear previous timer
    if (timeout) clearTimeout(timeout)

    // 4. Set new timer
    timeout = setTimeout(() => {
      store.saveToCloud(true) // true = Silent Mode
    }, delay)
  })
}
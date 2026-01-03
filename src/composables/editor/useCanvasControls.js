import { ref, computed } from 'vue'

export function useCanvasControls(store, wrapperRef, GRID_OFFSET) {
  const scale = ref(40)

  const stageConfig = computed(() => ({
    width: (store.ringDimensions.width * scale.value) + (GRID_OFFSET * 2),
    height: (store.ringDimensions.height * scale.value) + (GRID_OFFSET * 2)
  }))

  function zoom(delta) {
    const newScale = scale.value + delta
    if (newScale >= 5 && newScale <= 60) scale.value = newScale
  }

  function fitToScreen() {
    if (!wrapperRef.value) return
    const availableW = wrapperRef.value.clientWidth - (GRID_OFFSET * 2) - 40
    const availableH = wrapperRef.value.clientHeight - (GRID_OFFSET * 2) - 40
    
    const scaleX = availableW / store.ringDimensions.width
    const scaleY = availableH / store.ringDimensions.height
    
    let newScale = Math.min(scaleX, scaleY)
    scale.value = Math.max(Math.min(Math.floor(newScale), 40), 5)
  }

  return { scale, stageConfig, zoom, fitToScreen }
}
import { ref, computed } from 'vue'

export function useCanvasControls(store, wrapperRef, GRID_OFFSET) {
  const scale = ref(40)

const stageConfig = computed(() => {
  // --- DEBUGGING START ---
  const w = store.ringDimensions.width
  const h = store.ringDimensions.height
  const s = scale.value

  const finalW = (w * s) + (GRID_OFFSET * 2)
  const finalH = (h * s) + (GRID_OFFSET * 2)

  // If we detect a crash-causing value, log the details
  if (isNaN(finalW) || isNaN(finalH) || !Number.isFinite(finalW)) {
    console.group("🔥 CRITICAL ERROR: Stage Config is NaN")
    console.error("The map is trying to render with invalid dimensions.")
    console.log("Store Width:", w, "(Type:", typeof w, ")")
    console.log("Store Height:", h, "(Type:", typeof h, ")")
    console.log("Current Scale:", s, "(Type:", typeof s, ")")
    console.groupEnd()
  }
  // --- DEBUGGING END ---

  return {
    width: finalW,
    height: finalH
  }
})

  function zoom(delta) {
    const newScale = scale.value + delta
    if (newScale >= 5 && newScale <= 60) scale.value = newScale
  }

  function fitToScreen() {
    if (!wrapperRef.value) return
    const availableW = wrapperRef.value.clientWidth - (GRID_OFFSET * 2) - 40
    const availableH = wrapperRef.value.clientHeight - (GRID_OFFSET * 2) - 40
    
    const mapW = Number(store.ringDimensions.width) || 24
    const mapH = Number(store.ringDimensions.height) || 24

    const scaleX = availableW / mapW
    const scaleY = availableH / mapH
    
    let newScale = Math.min(scaleX, scaleY)
    
    // [FIX] Ensure newScale is finite before applying
    if(Number.isFinite(newScale)) {
        scale.value = Math.max(Math.min(Math.floor(newScale), 40), 5)
    } else {
        scale.value = 20 // Fallback
    }
  }

  return { scale, stageConfig, zoom, fitToScreen }
}
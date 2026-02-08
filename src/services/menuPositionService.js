import { ref, watch, nextTick, onMounted } from 'vue'

export function useMenuPosition(menuState, menuRef) {
  const style = ref({
    position: 'fixed',
    zIndex: 3000,
    display: 'none',
    opacity: 0,
    left: '0px',
    top: '0px'
  })

  const updatePosition = async () => {
    // 1. Guard Clause: If menu is closed, hide it
    if (!menuState.value) {
      style.value.display = 'none'
      return
    }

    // 2. Render Stage: Make it visible to the DOM (but transparent) so we can measure it
    style.value = {
      position: 'fixed',
      zIndex: 3000,
      left: `${menuState.value.x}px`,
      top: `${menuState.value.y}px`,
      opacity: 0, // Keep invisible while calculating
      display: 'block'
    }

    // 3. Wait for DOM update
    await nextTick()
    
    // Safety: If ref is still missing, wait one more frame
    if (!menuRef.value) return 

    // 4. Measure
    const rect = menuRef.value.getBoundingClientRect()
    const { innerWidth, innerHeight } = window

    // [CRITICAL FIX] If height is 0, the browser hasn't painted yet. Retry in next frame.
    if (rect.height === 0 || rect.width === 0) {
      requestAnimationFrame(updatePosition)
      return
    }

    let x = menuState.value.x
    let y = menuState.value.y

    // 5. Vertical Logic: Flip UP if near bottom
    if (y + rect.height > innerHeight) {
      y -= rect.height
    }
    // Clamp to top edge (so it doesn't disappear off the TOP)
    y = Math.max(y, 10)

    // 6. Horizontal Logic: Flip LEFT if near right edge
    if (x + rect.width > innerWidth) {
      x -= rect.width
    }
    // Clamp to left edge
    x = Math.max(x, 10)

    // 7. Apply Final Position & Fade In
    style.value = {
      position: 'fixed',
      zIndex: 3000,
      left: `${x}px`,
      top: `${y}px`,
      opacity: 1,
      display: 'block'
    }
  }

  // Watch for state changes (opening/moving)
  watch(menuState, updatePosition, { deep: true })
  
  // [NEW] Watch for the element itself (fixes the "height=0" bug on first render)
  watch(menuRef, (el) => {
    if (el) updatePosition()
  })

  onMounted(updatePosition)

  return { style }
}
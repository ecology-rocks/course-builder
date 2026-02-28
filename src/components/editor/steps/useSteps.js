export function useSteps(state, snapshot) {
  function addStep(x, y) {
    // Initialize with default UNIT_W and UNIT_H (2x1.5)
    state.steps.value.push({ 
      id: Date.now().toString(), 
      x, 
      y, 
      width: 2, 
      height: 1.5, 
      rotation: 0,
      custom: {
        width: null,
        height: null,
        fillColor: null,
        strokeColor: null,
        textValue: null,
        textColor: null
      } 
    })
    if (snapshot) snapshot()
  }

function updateStep(id, attrs) {
    const s = state.steps.value.find(i => i.id === id)
    if (s) {
      console.log('[DEBUG useSteps] updateStep called for', id, 'with attrs:', attrs)
      // Allow updating width and height alongside x, y, and rotation
      Object.assign(s, attrs)
      console.log('[DEBUG useSteps] Resulting step state:', { ...s })
      if (snapshot) snapshot()
    }
  }

function rotateStep(id) {
    const step = state.steps.value.find(s => s.id === id)
    if (step) {
      console.log('[DEBUG useSteps] rotateStep (context menu) called for', id)
      console.log('[DEBUG useSteps] Before rotation:', step.x, step.y, step.rotation)

      // Find current dimensions
      const w = step.custom?.width != null ? step.custom.width : step.width
      const h = step.custom?.height != null ? step.custom.height : step.height
      
      const r1 = (step.rotation || 0) * (Math.PI / 180)
      const r2 = ((step.rotation || 0) + 15) % 360 * (Math.PI / 180)

      // 1. Calculate the current absolute center of the shape
      const cx = step.x + (w / 2) * Math.cos(r1) - (h / 2) * Math.sin(r1)
      const cy = step.y + (w / 2) * Math.sin(r1) + (h / 2) * Math.cos(r1)

      // 2. Calculate the new top-left x,y so the center remains exactly at cx, cy
      step.x = cx - (w / 2) * Math.cos(r2) + (h / 2) * Math.sin(r2)
      step.y = cy - (w / 2) * Math.sin(r2) - (h / 2) * Math.cos(r2)
      
      // 3. Apply the rotation
      step.rotation = (step.rotation + 15) % 360
      console.log('[DEBUG useSteps] After rotation:', step.x, step.y, step.rotation)
      if (snapshot) snapshot()
    }
  }

function isItemSelected(id) {
    return state.selection.value.includes(id)
  }

  function removeStep(id) {

    state.steps.value = state.steps.value.filter(s => s.id !== id)
    if (snapshot) snapshot()
  }

  return { addStep, updateStep, rotateStep, removeStep, isItemSelected }
}
export function useSteps(state, snapshot) {
  function addStep(x, y) {
        // Ensure rotation is initialized
    state.steps.value.push({ id: Date.now().toString(), x, y, rotation: 0 })
    if (snapshot) snapshot()
  }

  function updateStep(id, attrs) {
    const s = state.steps.value.find(i => i.id === id)
    if (s) {

      Object.assign(s, attrs)
      if (snapshot) snapshot()
    }
    
  }

  function rotateStep(id) {
    const step = state.steps.value.find(s => s.id === id)
    if (step) {

      // Uniform logic: 15-degree increments, 0-360 cycle
      step.rotation = (step.rotation + 15) % 360
      if (snapshot) snapshot()
    }
  }

  function removeStep(id) {

    state.steps.value = state.steps.value.filter(s => s.id !== id)
    if (snapshot) snapshot()
  }

  return { addStep, updateStep, rotateStep, removeStep }
}
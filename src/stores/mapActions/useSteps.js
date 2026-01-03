export function useSteps(state, snapshot) {
  function addStep(x, y) {
    snapshot()
    // Ensure rotation is initialized
    state.steps.value.push({ id: Date.now().toString(), x, y, rotation: 0 })
  }

  function updateStep(id, attrs) {
    const s = state.steps.value.find(i => i.id === id)
    if (s) {
      snapshot()
      Object.assign(s, attrs)
    }
  }

  function rotateStep(id) {
    const step = state.steps.value.find(s => s.id === id)
    if (step) {
      snapshot()
      // Uniform logic: 15-degree increments, 0-360 cycle
      step.rotation = (step.rotation + 15) % 360
    }
  }

  function removeStep(id) {
    snapshot()
    state.steps.value = state.steps.value.filter(s => s.id !== id)
  }

  return { addStep, updateStep, rotateStep, removeStep }
}
export function useGates(state) {
  function setGate(gateData) {
    // [FIX] Ensure object has an ID so selection/move logic works
    state.gate.value = { 
      ...gateData, 
      id: gateData.id || crypto.randomUUID() 
    }
  }

  function removeGate() {
    state.gate.value = null
  }

  return { setGate, removeGate }
}
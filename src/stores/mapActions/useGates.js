export function useGates(state) {
  function setGate(gateData) {
    // gateData should be { x, y, rotation }
    state.gate.value = gateData
  }

  function removeGate() {
    state.gate.value = null
  }

  return { setGate, removeGate }
}
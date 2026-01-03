export function useGates(state, snapshot) {
  function setGate(gateData) {
    snapshot()
    // gateData should be { x, y, rotation }
    state.gate.value = gateData
  }

  function removeGate() {
    snapshot()
    state.gate.value = null
  }

  return { setGate, removeGate }
}
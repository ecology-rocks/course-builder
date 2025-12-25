/**
 * src/stores/mapActions/agilityLogic.js
 * Logic for Agility Obstacles.
 */
export function useAgilityLogic(state, snapshot) {

  function addAgilityObstacle(type, x, y) {
    snapshot()
    state.agilityObstacles.value.push({ 
      id: crypto.randomUUID(), 
      type, 
      x: Math.round(x*2)/2, 
      y: Math.round(y*2)/2, 
      rotation: 0, 
      number: null, 
      shape: 'straight', 
      poleCount: 12 
    })
  }

  function removeAgilityObstacle(id) { 
    snapshot()
    state.agilityObstacles.value = state.agilityObstacles.value.filter(o => o.id !== id) 
  }

  function rotateAgilityObstacle(id) {
    const obs = state.agilityObstacles.value.find(o => o.id === id)
    if (obs) { 
      snapshot()
      obs.rotation = (obs.rotation + 45) % 360 
    }
  }

  function cycleAgilityShape(id) {
    const obs = state.agilityObstacles.value.find(o => o.id === id)
    if (obs) { 
      snapshot()
      const shapes = ['straight', 'L', 'U'] 
      obs.shape = shapes[(shapes.indexOf(obs.shape || 'straight') + 1) % shapes.length]
    }
  }

  function cycleAgilityPoles(id) {
    const obs = state.agilityObstacles.value.find(o => o.id === id)
    if (obs) {
      snapshot()
      const options = [12, 6, 2, 4, 8, 10]
      obs.poleCount = options[(options.indexOf(obs.poleCount || 12) + 1) % options.length]
    }
  }

  function renumberObstacle(id, number) {
    const obs = state.agilityObstacles.value.find(o => o.id === id)
    if (obs) { 
      snapshot()
      obs.number = number 
    }
  }

  return {
    addAgilityObstacle,
    removeAgilityObstacle,
    rotateAgilityObstacle,
    cycleAgilityShape,
    cycleAgilityPoles,
    renumberObstacle
  }
}
import { ref } from 'vue'

export function useStageInteraction(store, scale, GRID_OFFSET) {
  const selectionRect = ref(null)
  const dragStart = ref(null)
  const maybePlacing = ref(false)

  // --- GATE LOGIC ---
  function placeGate(rawX, rawY) {
    const W = store.ringDimensions.width
    const H = store.ringDimensions.height
    const gateWidth = 3 
    const halfGate = gateWidth / 2

    const distLeft = rawX; const distRight = W - rawX;
    const distTop = rawY; const distBottom = H - rawY;
    const min = Math.min(distLeft, distRight, distTop, distBottom)

    let finalX, finalY, rotation
    if (min === distTop) { rotation = 0; finalY = 0; finalX = Math.max(halfGate, Math.min(rawX, W - halfGate)) } 
    else if (min === distBottom) { rotation = 0; finalY = H; finalX = Math.max(halfGate, Math.min(rawX, W - halfGate)) } 
    else if (min === distLeft) { rotation = 90; finalX = 0; finalY = Math.max(halfGate, Math.min(rawY, H - halfGate)) } 
    else { rotation = 90; finalX = W; finalY = Math.max(halfGate, Math.min(rawY, H - halfGate)) }

    store.setGate({ x: finalX, y: finalY, rotation })
  }

  // --- MOUSE DOWN ---
  function handleStageMouseDown(e) {
    if (e.evt.button !== 0 || e.target !== e.target.getStage()) return

    const pointer = e.target.getStage().getPointerPosition()
    const x = (pointer.x - GRID_OFFSET) / scale.value
    const y = (pointer.y - GRID_OFFSET) / scale.value
    dragStart.value = { x, y }

    if (store.activeTool === 'gate') {
      placeGate(x, y)
      return
    }

    if (x < 0 || y < 0) return

    if (store.activeTool === 'select') {
      store.clearSelection()
      selectionRect.value = { x, y, w: 0, h: 0 }
      return
    }

    if (store.sport === 'barnhunt') {
      if (store.activeTool === 'board') { store.startDrawingBoard(x, y); return }
      maybePlacing.value = true
    }
    else if (store.sport === 'agility') {
      const tools = ['jump', 'tunnel', 'weave', 'contact', 'table', 'aframe', 'dogwalk', 'teeter']
      if (tools.includes(store.activeTool)) store.addAgilityObstacle(store.activeTool, x, y)
    }
    else if (store.sport === 'scentwork') {
      if (store.activeTool === 'board') store.startDrawingBoard(x, y)
      else {
        const tools = ['box', 'luggage', 'container', 'cone', 'vehicle', 'buried']
        if (tools.includes(store.activeTool)) store.addScentWorkObject(store.activeTool, x, y)
      }
    }
  }

  // --- MOUSE MOVE ---
  function handleStageMouseMove(e) {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    const x = (pointer.x - GRID_OFFSET) / scale.value
    const y = (pointer.y - GRID_OFFSET) / scale.value

    if (selectionRect.value && dragStart.value) {
      selectionRect.value.w = x - dragStart.value.x
      selectionRect.value.h = y - dragStart.value.y
      return
    }

    if (store.activeTool === 'board' && store.isDrawingBoard) {
      store.updateDrawingBoard(x, y)
      return
    }

    if (maybePlacing.value) {
      const dist = Math.hypot(x - dragStart.value.x, y - dragStart.value.y)
      if (dist > 0.5) {
        maybePlacing.value = false
        selectionRect.value = { x: dragStart.value.x, y: dragStart.value.y, w: 0, h: 0 }
      }
    }
  }

  // --- MOUSE UP ---
  function handleStageMouseUp() {
    if (selectionRect.value) {
      store.selectArea(selectionRect.value.x, selectionRect.value.y, selectionRect.value.w, selectionRect.value.h)
      selectionRect.value = null
      dragStart.value = null
      maybePlacing.value = false
      return
    }

    if (maybePlacing.value) {
      const { x, y } = dragStart.value
      if (store.sport === 'barnhunt') {
        const t = store.activeTool
        if (t === 'bale') store.addBale(x, y)
        else if (t === 'startbox') store.addStartBox(x, y)
        else if (t === 'dcmat') store.addDCMat(x, y)
        else if (t === 'hide') store.addHide(x, y)
        else if (t === 'step') store.addStep(x, y)
        else if (t === 'dead' || t === 'obstruction') store.addZone(x, y, t)
      }
      else if (store.sport === 'agility') {
        store.addAgilityObstacle(store.activeTool, x, y)
      }
      else if (store.sport === 'scentwork') {
         // (Handled in mousedown usually for SW, but safe to keep here if needed for single clicks)
      }
      maybePlacing.value = false
      dragStart.value = null
    }

    if (store.activeTool === 'board') store.stopDrawingBoard()
  }

  function handleDragStart() { store.snapshot() }

  return {
    selectionRect,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleDragStart
  }
}
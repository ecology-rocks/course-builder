import { ref } from "vue";

export function useStageInteraction(store, scale, GRID_OFFSET) {
  const selectionRect = ref(null);
  const dragStart = ref(null);
  const maybePlacing = ref(false);

  function getToolSize(tool) {
    // Returns { w, h } for the active tool's default placement object.
    // If the object is a point (step, hide, note), return 0,0.
    switch (tool) {
      case "bale":
        // Default placement is 'flat' orientation (Length x Width)
        return {
          w: store.baleConfig?.length || 3,
          h: store.baleConfig?.width || 1.5,
        };
      case "startbox":
        return { w: 4, h: 4 };
      case "tunnelboard":
        return { w: 4, h: 2 };
      case "dcmat":
        return {
          w: store.dcMatConfig?.width || 2,
          h: store.dcMatConfig?.height || 3,
        };
      case "step":
        return { w: 2, h: 1.5 };
      case "dead":
        return { w: 5, h: 5 };
      case "obstruction":
        // Zones default to 5x5 in useZones.js
        return { w: 5, h: 5 };
      default:
        // Point objects (Hide, Note, etc.) have no "width" to clamp against
        return { w: 0, h: 0 };
    }
  }

  // --- GATE LOGIC ---
  // --- GATE LOGIC ---
  function placeGate(rawX, rawY) {
    // 1. Try Custom Walls First
    if (store.customWalls && store.customWalls.length > 0) {
      // Use the helper we created in store/useCustomWalls.js
      const { point, dist, angle } = store.getNearestWallPoint(rawX, rawY);

      // If we clicked reasonably close to a custom wall (approx 2ft)
      if (dist < 2) {
        store.setGate({ x: point.x, y: point.y, rotation: angle });
        return;
      }
    }

    // 2. Fallback to Standard Grid (Existing Logic)
    const W = store.ringDimensions.width;
    const H = store.ringDimensions.height;
    const gateWidth = 3;
    const halfGate = gateWidth / 2;

    const distLeft = rawX;
    const distRight = W - rawX;
    const distTop = rawY;
    const distBottom = H - rawY;
    const min = Math.min(distLeft, distRight, distTop, distBottom);

    let finalX, finalY, rotation;
    if (min === distTop) {
      rotation = 0;
      finalY = 0;
      finalX = Math.max(halfGate, Math.min(rawX, W - halfGate));
    } else if (min === distBottom) {
      rotation = 0;
      finalY = H;
      finalX = Math.max(halfGate, Math.min(rawX, W - halfGate));
    } else if (min === distLeft) {
      rotation = 90;
      finalX = 0;
      finalY = Math.max(halfGate, Math.min(rawY, H - halfGate));
    } else {
      rotation = 90;
      finalX = W;
      finalY = Math.max(halfGate, Math.min(rawY, H - halfGate));
    }

    store.setGate({ x: finalX, y: finalY, rotation });
  }

  // --- MOUSE DOWN ---

  function handleStageMouseDown(e) {
    console.log("[Stage] MouseDown:", {
      targetType: e.target.className || e.target.nodeType,
      isStage: e.target === e.target.getStage(),
      tool: store.activeTool,
    });

    if (e.evt.button === 2) return;

    store.closeAllMenus();

    if (e.target !== e.target.getStage()) {
      return;
    }

    // Only handle Left Click on the Stage (Background)
    if (
      (store.activeTool !== "board" || store.activeTool !== "hide") &&
      e.target !== e.target.getStage()
    )
      return;

    const pointer = e.target.getStage().getPointerPosition();
    const x = (pointer.x - GRID_OFFSET) / scale.value;
    const y = (pointer.y - GRID_OFFSET) / scale.value;
    dragStart.value = { x, y };

    if (store.activeTool === "gate") {
      placeGate(x, y);
      return;
    }

    if (x < 0 || y < 0) return;

    if (store.activeTool === "select") {
      store.clearSelection();
      selectionRect.value = { x, y, w: 0, h: 0 };
      return;
    }

    if (store.selection.length > 0) {
      store.clearSelection();
      return;
    }

    if (store.activeTool === "board") {
      store.startDrawingBoard(x, y);
      return;
    }

    if (store.activeTool === "tunnelboard") {
      store.addTunnelBoard(x, y);
      return;
    }

    if (store.activeTool === "wall") {
      // Optional: Snap to 6-inch grid (0.5 units) for cleaner lines
      const snapX = Math.round(x * 2) / 2;
      const snapY = Math.round(y * 2) / 2;
      store.addWallPoint(snapX, snapY);
      return;
    }

    // [FIX] Handle Measurement Tool on Background
    if (store.activeTool === "measure") {
      const snapX = Math.round(x * 2) / 2;
      const snapY = Math.round(y * 2) / 2;
      store.addMeasurementPoint(snapX, snapY);
      return;
    }

    maybePlacing.value = true;
  }

  // --- MOUSE MOVE ---
  function handleStageMouseMove(e) {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const x = (pointer.x - GRID_OFFSET) / scale.value;
    const y = (pointer.y - GRID_OFFSET) / scale.value;

    if (selectionRect.value && dragStart.value) {
      selectionRect.value.w = x - dragStart.value.x;
      selectionRect.value.h = y - dragStart.value.y;
      return;
    }

    if (store.activeTool === "board" && store.isDrawingBoard) {
      store.updateDrawingBoard(x, y);
      return;
    }

    if (maybePlacing.value) {
      const dist = Math.hypot(x - dragStart.value.x, y - dragStart.value.y);
      if (dist > 0.5) {
        maybePlacing.value = false;
        selectionRect.value = {
          x: dragStart.value.x,
          y: dragStart.value.y,
          w: 0,
          h: 0,
        };
      }
    }
  }

  // --- MOUSE UP ---
  function handleStageMouseUp() {
    if (selectionRect.value) {
      store.selectArea(
        selectionRect.value.x,
        selectionRect.value.y,
        selectionRect.value.w,
        selectionRect.value.h,
      );
      selectionRect.value = null;
      dragStart.value = null;
      maybePlacing.value = false;
      return;
    }

    if (maybePlacing.value) {
      const { x, y } = dragStart.value;
      const t = store.activeTool;

      // 1. Get size of the object we are about to place
      const { w, h } = getToolSize(t);

      // 2. Clamp coordinates so the object stays fully inside the ring
      //    (Min: 0, Max: RingDimension - ObjectSize)
      const finalX = Math.max(0, Math.min(x, store.ringDimensions.width - w));
      const finalY = Math.max(0, Math.min(y, store.ringDimensions.height - h));

      // 3. Place the object using clamped coordinates
      if (t === "bale") store.addBale(finalX, finalY);
      else if (t === "startbox") store.addStartBox(finalX, finalY);
      else if (t === "dcmat") store.addDCMat(finalX, finalY);
      else if (t === "hide") store.addHide(finalX, finalY);
      else if (t === "step") store.addStep(finalX, finalY);
      else if (t === "note") store.addNote(finalX, finalY);
      else if (t === "tunnelboard") store.addTunnelBoard(finalX, finalY);
      else if (t === "dead" || t === "obstruction")
        store.addZone(finalX, finalY, t);

      maybePlacing.value = false;
      dragStart.value = null;
    }

    if (store.activeTool === "board") store.stopDrawingBoard();
  }

  function handleDragStart() {
    store.snapshot();
  }

  return {
    selectionRect,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleDragStart,
  };
}

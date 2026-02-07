// src/components/editor/logic/useGridLogic.js
export function useGridLogic(state) {
  
  // --- CONSTANTS ---
  const RESIZE_STRATEGIES = {
    bales: (b, w, h) => {
      if (b.x >= w) b.x = w - 3.5;
      if (b.y >= h) b.y = h - 3.5;
    },
    boardEdges: (b, w, h) => {
      if (b.x1 > w) b.x1 = w;
      if (b.x2 > w) b.x2 = w;
      if (b.y1 > h) b.y1 = h;
      if (b.y2 > h) b.y2 = h;
    },
    default: (o, w, h) => {
      if (o.x && o.x >= w) o.x = w - 1;
      if (o.y && o.y >= h) o.y = h - 1;
    },
  };

  const snap = (v) => Math.round(v * 6) / 6;

  // --- ACTIONS ---

  function resizeRing(width, height) {
    const oldW = state.ringDimensions.value.width;
    const oldH = state.ringDimensions.value.height;
    const newW = Math.max(10, parseInt(width));
    const newH = Math.max(10, parseInt(height));

    const dX = newW - oldW;
    const dY = newH - oldH;

    state.ringDimensions.value = { width: newW, height: newH };

    const shouldShiftX = state.gridStartCorner.value.includes("right");
    const shouldShiftY = state.gridStartCorner.value.includes("bottom");

    Object.keys(state.mapData.value).forEach((key) => {
      const itemOrList = state.mapData.value[key];
      if (!itemOrList) return;

      const strategy = RESIZE_STRATEGIES[key] || RESIZE_STRATEGIES.default;

      const updateItem = (item) => {
        if (shouldShiftX) {
          if (item.x1 !== undefined) {
            item.x1 += dX;
            item.x2 += dX;
          } else {
            item.x += dX;
          }
        }
        if (shouldShiftY) {
          if (item.y1 !== undefined) {
            item.y1 += dY;
            item.y2 += dY;
          } else {
            item.y += dY;
          }
        }
        strategy(item, newW, newH);
      };

      if (Array.isArray(itemOrList)) {
        itemOrList.forEach(updateItem);
      } else {
        updateItem(itemOrList);
      }
    });
  }

  function realignGeneric() {
    // Snap Standard Lists (Generic)
    Object.keys(state.mapData.value).forEach((key) => {
      if (key === "bales") return; // Handled by Bale Module
      if (!Array.isArray(state.mapData.value[key])) return;
      
      state.mapData.value[key].forEach(item => {
        if (typeof item.x === "number") item.x = snap(item.x);
        if (typeof item.y === "number") item.y = snap(item.y);
        if (typeof item.x1 === "number") {
          item.x1 = snap(item.x1); item.y1 = snap(item.y1);
          item.x2 = snap(item.x2); item.y2 = snap(item.y2);
        }
        if (item.points) item.points.forEach(p => { p.x = snap(p.x); p.y = snap(p.y); });
      });
    });
  }

  function realignSingulars() {
    if (state.mapData.value.startBox) { 
        state.mapData.value.startBox.x = snap(state.mapData.value.startBox.x); 
        state.mapData.value.startBox.y = snap(state.mapData.value.startBox.y); 
    }
    if (state.mapData.value.gate) { 
        state.mapData.value.gate.x = snap(state.mapData.value.gate.x); 
        state.mapData.value.gate.y = snap(state.mapData.value.gate.y); 
    }
  }

  return {
    resizeRing,
    realignGeneric,
    realignSingulars
  };
}
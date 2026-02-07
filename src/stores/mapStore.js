import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useUserStore } from "./userStore";
// IMPORT MODULES
import { useMapPersistence } from "services/persistenceService";
import { useSelectionLogic } from "services/selectionService";
import { useBarnHuntLogic } from "services/barnHuntLogic";
import { useHistory } from "services/historyService";

// ==========================================
// 0. CONSTANTS & STRATEGIES
// ==========================================

// This acts as the "Schema" for your map.
const DEFAULT_MAP_DATA = {
  bales: [],
  boardEdges: [],
  hides: [],
  dcMats: [],
  steps: [],
  zones: [],
  tunnelBoards: [],

  notes: [],
  masterBlinds: [],
  startBox: null,
  gate: null,
  measurements: [],
};

// Logic for how different objects behave when the ring shrinks
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

export const useMapStore = defineStore("map", () => {
  const userStore = useUserStore();

  // ==========================================
  // 1. STATE DEFINITIONS
  // ==========================================

  // A. The Unified Map Data
  const mapData = ref(JSON.parse(JSON.stringify(DEFAULT_MAP_DATA)));

  // B. Settings & Metadata
  const ringDimensions = ref({ width: 24, height: 24 });
  const gridSize = ref(20);
  const currentMapId = ref(null);
  const mapName = ref("Untitled Map");
  const isShared = ref(false);
  const folders = ref([]);
  const currentFolderId = ref(null);
  const classLevel = ref("Novice");
  const sport = ref("barnhunt");
  const notification = ref(null);
  const showMapStats = ref(true);
  const previousClassCount = ref(0);
  const activeMeasurement = ref(null);
  const editingNoteId = ref(null);
  

  // Configs
  const wallTypes = ref({
    top: "fence",
    right: "fence",
    bottom: "fence",
    left: "fence",
  });
  const gridStartCorner = ref("top-left");
  const trialLocation = ref("");
  const trialDay = ref("");
  const trialNumber = ref("");
  const baleConfig = ref({ length: 36 / 12, width: 18 / 12, height: 14 / 12 });
  const dcMatConfig = ref({ width: 2, height: 3 });

  // Editor State
  const savedMaps = ref([]);
  const comparisonMapName = ref(null);
  const previousBales = ref([]);
  const clipboard = ref([]);
  const currentLayer = ref(1);
  const selectedBaleId = ref(null);
  const selection = ref([]);
  const isDraggingSelection = ref(false);
  const activeTool = ref("bale");
  const nextNumber = ref(1);
  const isDrawingBoard = ref(false);
  const gridStep = ref(2);
  const activeHideMenu = ref(null); // Stores { id, x, y } or null
  const showCustomizationModal = ref(false);
  const editingCustomObject = ref(null);
  const activeDCMatMenu = ref(null)
  // ==========================================
  // 2. ACTIONS (Internal & External)
  // ==========================================
  function openHideMenu(id, x, y) {
    activeHideMenu.value = { id, x, y };
  }

  function closeHideMenu() {
    activeHideMenu.value = null;
  }
  function showNotification(message, type = "info") {
    notification.value = { message, type };
    setTimeout(() => {
      notification.value = null;
    }, 3000);
  }

  function openNoteEditor(id) {
    editingNoteId.value = id;
  }

  function closeNoteEditor() {
    editingNoteId.value = null;
  }

  function reset() {
    mapData.value = JSON.parse(JSON.stringify(DEFAULT_MAP_DATA));

    currentMapId.value = null;
    mapName.value = "Untitled Map";
    classLevel.value = "Novice";
    sport.value = "barnhunt";
    ringDimensions.value = { width: 24, height: 24 };
    currentLayer.value = 1;
    activeTool.value = "bale";
    nextNumber.value = 1;
    selection.value = [];
    previousBales.value = [];
    comparisonMapName.value = null;
    wallTypes.value = {
      top: "fence",
      right: "fence",
      bottom: "fence",
      left: "fence",
    };
    gridStartCorner.value = "top-left";
    trialLocation.value = "";
    trialDay.value = "";
    trialNumber.value = "";
    baleConfig.value = { length: 3, width: 1.5, height: 1 };
    dcMatConfig.value = { width: 2, height: 3 };
    activeMeasurement.value = null;
    editingNoteId.value = null;
  }

  function resizeRing(width, height) {
    const oldW = ringDimensions.value.width;
    const oldH = ringDimensions.value.height;
    const newW = Math.max(10, parseInt(width));
    const newH = Math.max(10, parseInt(height));

    const dX = newW - oldW;
    const dY = newH - oldH;

    ringDimensions.value = { width: newW, height: newH };

    const shouldShiftX = gridStartCorner.value.includes("right");
    const shouldShiftY = gridStartCorner.value.includes("bottom");

    Object.keys(mapData.value).forEach((key) => {
      const itemOrList = mapData.value[key];
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

  function realignGrid() {
    // Snap to nearest 2 inches (1/6th of a foot)
    const snap = (v) => Math.round(v * 6) / 6;
    const data = mapData.value;

    // Get current bale dimensions
    const { length: L, width: W, height: H } = baleConfig.value;

    // Helper: Snap List
    const snapList = (list) => {
      if (!list) return;
      list.forEach((item) => {
        // Snap X/Y (Standard objects)
        if (typeof item.x === "number") item.x = snap(item.x);
        if (typeof item.y === "number") item.y = snap(item.y);

        // Snap Line coords (Boards/Walls)
        if (typeof item.x1 === "number") {
          item.x1 = snap(item.x1);
          item.y1 = snap(item.y1);
          item.x2 = snap(item.x2);
          item.y2 = snap(item.y2);
        }

        // Snap Measurement Points (Fixes manual tool)
        if (item.points && Array.isArray(item.points)) {
          item.points.forEach((p) => {
            p.x = snap(p.x);
            p.y = snap(p.y);
          });
        }
      });
    };

    // 1. Snap Standard Objects (Exclude bales for special handling)
    Object.keys(data).forEach((key) => {
      if (key === "bales") return;
      if (Array.isArray(data[key])) snapList(data[key]);
    });

    // 2. Snap Bales (Smarter Visual Edge Snapping)
    if (data.bales) {
      data.bales.forEach((b) => {
        // Determine unrotated dimensions based on orientation
        let w = L,
          h = W;
        if (b.orientation === "pillar") {
          w = W;
          h = H;
        } else if (b.orientation === "tall") {
          w = L;
          h = H;
        } else {
          w = L;
          h = W;
        } // Flat (Default)

        const rot = Math.abs(b.rotation || 0) % 180;
        const isRectilinear =
          Math.abs(rot) < 1 ||
          Math.abs(rot - 90) < 1 ||
          Math.abs(rot - 180) < 1;

        if (isRectilinear) {
          // If rotated 90/270, dimensions swap
          const isVertical = Math.abs(rot - 90) < 1;
          const effectiveW = isVertical ? h : w;
          const effectiveH = isVertical ? w : h;

          // Calculate Visual Top-Left (The visible edge)
          // Pivot (Center) = x + w/2
          const pivotX = b.x + w / 2;
          const pivotY = b.y + h / 2;

          const currentMinX = pivotX - effectiveW / 2;
          const currentMinY = pivotY - effectiveH / 2;

          // Snap the VISUAL edge to the grid
          const newMinX = snap(currentMinX);
          const newMinY = snap(currentMinY);

          /// [FIX] The back-calculation now correctly uses the dynamic w/h
          b.x = newMinX + effectiveW / 2 - w / 2;
          b.y = newMinY + effectiveH / 2 - h / 2;
        } else {
          // Fallback for weird angles (15, 30, 45): Just snap the point
          b.x = snap(b.x);
          b.y = snap(b.y);
        }
      });
    }

    // 3. Singulars
    if (data.startBox) {
      data.startBox.x = snap(data.startBox.x);
      data.startBox.y = snap(data.startBox.y);
    }
    if (data.gate) {
      data.gate.x = snap(data.gate.x);
      data.gate.y = snap(data.gate.y);
    }

    if (stateRefs.snapshot) stateRefs.snapshot();
    showNotification("All objects realigned to grid (2-inch snap)");
  }

  function setTool(tool) {
    activeTool.value = tool;
  }

  function toggleAnchor() {
    if (selection.value.length === 0) return;
    if (currentLayer.value !== 1) {
      showNotification("Anchor bales must be on Layer 1.", "error");
      return;
    }
    mapData.value.bales.forEach((b) => {
      if (selection.value.includes(b.id)) {
        b.isAnchor = !b.isAnchor;
      }
    });
  }

  function setComparisonBales(bales, name = "Custom Map") {
    previousBales.value = JSON.parse(JSON.stringify(bales));
    comparisonMapName.value = name;
  }

  // ==========================================
  // 3. MODULE INITIALIZATION (The Adapter Layer)
  // ==========================================

  const createMapRef = (key) =>
    computed({
      get: () => mapData.value[key],
      set: (val) => (mapData.value[key] = val),
    });

  const stateRefs = {
    mapData,
    bales: createMapRef("bales"),
    boardEdges: createMapRef("boardEdges"),
    dcMats: createMapRef("dcMats"),
    gate: createMapRef("gate"),
    hides: createMapRef("hides"),
    measurements: createMapRef("measurements"),
    notes: createMapRef("notes"),
    startBox: createMapRef("startBox"),
    steps: createMapRef("steps"),
    tunnelBoards: createMapRef("tunnelBoards"),
    zones: createMapRef("zones"),
    masterBlinds: createMapRef("masterBlinds"),

    activeMeasurement,
    activeTool,
    baleConfig,
    classLevel,
    clipboard,
    comparisonMapName,
    currentFolderId,
    currentLayer,
    currentMapId,
    dcMatConfig,
    folders,
    gridSize,
    gridStartCorner,
    gridStep,
    isDrawingBoard,
    isShared,
    mapName,
    nextNumber,
    previousBales,
    previousClassCount,
    ringDimensions,
    savedMaps,
    selectedBaleId,
    selection,
    showMapStats,
    sport,
    trialDay,
    trialLocation,
    trialNumber,
    wallTypes,

    reset,
  };

  const historyModule = useHistory(stateRefs, () => {});

  stateRefs.snapshot = historyModule.snapshot;

  const bhLogic = useBarnHuntLogic(stateRefs, historyModule.snapshot, {
    show: showNotification,
  });
  const persistence = useMapPersistence(stateRefs, userStore, {
    show: showNotification,
  });
  const selectionLogic = useSelectionLogic(
    stateRefs,
    historyModule.snapshot,
    () => {},
  );

  function copySelection() {
    const ids = selection.value;
    if (ids.length === 0) return;

    const itemsToCopy = [];
    Object.keys(mapData.value).forEach((key) => {
      const collection = mapData.value[key];
      if (Array.isArray(collection)) {
        collection.forEach((item) => {
          if (ids.includes(item.id)) {
            itemsToCopy.push({ ...item, _type: key });
          }
        });
      }
    });

    clipboard.value = itemsToCopy;
    showNotification(`Copied ${itemsToCopy.length} items`);
  }

  function pasteSelection() {
    if (clipboard.value.length === 0) return;

    selection.value = []; // Clear selection to focus on new items

    clipboard.value.forEach((clipItem) => {
      const type = clipItem._type;
      if (!mapData.value[type]) return;

      // Clone and assign new ID
      const newItem = JSON.parse(JSON.stringify(clipItem));
      newItem.id = crypto.randomUUID();

      // Offset slightly
      if (newItem.x !== undefined) newItem.x += 1;
      if (newItem.y !== undefined) newItem.y += 1;
      if (newItem.x1 !== undefined) {
        newItem.x1 += 1;
        newItem.x2 += 1;
        newItem.y1 += 1;
        newItem.y2 += 1;
      }

      delete newItem._type;

      if (Array.isArray(mapData.value[type])) {
        mapData.value[type].push(newItem);
        selection.value.push(newItem.id);
      }
    });

    historyModule.snapshot();
  }

  function cutSelection() {
    copySelection();
    selectionLogic.deleteSelection();
  }

  function selectHide(id) {
    // Pass 'false' for isMulti to make it a single selection by default
    selectionLogic.selectObject(id, false);
  }

  // [FIX] Wrapper: Finish measurements before manual saves
  // This ensures that if a user draws a line and immediately clicks "Save",
  // we commit that line instead of losing it.
  const saveToCloud = async (isAutoSave = false, thumbnail = null) => {
    // Only force-finish on MANUAL save.
    // We don't want autosave to interrupt a user mid-drawing.
    if (!isAutoSave && stateRefs.activeMeasurement.value) {
      bhLogic.finishMeasurement();
    }
    await persistence.saveToCloud(isAutoSave, thumbnail);
  };

  const multiLayerView = ref(false);
  const layerOpacity = ref(0.4);

  // ==========================================
  // 4. EXPORTS
  // ==========================================
  return {
    mapData,

    // Legacy State (Computed Wrappers)
    bales: stateRefs.bales,
    boardEdges: stateRefs.boardEdges,
    dcMats: stateRefs.dcMats,
    gate: stateRefs.gate,
    hides: stateRefs.hides,
    measurements: stateRefs.measurements,
    notes: stateRefs.notes,
    startBox: stateRefs.startBox,
    steps: stateRefs.steps,
    tunnelBoards: stateRefs.tunnelBoards,
    zones: stateRefs.zones,
    masterBlinds: stateRefs.masterBlinds,

    activeMeasurement,
    activeTool,
    baleConfig,
    classLevel,
    clipboard,
    closeNoteEditor,
    comparisonMapName,
    copySelection,
    currentFolderId,
    currentLayer,
    currentMapId,
    cutSelection,
    dcMatConfig,
    editingNoteId,
    folders,
    gridSize,
    gridStartCorner,
    gridStep,
    isDraggingSelection,
    isDrawingBoard,
    isShared,
    layerOpacity,
    mapName,
    multiLayerView,
    nextNumber,
    notification,
    openNoteEditor,
    pasteSelection,
    previousBales,
    previousClassCount,
    realignGrid,
    reset,
    resizeRing,
    ringDimensions,
    savedMaps,
    selectedBaleId,
    selection,
    setComparisonBales,
    setTool,
    showMapStats,
    showNotification,
    sport,
    toggleAnchor,
    trialDay,
    trialLocation,
    trialNumber,
    wallTypes,
    openHideMenu,
    closeHideMenu,
    selectHide,
    activeHideMenu,
    showCustomizationModal,
    editingCustomObject,
    activeDCMatMenu,

    ...historyModule,
    ...bhLogic,
    ...persistence,
    saveToCloud,
    ...selectionLogic,
  };
});

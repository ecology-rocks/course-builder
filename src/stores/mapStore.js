import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useUserStore } from "./userStore";
// IMPORT MODULES
import { useMapPersistence } from "services/persistenceService";
import { useSelectionLogic } from "services/selectionService";
import { useHistory } from "services/historyService";
import { useMapStatistics } from "services/mapStatistics";
import { useGridLogic } from "editor/logic/useGridLogic";

// Direct imports (previously hidden in barnHuntLogic)
import { useBales } from "editor/bales/useBales";
import { useBoardEdges } from "editor/boards/useBoardEdges";
import { useDCMats } from "editor/mats/useDCMats";
import { useGates } from "editor/walls/useGates";
import { useHides } from "editor/hides/useHides";
import { useMeasurements } from "editor/annotations/useMeasurements";
import { useNotes } from "editor/annotations/useNotes";
import { useStartBox } from "editor/mats/useStartBox";
import { useSteps } from "editor/steps/useSteps";
import { useTunnelBoards } from "editor/boards/useTunnelBoards";
import { useZones } from "editor/zones/useZones";

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
  const activeDCMatMenu = ref(null);
  const activeZoneMenu = ref(null);
  // ==========================================
  // 2. ACTIONS (Internal & External)
  // ==========================================

  function showNotification(message, type = "info") {
    notification.value = { message, type };
    setTimeout(() => {
      notification.value = null;
    }, 3000);
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
    if (domainModules && domainModules.closeNoteEditor) {
      domainModules.closeNoteEditor();
    }
  }

 function realignGrid() {
    // 1. Snap Generic Items
    gridLogic.realignGeneric();

    // 2. Snap Bales (Domain Specific)
    if (domainModules && domainModules.realignBales) {
      domainModules.realignBales(); 
    }

    // 3. Snap Singulars
    gridLogic.realignSingulars();
    
    if (historyModule.snapshot) historyModule.snapshot();
    showNotification("Realigned to grid");
  }

  function setTool(tool) {
    activeTool.value = tool;
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
    activeHideMenu,
    activeDCMatMenu,
    activeZoneMenu,
    comparisonMapName,

    reset,
  };

  const historyModule = useHistory(stateRefs, () => {});
  const gridLogic = useGridLogic(stateRefs);

  stateRefs.snapshot = historyModule.snapshot;

  // NEW CODE TO ADD
  const deps = {
    snapshot: historyModule.snapshot,
    show: showNotification,
  };

  // 1. Initialize Domain Modules directly
  const domainModules = {
    ...useBales(stateRefs, deps.snapshot, deps),
    ...useBoardEdges(stateRefs, deps.snapshot),
    ...useDCMats(stateRefs, deps.snapshot),
    ...useGates(stateRefs, deps.snapshot),
    ...useHides(stateRefs, deps.snapshot),
    ...useMeasurements(stateRefs, deps.snapshot),
    ...useNotes(stateRefs, deps.snapshot),
    ...useStartBox(stateRefs, deps.snapshot),
    ...useSteps(stateRefs, deps.snapshot),
    ...useTunnelBoards(stateRefs, deps.snapshot),
    ...useZones(stateRefs, deps.snapshot),
  };

  // 2. Initialize Statistics (Logic moved from barnHuntLogic)
  const stats = useMapStatistics(stateRefs);

  const persistence = useMapPersistence(stateRefs, userStore, {
    show: showNotification,
  });

const selectionLogic = useSelectionLogic(
  stateRefs,
  historyModule.snapshot,
  // Pass the existing deps object which contains 'show'
  deps 
);


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
      domainModules.finishMeasurement();
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
    comparisonMapName,
    currentFolderId,
    currentLayer,
    currentMapId,
    dcMatConfig,
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
    previousBales,
    previousClassCount,
    realignGrid,
    reset,
    resizeRing: gridLogic.resizeRing,
    ringDimensions,
    savedMaps,
    selectedBaleId,
    selection,
    setTool,
    showMapStats,
    showNotification,
    sport,
    trialDay,
    trialLocation,
    trialNumber,
    wallTypes,
    selectHide,
    activeHideMenu,
    showCustomizationModal,
    editingCustomObject,
    activeDCMatMenu,
    activeZoneMenu,
    ...domainModules,
    ...stats,
    ...historyModule,
    ...persistence,
    saveToCloud,
    ...selectionLogic,
  };
});

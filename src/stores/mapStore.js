import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useUserStore } from "./userStore";
// IMPORT MODULES
import { useMapPersistence } from "services/persistenceService";
import { useSelectionLogic } from "services/selectionService";
import { useHistory } from "services/historyService";
import { useMapStatistics } from "services/mapStatistics";
import { useGridLogic } from "editor/logic/useGridLogic";

// Direct imports
import { useBales } from "editor/bales/useBales";
import { useBoardEdges } from "editor/boards/useBoardEdges";
import { useDCMats } from "editor/mats/useDCMats";
import { useGates } from "editor/gates/useGates";
import { useHides } from "editor/hides/useHides";
import { useMeasurements } from "editor/annotations/useMeasurements";
import { useNotes } from "editor/annotations/useNotes";
import { useStartBox } from "editor/mats/useStartBox";
import { useSteps } from "editor/steps/useSteps";
import { useTunnelBoards } from "editor/boards/useTunnelBoards";
import { useZones } from "editor/zones/useZones";
import { useCustomWalls } from "editor/walls/useCustomWalls";

const DEFAULT_MAP_DATA = {
  bales: [],
  boardEdges: [],
  hides: [],
  blinds: [],
  dcMats: [],
  steps: [],
  zones: [],
  tunnelBoards: [],
  customWalls: [],
  notes: [],
  masterBlinds: [],
  startBox: null,
  gate: null,
  measurements: [],
  tunnelPaths: [], // Ensure this exists
};

export const useMapStore = defineStore("map", () => {
  const userStore = useUserStore();

  // STATE
  const mapData = ref(JSON.parse(JSON.stringify(DEFAULT_MAP_DATA)));
  const _ringDimensions = ref({ width: 24, height: 24 });

  const ringDimensions = computed({
    get: () => _ringDimensions.value,
    set: (newVal) => {
      if (!newVal || typeof newVal !== 'object') return;
      let w = Number(newVal.width);
      let h = Number(newVal.height);
      if (isNaN(w) || w <= 0) w = 24;
      if (isNaN(h) || h <= 0) h = 24;
      _ringDimensions.value = { width: w, height: h };
    }
  });

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
  const isTunnelMode = ref(false);
  const tunnelConfig = ref({ showGuardLines: false, activePathId: null });
  const activeTunnelMenu = ref(null);

  const wallTypes = ref({ top: "fence", right: "fence", bottom: "fence", left: "fence" });
  const gridStartCorner = ref("top-left");
  const trialLocation = ref("");
  const trialDay = ref("");
  const trialNumber = ref("");
  const judgeNotes = ref("");
  const baleConfig = ref({ length: 3, width: 1.5, height: 1 });
  const dcMatConfig = ref({ width: 2, height: 3 });
  const baleColors = ref({ 1: "#e6c200", 2: "#4caf50", 3: "#2196f3" });

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
  const activeHideMenu = ref(null);
  const showCustomizationModal = ref(false);
  const editingCustomObject = ref(null);

  // Menus
  const activeDCMatMenu = ref(null);
  const activeZoneMenu = ref(null);
  const activeStepMenu = ref(null);
  const activeStartBoxMenu = ref(null);
  const activeTunnelBoxMenu = ref(null);
  const activeBaleMenu = ref(null);
  const activeNoteMenu = ref(null);
  const activeWallMenu = ref(null);
  const activeWall = ref(null);

  // ACTIONS
  function showNotification(message, type = "info") {
    notification.value = { message, type };
    setTimeout(() => { notification.value = null; }, 3000);
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
    mapData.value.tunnelPaths = [];
    isTunnelMode.value = false;
    tunnelConfig.value = { showGuardLines: false, activePathId: null };
    gridStartCorner.value = "top-left";
    baleConfig.value = { length: 3, width: 1.5, height: 1 };
    dcMatConfig.value = { width: 2, height: 3 };
    activeMeasurement.value = null;
    if (domainModules?.closeNoteEditor) domainModules.closeNoteEditor();
  }

  function initBlinds(count, generateRandoms = true) {
    const newBlinds = [];
    for (let i = 1; i <= count; i++) {
      newBlinds.push({
        id: i,
        name: `Blind ${i}`,
        randoms: generateRandoms ? Array(5).fill(0).map(() => Math.floor(Math.random() * 5) + 1) : [],
        hides: []
      });
    }
    mapData.value.blinds = newBlinds;
  }

  function realignGrid() {
    gridLogic.realignGeneric();
    if (domainModules?.realignBales) domainModules.realignBales();
    gridLogic.realignSingulars();
    if (historyModule.snapshot) historyModule.snapshot();
    showNotification("Realigned to grid");
  }

  function setTool(tool) {
    if (activeTool.value === 'measure' || activeTool.value === 'measurePath') domainModules.finishMeasurement();
    if (activeTool.value === 'wall' && stateRefs.activeWall.value) domainModules.cancelWall();
    activeTool.value = tool;
  }

  const createMapRef = (key) => computed({
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
    customWalls: createMapRef("customWalls"),
    tunnelPaths: createMapRef("tunnelPaths"),
    activeMeasurement,
    activeTool,
    activeTunnelMenu,
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
    isTunnelMode,
    tunnelConfig,
    isShared,
    judgeNotes,
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
    activeStepMenu,
    activeTunnelBoxMenu,
    activeStartBoxMenu,
    activeBaleMenu,
    activeNoteMenu,
    activeWall,
    activeWallMenu,
    reset,
  };

  const historyModule = useHistory(stateRefs, () => {});
  const gridLogic = useGridLogic(stateRefs);
  stateRefs.snapshot = historyModule.snapshot;

  const deps = { snapshot: historyModule.snapshot, show: showNotification };

  const domainModules = {
    ...useBales(stateRefs, deps.snapshot, deps),
    ...useBoardEdges(stateRefs, deps.snapshot),
    ...useDCMats(stateRefs, deps.snapshot),
    ...useGates(stateRefs, deps.snapshot),
    ...useHides(stateRefs, deps.snapshot),
    ...useMeasurements(stateRefs, deps.snapshot, deps),
    ...useNotes(stateRefs, deps.snapshot),
    ...useStartBox(stateRefs, deps.snapshot),
    ...useSteps(stateRefs, deps.snapshot),
    ...useTunnelBoards(stateRefs, deps.snapshot),
    ...useZones(stateRefs, deps.snapshot),
    ...useCustomWalls(stateRefs, deps.snapshot),
  };

  const stats = useMapStatistics(stateRefs);
  const persistence = useMapPersistence(stateRefs, userStore, { show: showNotification });

  function closeAllMenus() {
    if (activeMeasurement.value) domainModules.finishMeasurement();
    stateRefs.activeStepMenu.value = null;
    stateRefs.activeStartBoxMenu.value = null;
    stateRefs.activeTunnelBoxMenu.value = null;
    stateRefs.activeDCMatMenu.value = null;
    stateRefs.activeZoneMenu.value = null;
    stateRefs.activeNoteMenu.value = null;
    stateRefs.activeWallMenu.value = null;
    stateRefs.activeBaleMenu.value = null;
    stateRefs.activeHideMenu.value = null;
    stateRefs.activeTunnelMenu.value = null;
  }

  const selectionLogic = useSelectionLogic(stateRefs, historyModule.snapshot, deps);
  function selectHide(id) { selectionLogic.selectObject(id, false); }
  const saveToCloud = async (isAutoSave = false, thumbnail = null) => {
    if (!isAutoSave && stateRefs.activeMeasurement.value) domainModules.finishMeasurement();
    await persistence.saveToCloud(isAutoSave, thumbnail);
  };

  const multiLayerView = ref(true);
  const layerOpacity = ref(0.4);


  // src/stores/mapStore.js

// [REPLACE] the findObjectById function with this version:

 function findObjectById(id) {
    if (!id) return null

    // Helper: checks the store Ref and returns the Key as the type
    const check = (key) => {
      const val = stateRefs[key]?.value
      if (!val) return null
      
      // Handle Arrays (bales, notes, etc.)
      if (Array.isArray(val)) {
        const found = val.find(i => i.id === id)
        return found ? { item: found, type: key } : null
      }
      
      // Handle Single Objects (startBox, gate)
      if (val.id === id) return { item: val, type: key }
      return null
    }

    // Check all interactive collections
    return check('bales') ||
           check('customWalls') ||
           check('tunnelPaths') ||
           check('notes') ||
           check('dcMats') ||
           check('steps') ||
           check('zones') ||
           check('tunnelBoards') ||
           check('hides') ||
           check('startBox') ||
           check('gate')
  }


  return {
    mapData,
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
    customWalls: stateRefs.customWalls,
    
    // [CRITICAL FIX] Export this so AdvancedPrintModal can scan it
    tunnelPaths: stateRefs.tunnelPaths, 

    activeWall,
    activeWallMenu,
    activeMeasurement,
    activeTool,
    activeTunnelMenu,
    baleConfig,
    classLevel,
    comparisonMapName,
    currentFolderId,
    currentLayer,
    currentMapId,
    dcMatConfig,
    findObjectById,
    folders,
    gridSize,
    closeAllMenus,
    gridStartCorner,
    gridStep,
    initBlinds,
    isDraggingSelection,
    isDrawingBoard,
    isShared,
    isTunnelMode,
    judgeNotes,
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
    tunnelConfig,
    wallTypes,
    selectHide,
    activeHideMenu,
    showCustomizationModal,
    editingCustomObject,
    activeDCMatMenu,
    activeZoneMenu,
    activeStepMenu,
    activeTunnelBoxMenu,
    activeStartBoxMenu,
    activeBaleMenu,
    activeNoteMenu,
    baleColors,
    ...domainModules,
    ...stats,
    ...historyModule,
    ...persistence,
    saveToCloud,
    ...selectionLogic,
  };
});
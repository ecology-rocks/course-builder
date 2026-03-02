<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useMapStore } from '@/stores/mapStore'

// --- VISUAL MODULES ---
import BarnHuntLayer from '@/components/editor/BarnHuntLayer.vue'
import TunnelRenderer from '@/components/editor/tunnels/TunnelRenderer.vue'
import MapLegend from '@/components/editor/MapLegend.vue'
import { useGridSystem } from '@/components/editor/logic/useGridSystem'
import { useCanvasControls } from '@/components/editor/logic/useCanvasControls'

const route = useRoute()
const store = useMapStore()
const loading = ref(true)
const error = ref(null)
const wrapperRef = ref(null)
const stageRef = ref(null)

// Local View State
const showNotes = ref(false)
const judgeName = ref('') 

const GRID_OFFSET = 30

const { scale, stageConfig, zoom, fitToScreen } = useCanvasControls(store, wrapperRef, GRID_OFFSET)
const { getWallStroke, getGridLabelX, getGridLabelY, getXAxisY, getYAxisX, getYAxisAlign } = useGridSystem(store, scale)

onMounted(async () => {
  const mapId = route.params.id
  if (!mapId) {
    error.value = "No map ID provided."
    loading.value = false
    return
  }

  try {
    store.reset()
    
    console.log("🔍 Fetching Map:", mapId)
    const snap = await getDoc(doc(db, "maps", mapId))
    
    if (!snap.exists()) throw new Error("Map not found")
    
    const d = snap.data()
    const coreData = d.data || {}
    
    console.log("📂 Raw Map Data:", d)
    console.log("📍 Trial Info (DB):", {
        loc: coreData.trialLocation,
        day: coreData.trialDay,
        num: coreData.trialNumber
    })

    // 1. Populate Store Data
    store.mapData = coreData
    store.mapName = d.name
    store.sport = d.sport
    store.ringDimensions = coreData.dimensions || { width: 24, height: 24 }

    // [FIX] Populate missing global visual configs
    if (coreData.baleConfig) store.baleConfig = coreData.baleConfig
    if (coreData.baleColors) store.baleColors = coreData.baleColors
    if (coreData.wallTypes) store.wallTypes = coreData.wallTypes
    
    // 2. Populate Metadata (With Fallbacks)
    // We check coreData first, then root d (just in case), then empty string
    store.trialLocation = coreData.trialLocation || d.trialLocation || ''
    store.trialDay = coreData.trialDay || d.trialDay || ''
    store.trialNumber = coreData.trialNumber || d.trialNumber || ''
    store.judgeNotes = coreData.judgeNotes || d.judgeNotes || ''

    // 3. Judge Name (From Root or Data)
    judgeName.value = d.judgeName || coreData.judgeName || 'Unknown Judge'

    // 4. Legacy Custom Items support
    if (coreData.customItems && !coreData.customWalls) {
        store.mapData.customWalls = coreData.customItems
    }
    
    store.currentMapId = mapId
    loading.value = false
    
    setTimeout(() => { fitToScreen() }, 100)

  } catch (e) {
    console.error(e)
    error.value = e.message || "Could not load map."
    loading.value = false
  }
})
</script>

<template>
  <div class="viewer-container">
    
    <div v-if="loading" class="state-msg"><div class="spinner"></div>Loading Map...</div>
    <div v-else-if="error" class="state-msg error">
      <h3>⚠️ {{ error }}</h3>
      <router-link to="/dashboard" class="btn-back">Go to Dashboard</router-link>
    </div>

    <div v-else class="content">
      <div class="view-header">
        <div class="header-left">
            <div class="title-row">
                <h1>{{ store.mapName }}</h1>
            </div>
            
            <div class="meta-row">
                <span v-if="judgeName" class="meta-item" title="Judge">
                    ⚖️ Judge: {{ judgeName }}
                </span>
                <span v-if="store.trialLocation" class="meta-item" title="Location">
                    📍 Club: {{ store.trialLocation }}
                </span>
                <span v-if="store.trialDay" class="meta-item" title="Date">
                    📅 Date: {{ store.trialDay }}
                </span>
                <span v-if="store.trialNumber" class="meta-item" title="Trial #">
                    #️⃣ Trial: {{ store.trialNumber }}
                </span>
            </div>
        </div>

        <div class="controls">
            <button @click="store.showMapStats = !store.showMapStats" :class="{ active: store.showMapStats }" title="Toggle Statistics">
                📊 Stats
            </button>
            <button @click="showNotes = !showNotes" :class="{ active: showNotes }" title="Toggle Judge Notes">
                📝 Notes
            </button>

            <div class="vr desktop-only"></div>
            
            <div class="layer-pills desktop-only">
                <button @click="store.currentLayer = 1" :class="{ active: store.currentLayer === 1 }">L1</button>
                <button @click="store.currentLayer = 2" :class="{ active: store.currentLayer === 2 }">L2</button>
                <button @click="store.currentLayer = 3" :class="{ active: store.currentLayer === 3 }">L3</button>
            </div>
            
            <button @click="store.multiLayerView = !store.multiLayerView" :class="{ active: store.multiLayerView }" class="desktop-only">
                {{ store.multiLayerView ? 'Overlay ON' : 'Overlay OFF' }}
            </button>
        </div>
      </div>

      <div class="canvas-wrapper" ref="wrapperRef">
        
        <MapLegend v-if="store.showMapStats" class="overlay-box stats-pos" />

        <div v-if="showNotes" class="overlay-box notes-pos">
            <div class="overlay-header">Judge's Notes</div>
            <div class="overlay-body" v-if="store.judgeNotes">{{ store.judgeNotes }}</div>
            <div class="overlay-body empty" v-else>No notes provided.</div>
        </div>

        <div class="zoom-controls">
            <button @click="zoom(5)">+</button>
            <span class="zoom-label">{{ scale }}px</span>
            <button @click="zoom(-5)">-</button>
            <button @click="fitToScreen">Fit</button>
        </div>

        <v-stage ref="stageRef" :config="stageConfig">
          <v-layer :config="{ x: GRID_OFFSET, y: GRID_OFFSET }">
            
            <template v-for="n in store.ringDimensions.width + 1" :key="'v'+n">
                <v-line v-if="(n - 1) % store.gridStep === 0"
                :config="{ points: [(n - 1) * scale, 0, (n - 1) * scale, store.ringDimensions.height * scale], stroke: '#999', strokeWidth: 1 }" />
            </template>
            <template v-for="n in store.ringDimensions.height + 1" :key="'h'+n">
                <v-line v-if="(n - 1) % store.gridStep === 0"
                :config="{ points: [0, (n - 1) * scale, store.ringDimensions.width * scale, (n - 1) * scale], stroke: '#999', strokeWidth: 1 }" />
            </template>
            <template v-for="n in store.ringDimensions.width + 1" :key="'lx'+n">
                <v-text v-if="(n - 1) % store.gridStep === 0" :config="{
                x: (n - 1) * scale, y: getXAxisY(),
                text: getGridLabelX(n - 1),
                fontSize: 12, fill: '#666', align: 'center', width: 30, offsetX: 15
                }" />
            </template>
            <template v-for="n in store.ringDimensions.height + 1" :key="'ly'+n">
                <v-text v-if="(n - 1) % store.gridStep === 0" :config="{
                x: getYAxisX(), y: (n - 1) * scale - 6,
                text: getGridLabelY(n - 1),
                fontSize: 12, fill: '#666', align: getYAxisAlign(), width: 20
                }" />
            </template>

            <v-group>
                <v-line :config="{ points: [0, 0, store.ringDimensions.width * scale, 0], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.top), y: -getWallStroke(store.wallTypes.top) / 2 }" />
                <v-line :config="{ points: [0, store.ringDimensions.height * scale, store.ringDimensions.width * scale, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.bottom), y: getWallStroke(store.wallTypes.bottom) / 2 }" />
                <v-line :config="{ points: [0, 0, 0, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.left), x: -getWallStroke(store.wallTypes.left) / 2 }" />
                <v-line :config="{ points: [store.ringDimensions.width * scale, 0, store.ringDimensions.width * scale, store.ringDimensions.height * scale], stroke: 'black', strokeWidth: getWallStroke(store.wallTypes.right), x: getWallStroke(store.wallTypes.right) / 2 }" />
            </v-group>

            <BarnHuntLayer :scale="scale" :showHides="true" :hides="store.hides" :GRID_OFFSET="GRID_OFFSET" :locked="true" />
            <TunnelRenderer :scale="scale" :isPrinting="false" />

          </v-layer>
        </v-stage>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-container { height: 100vh; display: flex; flex-direction: column; background: #f0f0f0; }

.view-header { 
    background: white; padding: 12px 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
    display: flex; justify-content: space-between; align-items: flex-start; z-index: 10; 
    flex-wrap: wrap; gap: 10px;
}
.header-left { display: flex; flex-direction: column; gap: 4px; min-width: 200px; }

.title-row { display: flex; align-items: center; gap: 10px; }
.title-row h1 { margin: 0; font-size: 1.4rem; color: #333; }
.badge { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }

.meta-row { display: flex; gap: 10px; font-size: 0.9rem; color: #555; flex-wrap: wrap; margin-top: 4px; }
.meta-item { display: flex; align-items: center; gap: 5px; background: #f5f5f5; padding: 3px 8px; border-radius: 4px; border: 1px solid #e0e0e0; }

.controls { display: flex; gap: 8px; align-items: center; margin-top: 5px; flex-wrap: wrap; }
.vr { width: 1px; height: 24px; background: #ddd; margin: 0 5px; }

.controls button {
    border: 1px solid #ddd; background: white; padding: 6px 12px; cursor: pointer; 
    font-weight: 600; color: #555; border-radius: 4px;
}
.controls button.active { background: #e3f2fd; color: #1976d2; border-color: #1976d2; }

/* Layer Pills Group */
.layer-pills { display: flex; background: #f5f5f5; border-radius: 4px; padding: 2px; }
.layer-pills button { border: none; background: none; margin: 0; }
.layer-pills button.active { background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

.canvas-wrapper { 
    flex: 1; overflow: hidden; position: relative; 
    background: #e0e0e0; display: flex; justify-content: center; align-items: center;
}

/* --- OVERLAYS --- */
.overlay-box {
    position: absolute; right: 20px; z-index: 90;
    background: white; border-radius: 8px; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #ddd;
    overflow: hidden;
}

/* Stats Position: Top Right */
.stats-pos { top: 20px; max-width: 220px; }

/* Notes Position: Below Stats (Adjusted top to prevent overlap) */
.notes-pos { top: 260px; width: 220px; display: flex; flex-direction: column; }
.overlay-header { background: #f8f9fa; padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee; font-size: 0.9rem; }
.overlay-body { padding: 12px; font-size: 0.9rem; color: #333; line-height: 1.4; white-space: pre-wrap; }
.overlay-body.empty { color: #999; font-style: italic; }

.zoom-controls {
    position: absolute; bottom: 20px; right: 20px;
    background: white; padding: 5px; border-radius: 8px;
    display: flex; gap: 5px; align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 100;
}
.zoom-controls button {
    width: 30px; height: 30px; cursor: pointer; border: 1px solid #ddd;
    background: #f9f9f9; border-radius: 4px; display: flex; align-items: center; justify-content: center;
}

.state-msg { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #666; }
.spinner { 
    width: 30px; height: 30px; border: 3px solid #ccc; border-top-color: #2196f3; 
    border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; 
}

/* --- MOBILE RESPONSIVENESS --- */
@media (max-width: 768px) {
    .desktop-only { display: none !important; }
    
    .view-header { flex-direction: column; align-items: stretch; gap: 10px; }
    .controls { justify-content: space-between; }
    .controls button { flex: 1; text-align: center; }
    
    .overlay-box {
        position: static; 
        margin: 10px; 
        width: auto; max-width: none;
    }
    
    .stats-pos, .notes-pos {
        position: absolute; 
        right: 10px; 
        left: 10px; 
        width: auto;
    }
    .stats-pos { top: 10px; }
    /* Ensure notes don't overlap zoom controls on mobile */
    .notes-pos { top: auto; bottom: 70px; }
}
</style>
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>⚙️ Course Settings</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="settings-section" v-if="store.sport === 'barnhunt'">
        <h4>Map View Options</h4>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="checkbox" id="chkStats" v-model="store.showMapStats" style="width: auto;" />
          <p for="chkStats" class="hint">Show Map Statistics</p>
        </div>
      </div>
      <div class="settings-section" v-if="store.sport === 'barnhunt'">
        <h4>Comparison Baseline</h4>
        <p class="hint">Compare your current map against a saved map.</p>

        <div class="form-group">
          <label>Compare Against:</label>
          <div class="comparison-row">
            <select v-model="selectedMapId" @change="handleMapSelect" :disabled="loadingMaps">
              <option :value="null">-- Select a Saved Map --</option>
              <option v-for="map in userMaps" :key="map.id" :value="map.id">
                {{ map.name }}
              </option>
            </select>
          </div>
          <p class="status-text" v-if="store.comparisonMapName">
            Currently comparing vs: <strong>{{ store.comparisonMapName }}</strong>
          </p>
        </div>
      </div>
      <hr v-if="store.sport === 'barnhunt'" />

      <div class="settings-section">
        <h4>Trial Information</h4>
        <div class="form-grid">
          <div class="form-group-row">
            <div class="form-group">
              <label>Class Level</label>
              <select v-model="store.classLevel">
                <option>Novice</option>
                <option>Open</option>
                <option>Senior</option>
                <option>Master</option>
                <option>Crazy8s</option>
              </select>
            </div>
            <div class="form-group">
              <label>Club / Location</label>
              <input v-model="store.trialLocation" placeholder="e.g. Happy Dogs Club" />
            </div>
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label>Day</label>
              <input v-model="store.trialDay" placeholder="e.g. Saturday" />
            </div>
            <div class="form-group">
              <label>Trial #</label>
              <input v-model="store.trialNumber" placeholder="e.g. T1" />
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section" v-if="store.sport === 'barnhunt'">
        <h4>Bale Dimensions (ft)</h4>
        <div class="form-group-row">
          <div class="form-group">
            <label>Length</label>
            <input type="number" v-model.number="store.baleConfig.length" step="0.1" />
          </div>
          <div class="form-group">
            <label>Width (Flat)</label>
            <input type="number" v-model.number="store.baleConfig.width" step="0.1" />
          </div>
          <div class="form-group">
            <label>Height (Tall)</label>
            <input type="number" v-model.number="store.baleConfig.height" step="0.1" />
          </div>
        </div>
        <p class="hint">Standard: 3.0 x 1.5 x 1.0</p>
      </div>

      <div class="settings-section" v-if="store.sport === 'barnhunt'">
        <h4>DC Mat Dimensions (ft)</h4>
        <div class="form-group-row">
          <div class="form-group">
            <label>Width</label>
            <input type="number" v-model.number="store.dcMatConfig.width" step="0.5" />
          </div>
          <div class="form-group">
            <label>Height</label>
            <input type="number" v-model.number="store.dcMatConfig.height" step="0.5" />
          </div>
        </div>
        <p class="hint">Standard: 2.0 x 3.0</p>
      </div>



      <div class="settings-section">
        <h4>Grid Numbering Start</h4>
        <div class="corner-selector">
          <div class="row">
            <button :class="{ active: store.gridStartCorner === 'top-left' }"
              @click="store.gridStartCorner = 'top-left'">↖ TL</button>
            <button :class="{ active: store.gridStartCorner === 'top-right' }"
              @click="store.gridStartCorner = 'top-right'">TR ↗</button>
          </div>
          <div class="preview-box">Ring</div>
          <div class="row">
            <button :class="{ active: store.gridStartCorner === 'bottom-left' }"
              @click="store.gridStartCorner = 'bottom-left'">↙ BL</button>
            <button :class="{ active: store.gridStartCorner === 'bottom-right' }"
              @click="store.gridStartCorner = 'bottom-right'">BR ↘</button>
          </div>
        </div>
        <p class="hint">Current: <strong>{{ formatCorner(store.gridStartCorner) }}</strong></p>
      </div>

      <hr />

      <div class="settings-section" v-if="store.sport === 'barnhunt'">
        <h4>Wall Types</h4>
        <div class="wall-grid">
          <div class="wall-control">
            <label>Top</label>
            <select v-model="store.wallTypes.top">
              <option value="fence">Fence (4')</option>
              <option value="wall">Solid Wall</option>
            </select>
          </div>

          <div class="middle-row">
            <div class="wall-control">
              <label>Left</label>
              <select v-model="store.wallTypes.left">
                <option value="fence">Fence (4')</option>
                <option value="wall">Solid Wall</option>
              </select>
            </div>

            <div class="wall-preview-box" :style="{
              borderTop: getBorderStyle(store.wallTypes.top),
              borderRight: getBorderStyle(store.wallTypes.right),
              borderBottom: getBorderStyle(store.wallTypes.bottom),
              borderLeft: getBorderStyle(store.wallTypes.left)
            }"></div>

            <div class="wall-control">
              <label>Right</label>
              <select v-model="store.wallTypes.right">
                <option value="fence">Fence (4')</option>
                <option value="wall">Solid Wall</option>
              </select>
            </div>
          </div>

          <div class="wall-control">
            <label>Bottom</label>
            <select v-model="store.wallTypes.bottom">
              <option value="fence">Fence (4')</option>
              <option value="wall">Solid Wall</option>
            </select>
          </div>
        </div>
      </div>

      <div class="actions">
        <button @click="$emit('close')" class="btn-primary">Done</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue' // Added ref, onMounted
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()

const userMaps = ref([])
const selectedMapId = ref(null)
const loadingMaps = ref(false)

onMounted(async () => {
  if (store.sport === 'barnhunt') {
    loadingMaps.value = true
    try {
      userMaps.value = await store.loadUserMaps()
    } finally {
      loadingMaps.value = false
    }
  }
})

function handleMapSelect() {
  if (!selectedMapId.value) return

  const map = userMaps.value.find(m => m.id === selectedMapId.value)
  if (map) {
    // The structure might be map.data.bales or map.bales depending on migration
    const data = map.data || map
    const bales = data.bales || []
    store.setComparisonBales(bales, map.name)
  }
}

function getBorderStyle(type) {
  return type === 'wall' ? '4px solid #333' : '2px dashed #999'
}

function formatCorner(c) {
  if (!c) return 'Top Left'
  return c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  /* Added constraint */
  overflow-y: auto;
  /* Added scroll */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.settings-section {
  margin-bottom: 20px;
}

.settings-section h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  color: #666;
}

.hint {
  font-size: 0.8rem;
  text-align: center;
  color: #666;
  margin-top: 5px;
}

.status-text {
  font-size: 0.8rem;
  color: #2e7d32;
  margin-top: 5px;
}

/* FORMS */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: bold;
  color: #555;
  margin-bottom: 4px;
}

/* --- FIX: Added width: 100% and box-sizing --- */
.form-group input,
.form-group select {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

/* Ensure flex items can shrink below default content size */
.form-group-row {
  display: flex;
  gap: 10px;
}

.form-group-row .form-group {
  flex: 1;
  min-width: 0;
}

.comparison-row {
  display: flex;
  gap: 10px;
}

.corner-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.corner-selector .row {
  display: flex;
  gap: 60px;
}

.corner-selector button {
  width: 60px;
  padding: 5px;
  border: 1px solid #ddd;
  background: #f9f9f9;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.8rem;
}

.corner-selector button.active {
  background: #2196f3;
  color: white;
  border-color: #1565c0;
  font-weight: bold;
}

.preview-box {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: #aaa;
  font-weight: bold;
}

.wall-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.middle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wall-control {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wall-control label {
  font-size: 0.75rem;
  font-weight: bold;
  color: #555;
}

.wall-control select {
  padding: 2px;
  font-size: 0.8rem;
}

.wall-preview-box {
  width: 60px;
  height: 60px;
  background: #f5f5f5;
}

.actions {
  text-align: center;
  margin-top: 20px;
}

.btn-primary {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
</style>
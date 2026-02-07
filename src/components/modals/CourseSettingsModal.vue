<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">

      <div v-if="!isPickingMap">
        <div class="modal-header">
          <h3>⚙️ Course Settings</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="settings-section">
          <h3>Map Settings</h3>
          <h4>Ring Dimensions (ft)</h4>
          <div class="form-group-row">
            <div class="form-group">
              <label>Width</label>
              <input type="number" v-model.number="localWidth" @change="applyResize" step="1" min="10" />
            </div>
            <div class="form-group">
              <label>Height</label>
              <input type="number" v-model.number="localHeight" @change="applyResize" step="1" min="10" />
            </div>
          </div>
          <p class="hint">Instinct: 15x20-20x20; Novice & Open: 20x20-20x24; Senior: 20x24-24x32; Master & Crazy 8s:
            24x24-24x32</p>
        </div>

        <div class="settings-section">
          <h4>Starter Bale Dimensions (inches)<span class="info-icon"
              title="To ensure perfect alignment on the 2nd-inch grid and prevent gaps, dimensions must be even numbers.">?</span>
          </h4>

          <div class="form-group-row">
            <div class="form-group">
              <label>Length</label>
              <input type="number" v-model.lazy="baleLength" step="2" />
            </div>
            <div class="form-group">
              <label>Width (Flat)</label>
              <input type="number" v-model.lazy="baleWidth" step="2" />
            </div>
            <div class="form-group">
              <label>Height (Tall)</label>
              <input type="number" v-model.lazy="baleHeight" step="2" />
            </div>
          </div>
          <p class="hint">
            Standard 2-String: ~36" x 18" x 14" <br />
            Standard 3-String: ~44" x 22" x 16"
          </p>
        </div>
        <div class="settings-section">
          <h4>Bale Colors By Layer</h4>
          <div class="form-group-row">
            <div class="form-group">
              <label>Layer 1</label>
              <div class="color-input-wrapper">
                <input type="color" v-model="store.baleColors[1]" />
              </div>
            </div>
            <div class="form-group">
              <label>Layer 2</label>
              <div class="color-input-wrapper">
                <input type="color" v-model="store.baleColors[2]" />
              </div>
            </div>
            <div class="form-group">
              <label>Layer 3</label>
              <div class="color-input-wrapper">
                <input type="color" v-model="store.baleColors[3]" />
              </div>
            </div>
          </div>
        </div>
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
                <label>Date</label>
                <input v-model="store.trialDay" placeholder="e.g. Thurs Jan 15, 2026" />
              </div>
              <div class="form-group">
                <label>Trial #</label>
                <input v-model="store.trialNumber" placeholder="e.g. T1" />
              </div>
            </div>
          </div>
        </div>

        <hr />

        <h3>Statistics</h3>
        <div class="settings-section">
          <h4>Map View Options</h4>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="checkbox" id="chkStats" v-model="store.showMapStats" style="width: auto;" />
            <p for="chkStats" class="hint">Show Map Statistics Overlay Box</p>
          </div>
        </div>

        <div class="settings-section">
          <h4>Comparison Baseline</h4>
          <div class="form-group">
            <label>Compare Against A Saved Map:</label>
            <div class="comparison-row">
              <div class="map-display-box">
                <span v-if="store.comparisonMapName"><strong>{{ store.comparisonMapName }}</strong></span>
                <span v-else class="placeholder">No map selected</span>
              </div>

              <button @click="openMapPicker" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">
                {{ store.comparisonMapName ? 'Change' : 'Select Map' }}
              </button>

              <button v-if="store.comparisonMapName" @click="handleClearComparison" class="btn-clear"
                title="Remove Comparison">
                Clear
              </button>
            </div>
          </div>
        </div>

        <hr />

        <div class="settings-section">
          <h3>Perimeter Settings</h3>
          <div class="perimeter-row">
            <div class="settings-leftcol">
              <h4>Grid Numbering Start</h4>
              <div class="corner-selector">
                <div class="row">
                  <button :class="{ active: store.gridStartCorner === 'top-left' }"
                    @click="store.gridStartCorner = 'top-left'">↖ TL</button>
                  <button :class="{ active: store.gridStartCorner === 'top-right' }"
                    @click="store.gridStartCorner = 'top-right'">TR ↗</button>
                </div>
                <div class="wall-preview-box" style="border: dashed; border-color: #999; border-width: 2px"></div>
                <div class="row">
                  <button :class="{ active: store.gridStartCorner === 'bottom-left' }"
                    @click="store.gridStartCorner = 'bottom-left'">↙ BL</button>
                  <button :class="{ active: store.gridStartCorner === 'bottom-right' }"
                    @click="store.gridStartCorner = 'bottom-right'">BR ↘</button>
                </div>
              </div>
              <p class="hint">Current: <strong>{{ formatCorner(store.gridStartCorner) }}</strong></p>
            </div>

            <div class="settings-rightcol">
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
          </div>
        </div>

        <div class="actions">
          <button @click="$emit('close')" class="btn-primary">Done</button>
        </div>
      </div>
      <div v-else class="picker-view">
        <div class="modal-header">
          <h3>📂 Select Map</h3>
          <button class="close-btn" @click="isPickingMap = false">Back</button>
        </div>

        <div class="picker-search">
          <input v-model="searchQuery" placeholder="Search maps by name..." autofocus />
        </div>

        <ul class="picker-list">
          <li v-for="map in filteredMaps" :key="map.id" @click="selectComparisonMap(map)">
            <span class="map-name">{{ map.name }}</span>
            <span class="map-date">{{ new Date(map.updatedAt.seconds * 1000).toLocaleDateString() }}</span>
          </li>
          <li v-if="filteredMaps.length === 0" class="empty-msg">No maps found.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()

const userMaps = ref([])
const selectedMapId = ref(null)
const loadingMaps = ref(false)
const isPickingMap = ref(false)
const searchQuery = ref('')

// Local state for Ring Dimensions
const localWidth = ref(store.ringDimensions.width)
const localHeight = ref(store.ringDimensions.height)

// We use a small rounding check to keep the UI clean (e.g. 1.5ft -> 18in, not 17.999in)
const baleLength = computed({
  get: () => parseFloat((store.baleConfig.length * 12).toFixed(2)),
  set: (val) => {
    // Ensure input is an even number before converting to feet for the store
    const evenVal = Math.round(val / 2) * 2;
    store.baleConfig.length = evenVal / 12;
  }
})

const baleWidth = computed({
  get: () => parseFloat((store.baleConfig.width * 12).toFixed(2)),
  set: (val) => {
    const evenVal = Math.round(val / 2) * 2;
    store.baleConfig.width = evenVal / 12;
  }
})

const baleHeight = computed({
  get: () => parseFloat((store.baleConfig.height * 12).toFixed(2)),
  set: (val) => {
    const evenVal = Math.round(val / 2) * 2;
    store.baleConfig.height = evenVal / 12;
  }
})

const filteredMaps = computed(() => {
  if (!searchQuery.value) return userMaps.value
  const lower = searchQuery.value.toLowerCase()
  return userMaps.value.filter(m => m.name.toLowerCase().includes(lower))
})

onMounted(async () => {
  loadingMaps.value = true
  try {
    userMaps.value = await store.loadUserMaps()
  } finally {
    loadingMaps.value = false
  }
})

function openMapPicker() {
  searchQuery.value = '' // Reset search
  isPickingMap.value = true
}

function selectComparisonMap(map) {
  selectedMapId.value = map.id
  handleMapSelect() // Reuses your existing logic
  isPickingMap.value = false // Close picker
}

function applyResize() {
  store.resizeRing(localWidth.value, localHeight.value)
}

function handleMapSelect() {
  if (!selectedMapId.value) return
  const map = userMaps.value.find(m => m.id === selectedMapId.value)
  if (map) {
    const data = map.data || map
    const bales = data.bales || []
    store.setComparisonBales(bales, map.name)
  }
}

function handleClearComparison() {
  store.setComparisonBales([], null)
  selectedMapId.value = null
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
.perimeter-row {
  display: flex;
  justify-content: space-around;
  /* Spreads them out evenly */
  align-items: flex-start;
  /* Aligns tops of both columns */
  gap: 20px;
  /* Adds space between the columns */
  margin-top: 10px;
}

/* Ensure columns center their internal content */
.settings-leftcol,
.settings-rightcol {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

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
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
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

.form-group input,
.form-group select {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

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
  align-items: center;
}

.comparison-row select {
  flex: 1;
  min-width: 0;
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

.btn-clear {
  background: #ef5350;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.8rem;
  white-space: nowrap;
}

.btn-clear:hover {
  background: #d32f2f;
}

/* --- MAP PICKER STYLES --- */
.map-display-box {
  flex: 1;
  padding: 8px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.map-display-box .placeholder {
  color: #888;
  font-style: italic;
}

.picker-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

.picker-search input {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  margin-bottom: 10px;
  border: 2px solid #eee;
  border-radius: 4px;
  box-sizing: border-box;
}

.picker-search input:focus {
  border-color: #2196f3;
  outline: none;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  border: 1px solid #eee;
  border-radius: 4px;
}

.picker-list li {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.picker-list li:hover {
  background: #e3f2fd;
}

.picker-list li .map-name {
  font-weight: bold;
  color: #333;
}

.picker-list li .map-date {
  color: #888;
  font-size: 0.8rem;
}

.empty-msg {
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
}

/* src/components/modals/CourseSettingsModal.vue */

.info-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  background: #eee;
  color: #666;
  border-radius: 50%;
  text-align: center;
  font-size: 11px;
  line-height: 16px;
  cursor: help;
  margin-left: 4px;
  font-weight: bold;
}

.info-icon:hover {
  background: #2196f3;
  color: white;
}
</style>
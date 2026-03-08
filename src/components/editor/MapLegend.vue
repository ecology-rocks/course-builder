<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()

const inventory = computed(() => store.inventory)
const diffs = computed(() => store.differentials)
const comparisonName = computed(() => store.comparisonMapName)

// Drag logic
const position = ref({ x: window.innerWidth - 240, y: 80 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const SIDEBAR_WIDTH = 300

onMounted(() => {
  const saved = localStorage.getItem('mapLegendPosition')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      position.value.x = Math.max(SIDEBAR_WIDTH, Math.min(parsed.x, window.innerWidth - 220))
      position.value.y = Math.max(0, parsed.y)
    } catch (e) {}
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
})

const startDrag = (e) => {
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  isDragging.value = true
  dragOffset.value = {
    x: clientX - position.value.x,
    y: clientY - position.value.y
  }
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  if (e.touches) e.preventDefault() 

  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  const newX = clientX - dragOffset.value.x
  const newY = clientY - dragOffset.value.y

  position.value = {
    x: Math.max(SIDEBAR_WIDTH, Math.min(newX, window.innerWidth - 200)),
    y: Math.max(0, newY)
  }
}

const stopDrag = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
  localStorage.setItem('mapLegendPosition', JSON.stringify(position.value))
}
</script>

<template>
  <div class="map-stats-card" :style="{ left: position.x + 'px', top: position.y + 'px', right: 'auto', position: 'fixed' }">
    <div class="card-header" @mousedown.stop="startDrag" @touchstart.stop="startDrag" :class="{ dragging: isDragging }">
      <h3>Map Statistics</h3>
      <span class="drag-icon">⋮⋮</span>
    </div>
    
    <div class="card-body">
      <div class="stat-row">
        <span class="label">Total Bales:</span>
        <span class="value">{{ inventory.total }}</span>
      </div>
      <div class="stat-row layer-1">
        <span class="label">Layer 1:</span>
        <span class="value">{{ inventory.base }}</span>
      </div>
      <div class="stat-row layer-2">
        <span class="label">Layer 2:</span>
        <span class="value">{{ inventory.layer2 }}</span>
      </div>
      <div class="stat-row layer-3">
        <span class="label">Layer 3:</span>
        <span class="value">{{ inventory.layer3 }}</span>
      </div>

      <div v-if="diffs" class="diff-section">
        <div class="divider"></div>
        <div class="diff-header">
          <span>Changes vs.</span>
          <span class="comp-name" :title="comparisonName">{{ comparisonName || 'Unknown' }}</span>
        </div>

        <div class="stat-row">
          <span class="label">L1:</span>
          <span class="value">{{ diffs[1].net > 0 ? '+' : ''}}{{ diffs[1].net }} <small v-if="diffs[1].moved">({{ diffs[1].moved }} moved)</small></span>
        </div>
        <div class="stat-row">
          <span class="label">L2:</span>
          <span class="value">{{ diffs[2].net > 0 ? '+' : ''}}{{ diffs[2].net }} <small v-if="diffs[2].moved">({{ diffs[2].moved }} moved)</small></span>
        </div>
        <div class="stat-row">
          <span class="label">L3:</span>
          <span class="value">{{ diffs[3].net > 0 ? '+' : ''}}{{ diffs[3].net }} <small v-if="diffs[3].moved">({{ diffs[3].moved }} moved)</small></span>
        </div>

        <div class="divider"></div>
        <div class="stat-row total-diff">
          <span class="label">TOTAL:</span>
          <span class="value">{{ diffs.totalNet > 0 ? '+' : ''}}{{ diffs.totalNet }} Bales</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-stats-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  width: 200px;
  font-family: 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.card-header {
  background: #f8f9fa;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  cursor: grab;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.card-header.dragging {
  cursor: grabbing;
}

.drag-icon {
  color: #aaa;
  font-size: 16px;
  line-height: 1;
}

h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #2c3e50;
}

.card-body {
  padding: 12px 15px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  font-weight: 600;
}

.layer-1 .value { color: #f57c00; }
.layer-2 .value { color: #2e7d32; }
.layer-3 .value { color: #1565c0; }

.diff-section {
  margin-top: 8px;
}

.divider {
  height: 1px;
  background: #eee;
  margin: 8px 0;
}

.diff-header {
  margin-bottom: 8px;
  font-size: 11px;
  color: #888;
  display: flex;
  flex-direction: column;
}

.comp-name {
  font-style: italic;
  color: #d32f2f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

.total-diff {
  margin-top: 2px;
  font-size: 13px;
}

.total-diff .value {
  color: #000;
  font-weight: 800;
}

small {
  font-size: 0.85em;
  color: #999;
  font-weight: normal;
}
</style>
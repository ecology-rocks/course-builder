<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>🧱 Wall Settings</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <p class="intro">Select the boundary type for each side of the ring.</p>

      <div class="wall-grid">
        <div class="wall-control top">
          <label>Top</label>
          <select v-model="store.wallTypes.top">
            <option value="fence">Fence (4')</option>
            <option value="wall">Solid Wall</option>
          </select>
        </div>

        <div class="middle-row">
          <div class="wall-control left">
            <label>Left</label>
            <select v-model="store.wallTypes.left">
              <option value="fence">Fence (4')</option>
              <option value="wall">Solid Wall</option>
            </select>
          </div>

          <div class="ring-preview">
            <div class="preview-box" 
              :style="{
                borderTop: getBorderStyle(store.wallTypes.top),
                borderRight: getBorderStyle(store.wallTypes.right),
                borderBottom: getBorderStyle(store.wallTypes.bottom),
                borderLeft: getBorderStyle(store.wallTypes.left)
              }"
            >
              <span>Ring</span>
            </div>
          </div>

          <div class="wall-control right">
            <label>Right</label>
            <select v-model="store.wallTypes.right">
              <option value="fence">Fence (4')</option>
              <option value="wall">Solid Wall</option>
            </select>
          </div>
        </div>

        <div class="wall-control bottom">
          <label>Bottom</label>
          <select v-model="store.wallTypes.bottom">
            <option value="fence">Fence (4')</option>
            <option value="wall">Solid Wall</option>
          </select>
        </div>
      </div>

      <div class="actions">
        <button @click="$emit('close')" class="btn-primary">Done</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMapStore } from '@/stores/mapStore'
const store = useMapStore()

function getBorderStyle(type) {
  return type === 'wall' ? '4px solid #333' : '2px dashed #999'
}
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000; }
.modal { background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.intro { font-size: 0.9rem; color: #666; margin-bottom: 20px; text-align: center; }

.wall-grid { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 20px; }
.middle-row { display: flex; align-items: center; gap: 20px; width: 100%; justify-content: center; }

.wall-control { display: flex; flex-direction: column; align-items: center; }
.wall-control label { font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; color: #555; }
.wall-control select { padding: 4px; border: 1px solid #ddd; border-radius: 4px; }

.ring-preview { flex: 1; display: flex; justify-content: center; }
.preview-box { width: 80px; height: 80px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #aaa; }

.actions { text-align: center; }
.btn-primary { background: #2196f3; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:hover { background: #1976d2; }
</style>
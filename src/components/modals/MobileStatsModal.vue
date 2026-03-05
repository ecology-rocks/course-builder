<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>📊 Course Statistics</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <div class="modal-body">
        <div class="stats-card">
          <h4>Bale Inventory</h4>
          <div class="stat-row">
            <span>Total Bales:</span>
            <strong>{{ store.inventory.total }}</strong>
          </div>
          <div class="stat-row sub-stat">
            <span>Layer 1 (Base):</span>
            <span>{{ store.inventory.base }}</span>
          </div>
          <div class="stat-row sub-stat">
            <span>Layer 2:</span>
            <span>{{ store.inventory.layer2 }}</span>
          </div>
          <div class="stat-row sub-stat">
            <span>Layer 3:</span>
            <span>{{ store.inventory.layer3 }}</span>
          </div>
        </div>

        <div v-if="store.differentials" class="stats-card comparison-card">
          <h4>Changes from "{{ store.comparisonMapName }}"</h4>
          <div class="stat-row">
            <span>Net Change:</span>
            <strong :class="store.differentials.totalNet > 0 ? 'text-green' : (store.differentials.totalNet < 0 ? 'text-red' : '')">
              {{ store.differentials.totalNet > 0 ? '+' : '' }}{{ store.differentials.totalNet }} Bales
            </strong>
          </div>
          <div class="stat-list">
            <div v-for="layer in [1, 2, 3]" :key="layer" class="stat-row sub-stat">
              <span>Layer {{ layer }}:</span>
              <span>
                {{ store.differentials[layer].net > 0 ? '+' : '' }}{{ store.differentials[layer].net }} 
                <span class="moved-text" v-if="store.differentials[layer].moved > 0">
                  ({{ store.differentials[layer].moved }} moved)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()
defineEmits(['close'])
</script>

<style scoped>
.modal-overlay { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0, 0, 0, 0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 3000; 
}
.modal-content { 
  background: white; padding: 24px; border-top-left-radius: 16px; border-top-right-radius: 16px; 
  width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 -10px 25px rgba(0,0,0,0.2); 
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #333; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; }

.stats-card {
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.stats-card h4 {
  margin: 0 0 12px 0;
  color: #555;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 4px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 1rem;
}
.sub-stat {
  font-size: 0.9rem;
  color: #666;
  padding-left: 12px;
}

.comparison-card {
  background: #fff3e0;
  border-color: #ffe0b2;
}

.text-green { color: #2e7d32; }
.text-red { color: #c62828; }
.moved-text { font-size: 0.8rem; color: #888; font-style: italic; }
</style>
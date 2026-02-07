<script setup>
import { useMapStore } from '@/stores/mapStore'

const props = defineProps({
  hideId: String,
  x: Number,
  y: Number
})

const emit = defineEmits(['close'])
const store = useMapStore()

const types = [
  { label: 'Rat', value: 'rat', color: '#ef5350' },
  { label: 'Litter', value: 'litter', color: '#ffee58' },
  { label: 'Empty', value: 'empty', color: '#fff' }
]

const elevations = [
  { label: 'Regular', value: 'regular_over', dash: [4, 3] },
  { label: 'Under', value: 'under', dash: [4, 3] }
]

function setType(type) {
  store.updateHide(props.hideId, { type })
  emit('close')
}

function setElevation(elevation) {
  store.updateHide(props.hideId, { elevation })
  emit('close')
}
function setNumber(num) {
  store.updateHide(props.hideId, { number: num })
  emit('close')
}

function deleteHide() {
  store.removeHide(props.hideId)
  emit('close')
}

// Add to <script setup>
function openCustomizer() {
  // This assumes your store has a method to track which object is being edited
  store.editingCustomObject = props.hideId
  store.showCustomizationModal = true
  emit('close')
}
</script>

<template>
  <div class="hide-context-menu" :style="{ top: y + 'px', left: x + 'px' }">
    <div class="menu-header">Hide Menu</div>

    <div class="section-label">Actions</div>
    <div class="action-stack">
      <button @click="openCustomizer" class="action-btn customize">🎨 Customize Style</button>
      <button @click="deleteHide" class="action-btn delete">🗑️ Delete Hide</button>
    </div>
  
    <div class="section-label">Type</div>
    <div class="type-row">
      <button v-for="t in types" :key="t.value" @click="setType(t.value)"
        :style="{ borderLeft: `4px solid ${t.color}` }">
        {{ t.label }}
      </button>
    </div>

    <div class="section-label">Elevation</div>
    <div class="type-row">
      <button v-for="e in elevations" :key="e.value" @click="setElevation(e.value)" :style="{ dash: `${e.dash}` }">
        {{ e.label }}
      </button>
    </div>

    <div class="section-label">Hide Number</div>
    <div class="number-grid">
      <button v-for="n in 8" :key="n" @click="setNumber(n)">{{ n }}</button>
      <button class="clear-btn" @click="setNumber(null)">Clear</button>
    </div>
  </div>
</template>

<style scoped>
/* src/components/editor/hides/HideContextMenu.vue */

.action-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-btn {
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 11px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.action-btn:hover {
  filter: brightness(0.95);
}

.action-btn.customize {
  border-color: #00a1ff;
  color: #007acc;
  background: #f0f7ff;
}

.action-btn.delete {
  border-color: #ffcdd2;
  color: #d32f2f;
  background: #ffebee;
}

/* Add to <style scoped> */
.custom-btn {
  background: #f0f7ff;
  border: 1px solid #00a1ff;
  color: #007acc;
  font-weight: bold;
  border-radius: 4px;
}

.custom-btn:hover {
  background: #e1efff;
}

.hide-context-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  width: 160px;
}

.menu-header {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  color: #999;
  margin: 8px 0 4px;
}

.type-row button {
  width: 100%;
  text-align: left;
  margin-bottom: 4px;
  padding: 4px 8px;
  cursor: pointer;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.number-grid button {
  padding: 4px;
  cursor: pointer;
}

.clear-btn {
  grid-column: span 4;
  margin-top: 4px;
  font-size: 11px;
}
</style>
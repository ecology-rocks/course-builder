<script setup>
import { useMapStore } from '@/stores/mapStore'
import { computed } from 'vue'

const props = defineProps({
  baleId: String,
  x: Number,
  y: Number
})

const emit = defineEmits(['close'])
const store = useMapStore()

const currentBale = computed(() => store.bales.find(b => b.id === props.baleId))
const isAnchor = computed(() => currentBale.value?.isAnchor || false)
const canToggleAnchor = computed(() => {
  const b = store.bales.find(i => i.id === props.baleId)
  if (!b) return false
  
  // Rule 1: Must be Layer 1
  if (store.currentLayer !== 1) return false
  
  // Rule 2: Must be Flat
  if (b.orientation !== 'flat') return false
  
  // Rule 3: Must be Rectilinear (0, 90, 180, 270)
  const rot = Math.abs(b.rotation) % 90
  if (rot !== 0) return false
  
  return true
})

function rotate(amt) {
  store.rotateBale(props.baleId, amt)
  emit('close')
}

// [FIX] Use store action to handle multi-selection support
function setOrientation(type) {
  store.setBaleOrientation(props.baleId, type)
  emit('close')
}

// [FIX] 'cycleLean' was unused; removed it. 
// The template buttons call store.setLean directly, which is correct.

function toggleAnchor() {
  // [FIX] Pass baleId so it works even if the bale isn't currently selected
  store.toggleAnchor(props.baleId) 
  emit('close')
}

function openCustomizer() {
  store.editingCustomObject = props.baleId
  store.showCustomizationModal = true
  emit('close')
}

function deleteBale() {
  // [FIX] Use generic removeObject if available, or keep specific removeBale
  store.removeBale(props.baleId)
  emit('close')
}
</script>

<template>
  <div class="bale-context-menu" :style="{ top: y + 'px', left: x + 'px' }">
    <div class="menu-header">Bale Menu</div>

    <div class="section-label">Actions</div>
    <div class="action-stack">
      <button @click="openCustomizer" class="action-btn customize">🎨 Customize Style</button>
      <button @click="deleteBale" class="action-btn delete">🗑️ Delete Bale</button>
      <button 
         @click="toggleAnchor" 
         class="action-btn"
         :disabled="!canToggleAnchor"
         :title="!canToggleAnchor ? 'Anchors must be Flat, Rectilinear, and on Layer 1' : ''"
       >
         ⚓ Toggle Anchor
       </button>
    </div>
  
    <div class="section-label">Orientation</div>
    <div class="type-row">
      <button 
        v-for="ot in ['flat', 'tall', 'pillar']" 
        :key="ot" 
        @click="setOrientation(ot)"
        :disabled="isAnchor"
        :class="{ disabled: isAnchor }"
      >
        {{ ot.charAt(0).toUpperCase() + ot.slice(1) }}
      </button>
    </div>

    <div class="section-label">Lean</div>
    <div class="type-row">
      <button @click="store.setLean(baleId, 'left')" :disabled="isAnchor">Left</button>
      <button @click="store.setLean(baleId, 'right')" :disabled="isAnchor">Right</button>
      <button @click="store.setLean(baleId, null)" :disabled="isAnchor">None</button>
    </div>

    <div class="section-label">Rotate</div>
    <div class="number-grid">
      <button @click="rotate(90)">90°</button>
      <button @click="rotate(-90)">-90°</button>
    </div>
  </div>
</template>

<style scoped>
.bale-context-menu {
  position: fixed;
  z-index: 3000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  width: 160px;
}
.menu-header { font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #666; }
.section-label { font-size: 10px; text-transform: uppercase; color: #999; margin: 8px 0 4px; }
.action-stack { display: flex; flex-direction: column; gap: 4px; }
.action-btn { width: 100%; text-align: left; padding: 6px 8px; cursor: pointer; font-size: 11px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; }
.type-row button { width: 100%; text-align: left; margin-bottom: 4px; padding: 4px 8px; cursor: pointer; }
.number-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
.number-grid button { padding: 4px; cursor: pointer; font-size: 11px; }
.delete { color: #d32f2f; background: #ffebee; border-color: #ffcdd2; }
</style>
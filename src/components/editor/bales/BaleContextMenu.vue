<script setup>
import { useMapStore } from '@/stores/mapStore'
import { computed, ref } from 'vue'
import { useMenuPosition } from '@/services/menuPositionService'

// MapEditor passes both 'id' (via v-bind) and 'baleId' (explicitly). 
// We use 'id' to match the store object structure.
const props = defineProps({
  id: String, 
  x: Number,
  y: Number
})

const emit = defineEmits(['close'])
const store = useMapStore()
const menuRef = ref(null)

// 1. Setup Positioning
const menuState = computed(() => store.activeBaleMenu)
const { style } = useMenuPosition(menuState, menuRef)

// 2. Computed Logic
const currentBale = computed(() => store.bales.find(b => b.id === props.id))
const isAnchor = computed(() => currentBale.value?.isAnchor || false)

const canToggleAnchor = computed(() => {
  const b = currentBale.value
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

// 3. Actions (Using EXISTING store methods only)
function rotate(amt) {
  store.rotateBale(props.id, amt)
  // Don't close menu on rotate, users often click multiple times
}

function setOrientation(type) {
  store.setBaleOrientation(props.id, type)
  emit('close')
}

function toggleAnchor() {
  store.toggleAnchor(props.id)
  emit('close')
}

function deleteBale() {
  store.removeBale(props.id)
  emit('close')
}

function openCustomizer() {
  store.editingCustomObject = props.id
  store.showCustomizationModal = true
  emit('close')
}
</script>

<template>
  <div ref="menuRef" class="bale-context-menu" :style="style">
    <div class="menu-header">Bale Options</div>

    <div class="action-stack">
      <button @click="openCustomizer" class="action-btn customize">🎨 Customize Style</button>
      <button @click="deleteBale" class="action-btn delete">🗑️ Delete Bale</button>
      <button 
         @click="toggleAnchor" 
         class="action-btn"
         :disabled="!canToggleAnchor"
         :title="!canToggleAnchor ? 'Anchors must be Flat, Rectilinear, and on Layer 1' : ''"
       >
         {{ isAnchor ? '⚓ Remove Anchor' : '⚓ Make Anchor' }}
       </button>
    </div>
  
    <div class="menu-divider"></div>

    <div class="section-label">Orientation</div>
    <div class="type-row">
      <button 
        @click="setOrientation('flat')" 
        :class="{ active: currentBale?.orientation === 'flat' }"
        :disabled="isAnchor"
      >Flat</button>
      <button 
        @click="setOrientation('tall')" 
        :class="{ active: currentBale?.orientation === 'tall' }"
        :disabled="isAnchor"
      >Tall</button>
      <button 
        @click="setOrientation('pillar')" 
        :class="{ active: currentBale?.orientation === 'pillar' }"
        :disabled="isAnchor"
      >Pillar</button>
    </div>

    <div class="section-label">Lean</div>
    <div class="type-row">
      <button @click="store.setLean(id, 'left')" :disabled="isAnchor">Left</button>
      <button @click="store.setLean(id, 'right')" :disabled="isAnchor">Right</button>
      <button @click="store.setLean(id, null)" :disabled="isAnchor">None</button>
    </div>

    <div class="section-label">Rotate</div>
    <div class="number-grid">
      <button @click="rotate(45)">45°</button>
      <button @click="rotate(90)">90°</button>
    </div>
  </div>
</template>

<style scoped>
.bale-context-menu {
  /* Position is controlled by :style binding (fixed, top, left) */
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  width: 170px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-header { 
  font-weight: bold; 
  margin-bottom: 4px; 
  font-size: 12px; 
  color: #666; 
  text-transform: uppercase;
}

.menu-divider {
  height: 1px;
  background: #eee;
  margin: 4px 0;
}

.section-label { 
  font-size: 10px; 
  text-transform: uppercase; 
  color: #999; 
  margin: 6px 0 2px; 
  font-weight: 600;
}

.action-stack { display: flex; flex-direction: column; gap: 4px; }

.action-btn { 
  width: 100%; 
  text-align: left; 
  padding: 6px 8px; 
  cursor: pointer; 
  font-size: 11px; 
  background: #f5f5f5; 
  border: 1px solid #ddd; 
  border-radius: 4px; 
  transition: background 0.1s;
}

.action-btn:hover:not(:disabled) { background: #eee; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.delete { color: #d32f2f; background: #ffebee; border-color: #ffcdd2; }
.delete:hover { background: #ffcdd2; }

.type-row { display: flex; gap: 4px; }

.type-row button { 
  flex: 1; 
  text-align: center; 
  padding: 4px 2px; 
  cursor: pointer; 
  font-size: 11px;
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 3px;
}

.type-row button:hover:not(:disabled) { background: #e0e0e0; }
.type-row button.active { background: #e3f2fd; color: #1976d2; border-color: #90caf9; font-weight: bold; }

.number-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
.number-grid button { 
  padding: 6px; 
  cursor: pointer; 
  font-size: 11px;
  background: #f9f9f9; 
  border: 1px solid #eee;
  border-radius: 3px;
}
.number-grid button:hover { background: #e0e0e0; }
</style>
<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()

// Identify the single selected object type and data
const selectionContext = computed(() => {
  if (store.selection.length !== 1) return null
  const id = store.selection[0]
  
  const bale = store.bales.find(b => b.id === id)
  if (bale) return { type: 'bale', data: bale }
  
  const hide = store.hides.find(h => h.id === id)
  if (hide) return { type: 'hide', data: hide }

  const tunnel = store.tunnelBoards.find(t => t.id === id)
  if (tunnel) return { type: 'tunnel', data: tunnel }

  const mat = store.dcMats.find(m => m.id === id)
  if (mat) return { type: 'mat', data: mat }

  const step = store.steps.find(s => s.id === id)
  if (step) return { type: 'step', data: step }

  const zone = store.zones.find(z => z.id === id)
  if (zone) return { type: 'zone', data: zone }

  if (store.startBox && store.startBox.id === id) return { type: 'startBox', data: store.startBox }

  return { type: 'unknown', data: null }
})

// Helpers for Template Readability
const isBale = computed(() => selectionContext.value?.type === 'bale')
const isHide = computed(() => selectionContext.value?.type === 'hide')
const isTunnel = computed(() => selectionContext.value?.type === 'tunnel')
const isMat = computed(() => selectionContext.value?.type === 'mat')
const isStep = computed(() => selectionContext.value?.type === 'step')
const isZone = computed(() => selectionContext.value?.type === 'zone')
const isStartBox = computed(() => selectionContext.value?.type === 'startBox')

// Anchor Logic (Ported from BaleContextMenu)
const canToggleAnchor = computed(() => {
  if (!isBale.value) return false
  const b = selectionContext.value.data

  
  // Rule 2: Must be Flat
  if (b.orientation === 'pillar') return false
  
  // Rule 3: Must be Rectilinear
  const rot = Math.abs(b.rotation) % 90
  if (rot !== 0) return false
  
  return true
})

// Actions
function openCustomizer() {
  if (store.selection.length === 1) {
    store.editingCustomObject = store.selection[0]
    store.showCustomizationModal = true
  }
}

// Hide Helpers
const hideTypes = [
  { label: 'Rat', value: 'rat', color: '#ef5350' },
  { label: 'Litter', value: 'litter', color: '#ffee58' },
  { label: 'Empty', value: 'empty', color: '#fff' }
]
</script>

<template>
  <Transition name="slide-up">
    <div v-if="store.selection.length > 0" class="selection-bar">
      
      <span class="sel-count">{{ store.selection.length }} Selected</span>

      <button v-if="store.selection.length === 1" @click="openCustomizer" title="Customize Style">
        🎨
      </button>

      <div class="divider"></div>

      <template v-if="store.selection.length > 1">
        <button @click="store.rotateSelection()">🔄 Rotate Group</button>
      </template>

      <template v-else-if="selectionContext">
        
        <div v-if="isBale" class="context-group">
          <div class="btn-group">
            <button 
              v-for="ot in ['flat', 'tall', 'pillar']" 
              :key="ot" 
              @click="store.setBaleOrientation(selectionContext.data.id, ot)"
              :class="{ active: selectionContext.data.orientation === ot }"
              :disabled="selectionContext.data.isAnchor"
              :title="ot.charAt(0).toUpperCase() + ot.slice(1)"
            >
              {{ ot.charAt(0).toUpperCase() }}
            </button>
          </div>

          <div class="btn-group">
            <button @click="store.setLean(selectionContext.data.id, 'left')" title="Lean Left" :disabled="selectionContext.data.isAnchor">↖️</button>
            <button @click="store.setLean(selectionContext.data.id, null)" title="No Lean" :disabled="selectionContext.data.isAnchor">⏺</button>
            <button @click="store.setLean(selectionContext.data.id, 'right')" title="Lean Right" :disabled="selectionContext.data.isAnchor">↗️</button>
          </div>

          <button 
            @click="store.toggleAnchor(selectionContext.data.id)"
            :disabled="!canToggleAnchor"
            :class="{ active: selectionContext.data.isAnchor }"
            title="Toggle Anchor (Must be Flat/Tall and Rectilinear)"
          >
            ⚓
          </button>

          <button @click="store.rotateBale(selectionContext.data.id)" title="Rotate 15°">🔄</button>
        </div>

        <div v-if="isTunnel" class="context-group">
          <button @click="store.rotateTunnelBoard(selectionContext.data.id)">🔄 Rotate 45°</button>
        </div>

        <div v-if="isHide" class="context-group">
           <div class="btn-group">
             <button 
               v-for="t in hideTypes" 
               :key="t.value" 
               @click="store.updateHide(selectionContext.data.id, { type: t.value })"
               class="color-btn"
               :style="{ borderBottom: selectionContext.data.type === t.value ? `3px solid ${t.color}` : '3px solid transparent' }"
               :title="t.label"
             >
               <span class="color-dot" :style="{ background: t.color }"></span>
             </button>
           </div>

           <div class="btn-group">
             <button @click="store.updateHide(selectionContext.data.id, { elevation: 'regular_over' })" :class="{ active: selectionContext.data.elevation === 'regular_over' }">Reg</button>
             <button @click="store.updateHide(selectionContext.data.id, { elevation: 'under' })" :class="{ active: selectionContext.data.elevation === 'under' }">Und</button>
           </div>

           <div class="number-input-wrapper">
             <span>#</span>
             <input 
               type="number" 
               min="1" 
               max="8" 
               :value="selectionContext.data.number" 
               @input="e => store.updateHide(selectionContext.data.id, { number: parseInt(e.target.value) || null })"
               placeholder="-"
             />
           </div>
        </div>

        <div v-if="isMat" class="context-group">
          <button @click="store.rotateDCMat(selectionContext.data.id)">🔄 Rotate</button>
        </div>

        <div v-if="isStartBox" class="context-group">
          <button @click="store.rotateStartBox()">🔄 Rotate</button>
        </div>

        <div v-if="isStep" class="context-group">
          <button @click="store.rotateStep(selectionContext.data.id)">🔄 Rotate 15°</button>
        </div>

        <div v-if="isZone" class="context-group">
          <button @click="store.rotateZone(selectionContext.data.id)">🔄 Rotate</button>
        </div>

      </template>

      <div class="divider"></div>

      <button @click="store.clearSelection()" title="Clear Selection">Deselect</button>
      <button @click="store.deleteSelection()" class="btn-delete">🗑️</button>
    </div>
  </Transition>
</template>

<style scoped>
.selection-bar {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 8px 15px;
  border-radius: 30px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  border: 1px solid #ddd;
  max-width: 90vw;
  overflow-x: auto;
}

.sel-count {
  font-weight: bold;
  color: #555;
  font-size: 0.9rem;
  padding-right: 5px;
  white-space: nowrap;
}

.selection-bar button {
  background: #f5f5f5;
  border: 1px solid transparent;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.selection-bar button:hover {
  background: #e3f2fd;
  color: #1565c0;
}

.selection-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #eee;
  color: #aaa;
}

.selection-bar button.active {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1565c0;
}

.btn-delete {
  background: #ffebee !important;
  color: #c62828 !important;
}

.btn-delete:hover {
  background: #ffcdd2 !important;
}

.context-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-group {
  display: flex;
  background: #f5f5f5;
  border-radius: 20px;
  padding: 2px;
  border: 1px solid #eee;
}

.btn-group button {
  border-radius: 18px;
  padding: 4px 10px;
  background: transparent;
  font-size: 0.8rem;
  margin: 0;
}

.btn-group button:hover {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.btn-group button.active {
  background: white;
  color: #1565c0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  font-weight: bold;
}

/* Specific Hide Styles */
.color-btn {
  padding: 4px 8px !important;
}
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.1);
}

.number-input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 20px;
  gap: 4px;
}

.number-input-wrapper span {
  font-size: 0.8rem;
  font-weight: bold;
  color: #666;
}

.number-input-wrapper input {
  width: 30px;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  text-align: center;
  font-weight: bold;
  color: #333;
}
.number-input-wrapper input:focus {
  outline: none;
}

.divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 20px);
  opacity: 0;
}
</style>
<script setup>
import { computed } from 'vue' 
import { useMapStore } from '@/stores/mapStore'
import { useBlindManager } from './logic/useBlindManager'
import { useUserStore } from '@/stores/userStore'


const emit = defineEmits(['close', 'print', 'save', 'exit-request'])
const store = useMapStore()
const userStore = useUserStore()

const { 
  activeBlindIndex, 
  activeTool, 
  activeBlind, 
  currentDisplayHides, 
  handleCanvasClick, 
  copyFromPrevious,
  addNewBlind,
  removeBlind 
} = useBlindManager(store)

defineExpose({ currentDisplayHides, handleCanvasClick })

// Find the currently selected hide within our active blind
const selectedHide = computed(() => {
  if (store.selection.length !== 1) return null
  const id = store.selection[0]
  return activeBlind.value?.hides.find(h => h.id === id)
})

function updateNumber(num) {
  if (!selectedHide.value) return

  // Unique check: If we are assigning a real number (not clearing it)
  if (num !== null) {
    // Find any OTHER hide that already has this number
    const duplicate = activeBlind.value.hides.find(h => 
      h.id !== selectedHide.value.id && h.number === num
    )
    
    // If found, clear its number to enforce uniqueness
    if (duplicate) {
      duplicate.number = null
    }
  }

  // Now safe to assign
  selectedHide.value.number = num
}

function toggleElevation() {
  if (!selectedHide.value) return
  // Toggle between 'under' (dashed) and 'regular_over' (solid)
  selectedHide.value.elevation = selectedHide.value.elevation === 'under' ? 'regular_over' : 'under'
}

function deleteSelected() {
  if (selectedHide.value) {
    const idx = activeBlind.value.hides.indexOf(selectedHide.value)
    if (idx > -1) activeBlind.value.hides.splice(idx, 1)
    store.clearSelection()
  }
}

function handleCloseAttempt() {
    emit('exit-request')
}
</script>

<template>
  <div class="blind-manager-overlay">
    <div class="blind-sidebar">
      <div class="sidebar-header">
        <h3>Blind Manager</h3>
        <button class="close-icon" @click="handleCloseAttempt">×</button>
      </div>

      <div class="blind-list">
        <div 
          v-for="(blind, idx) in store.mapData.blinds" 
          :key="blind.id"
          class="blind-item"
          :class="{ active: idx === activeBlindIndex }"
          @click="activeBlindIndex = idx"
        >
          <div class="blind-info">
            <span class="name">{{ blind.name }}</span>
            <span class="randoms" v-if="blind.randoms.length">{{ blind.randoms.join('-') }}</span>
          </div>
          <span class="count-badge" :class="{ 'has-hides': blind.hides.length > 0 }">
            {{ blind.hides.length }}
          </span>

          <button 
            class="btn-remove-blind" 
            @click.stop="removeBlind(idx)" 
            title="Delete Blind"
          >×</button>
        </div>
        
        <button class="btn-add-blind" @click="addNewBlind">+ Add Blind</button>
      </div>

      <div class="controls">
        
        <div v-if="selectedHide" class="properties-panel">
          <div class="panel-header">
            <strong>Edit {{ selectedHide.type === 'rat' ? 'Rat' : 'Hide' }}</strong>
            <button class="btn-done" @click="store.clearSelection()">Done</button>
          </div>
          
          <div class="property-group">
            <button 
              class="btn-elevation" 
              :class="{ 'is-under': selectedHide.elevation === 'under' }"
              @click="toggleElevation"
            >
              {{ selectedHide.elevation === 'under' ? 'Position: Under (Dashed)' : 'Position: Floor (Solid)' }}
            </button>
          </div>

          <div class="number-grid">
            <button 
              v-for="n in 10" :key="n"
              :class="{ active: selectedHide.number === n }"
              @click="updateNumber(n)"
            >
              {{ n }}
            </button>
            <button @click="updateNumber(null)" class="btn-clear">Null</button>
          </div>

          <button class="btn-delete" @click="deleteSelected">🗑️ Delete Hide</button>
        </div>

        <div v-else class="tool-group">
          <label>Tools</label>
          <div class="tool-row">
            <button :class="{ active: activeTool === 'select' }" @click="activeTool = 'select'" title="Select / Move">↖</button>
            <button :class="{ active: activeTool === 'rat' }" @click="activeTool = 'rat'" title="Place Rat">🐀</button>
            <button :class="{ active: activeTool === 'litter' }" @click="activeTool = 'litter'" title="Place Litter">🍂</button>
            <button :class="{ active: activeTool === 'empty' }" @click="activeTool = 'empty'" title="Place Empty">⚪</button>
            <button :class="{ active: activeTool === 'eraser' }" @click="activeTool = 'eraser'" title="Eraser">❌</button>
          </div>
          
          <button v-if="activeBlindIndex > 0" class="btn-secondary" @click="copyFromPrevious">
            Copy from Previous Blind
          </button>
        </div>

        <div class="actions">
          <button class="btn-save" @click="$emit('save')">
        <span v-if="userStore.isPro">💾 Save & Return</span>
        <span v-else>✅ Return (In-Memory)</span>
      </button>
          <button type="button" class="btn-print" @click.prevent="emit('print')">🖨️ Print Batch</button>
        </div>
      </div>
    </div>
    
    <div class="top-status">
      Editing: <strong>{{ activeBlind?.name }}</strong>
    </div>
  </div>
</template>

<style scoped>
.blind-manager-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50; display: flex; }
.blind-sidebar { width: 280px; background: white; pointer-events: auto; display: flex; flex-direction: column; border-right: 1px solid #ddd; box-shadow: 2px 0 10px rgba(0,0,0,0.1); height: 100%; }
.sidebar-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; }
.close-icon { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; }
.blind-list { flex: 1; overflow-y: auto; padding: 10px; }

.blind-item { position: relative; padding: 10px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; padding-right: 25px; }
.blind-item:hover { background: #f5f5f5; }
.blind-item.active { background: #e3f2fd; border-color: #2196f3; }
.blind-info { display: flex; flex-direction: column; }
.blind-info .name { font-weight: bold; font-size: 14px; }
.blind-info .randoms { font-size: 11px; color: #666; font-family: monospace; }
.count-badge { background: #eee; color: #999; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.count-badge.has-hides { background: #4caf50; color: white; }
.controls { padding: 15px; border-top: 1px solid #ddd; background: #fff; display: flex; flex-direction: column; gap: 12px; }
.tool-group label { font-size: 11px; text-transform: uppercase; color: #999; display: block; margin-bottom: 5px; }
.tool-row { display: flex; gap: 5px; margin-bottom: 10px; }
.tool-row button { flex: 1; padding: 8px; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; font-size: 18px; }
.tool-row button.active { background: #333; border-color: #333; color: white; }
.btn-secondary { background: #fff; border: 1px solid #ccc; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 12px; color: #555; width: 100%; }
.actions { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.btn-print { background: #2196f3; color: white; border: none; padding: 12px; border-radius: 4px; font-weight: bold; cursor: pointer; width: 100%; }
.btn-save { background: #4caf50; color: white; border: none; padding: 12px; border-radius: 4px; font-weight: bold; cursor: pointer; width: 100%; }
.btn-save:hover { background: #43a047; }
.top-status { position: absolute; top: 20px; left: 300px; background: rgba(255,255,255,0.9); padding: 8px 16px; border-radius: 20px; border: 1px solid #ccc; font-size: 14px; color: #333; pointer-events: none; }

.properties-panel { background: #f0f4f8; padding: 10px; border-radius: 6px; border: 1px solid #d1d9e6; }
.panel-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; align-items: center; }
.number-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 10px; }
.number-grid button { padding: 6px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 3px; font-weight: bold; font-size: 12px; }
.number-grid button.active { background: #2196f3; color: white; border-color: #1976d2; }
.number-grid .btn-clear { grid-column: span 5; font-weight: normal; font-size: 11px; }
.btn-delete { width: 100%; background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-delete:hover { background: #ffcdd2; }

.btn-add-blind {
  width: 100%;
  padding: 8px;
  background: #f1f3f4;
  border: 1px dashed #ccc;
  color: #5f6368;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 8px;
  font-size: 13px;
}
.btn-add-blind:hover {
  background: #e8eaed;
  border-color: #999;
  color: #333;
}

.btn-remove-blind {
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.btn-remove-blind:hover {
  color: #f44336;
}

.property-group {
  margin-bottom: 10px;
}
.btn-elevation {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-elevation:hover {
  background: #f5f5f5;
  border-color: #bbb;
}
.btn-elevation.is-under {
  background: #e0f7fa;
  color: #006064;
  border-color: #00acc1;
  border-style: dashed;
}

/* [NEW STYLES FOR DONE BUTTON] */
.btn-done {
  background: #2196f3;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
}
.btn-done:hover {
  background: #1976d2;
}
</style>
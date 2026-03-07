<script setup>
import { computed, ref, watch, onMounted } from 'vue' 
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { useBlindManager } from './logic/useBlindManager'
import FluffIcon from '@/assets/icons/fluff-icon.svg?component' 

const emit = defineEmits(['close', 'print', 'save', 'exit-request'])
const store = useMapStore()
const userStore = useUserStore()

const { 
  activeBlindIndex, 
  activeTool, 
  activeBlind, 
  copyFromPrevious,
  addNewBlind,
  removeBlind,
  regenerateRandoms 
} = useBlindManager(store)

const showList = ref(true)
const showRandoms = ref(true)

// [NEW] Share our active index with the global store so the map knows what to draw
watch(activeBlindIndex, (idx) => { store.activeBlindIndex = idx }, { immediate: true })

onMounted(() => {
    if (!store.mapData.blinds || store.mapData.blinds.length === 0) {
    addNewBlind()
  }
  activeTool.value = 'rat'
  store.setTool('rat')
})

// Keep tools perfectly synced
watch(activeTool, (newVal) => { store.setTool(newVal) })
watch(() => store.activeTool, (newVal) => { activeTool.value = newVal })

const selectedHide = computed(() => {
  if (store.selection.length !== 1) return null
  const id = store.selection[0]
  return activeBlind.value?.hides.find(h => h.id === id) || store.mapData.hides.find(h => h.id === id && h.type === 'fluff')
})

function updateNumber(num) {
  if (!selectedHide.value) return
  if (num !== null) {
    const duplicate = activeBlind.value.hides.find(h => h.id !== selectedHide.value.id && h.number === num)
    if (duplicate) duplicate.number = null
  }
  selectedHide.value.number = num
}

function toggleElevation() {
  if (!selectedHide.value) return
  selectedHide.value.elevation = selectedHide.value.elevation === 'under' ? 'regular_over' : 'under'
}

function openCustomizer() {
  if (store.selection.length === 1) {
    store.editingCustomObject = store.selection[0]
    store.showCustomizationModal = true
  }
}

function deleteSelected() {
  if (selectedHide.value) {
    if (selectedHide.value.type === 'fluff') {
      const idx = store.mapData.hides.findIndex(h => h.id === selectedHide.value.id)
      if (idx > -1) store.mapData.hides.splice(idx, 1)
    } else {
      const newHides = [...activeBlind.value.hides]
      const idx = newHides.findIndex(h => h.id === selectedHide.value.id)
      if (idx > -1) {
          newHides.splice(idx, 1)
          activeBlind.value.hides = newHides
      }
    }
    store.clearSelection()
  }
}

function handleExit() {
  store.isBlindMode = false
  store.setTool('select')
  emit('close')
}
</script>

<template>
  <div class="mobile-blind-manager">
    <div class="top-bar">
      <span>
        <strong>{{ activeBlind?.name || 'Blind Manager' }}</strong>
      </span>
      <button class="btn-done" @click="handleExit">Done</button>
    </div>

    <div class="bottom-sheet" :class="{ expanded: showList }">
      <div class="sheet-handle" @click="showList = !showList">
        <div class="handle-bar"></div>
      </div>
      
      <div v-if="selectedHide" class="properties-panel mb-2">
        <div class="panel-header mb-2">
          <strong>Edit {{ selectedHide.type === 'rat' ? 'Rat' : selectedHide.type === 'fluff' ? 'Fluff' : 'Hide' }}</strong>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button class="icon-btn" @click="openCustomizer" title="Customize Style">🎨</button>
            <button class="btn-clear text-blue" @click="store.clearSelection()">Deselect</button>
          </div>
        </div>
        
        <button class="btn-elevation mb-2" :class="{ 'is-under': selectedHide.elevation === 'under' }" @click="toggleElevation">
          {{ selectedHide.elevation === 'under' ? 'Position: Under (Dashed)' : 'Position: Floor (Solid)' }}
        </button>

        <div class="number-grid mb-2">
          <button v-for="n in 10" :key="n" :class="{ active: selectedHide.number === n }" @click="updateNumber(n)">
            {{ n }}
          </button>
          <button @click="updateNumber(null)" class="btn-clear-num">Null</button>
        </div>
        
        <button class="btn-delete" @click="deleteSelected">🗑️ Delete Hide</button>
      </div>

      <div v-else class="tool-group mb-2">
        <div class="tool-row">
          <button :class="{ active: activeTool === 'select' }" @click="activeTool = 'select'">↖</button>
          <button :class="{ active: activeTool === 'rat' }" @click="activeTool = 'rat'">🐀</button>
          <button :class="{ active: activeTool === 'litter' }" @click="activeTool = 'litter'">🍂</button>
          <button :class="{ active: activeTool === 'empty' }" @click="activeTool = 'empty'">⚪</button>
          <button :class="{ active: activeTool === 'fluff' }" @click="activeTool = 'fluff'" title="Place Fluff"><FluffIcon class="tool-icon"/></button>
          <button :class="{ active: activeTool === 'eraser' }" @click="activeTool = 'eraser'">❌</button>
        </div>
      </div>

      <div v-if="showList" class="expanded-content">
        <label class="checkbox-row mb-2">
          <input type="checkbox" v-model="showRandoms"> Show Randoms
        </label>
        
        <div class="blind-list mb-2">
          <div v-for="(blind, idx) in store.mapData.blinds" :key="blind.id" 
               class="blind-item" :class="{ active: idx === activeBlindIndex }" @click="activeBlindIndex = idx">
            <div class="blind-info">
              <span class="name">{{ blind.name }}</span>
              <span class="randoms" v-if="showRandoms && blind.randoms.length">{{ blind.randoms.join('-') }}</span>
            </div>
            <div class="blind-actions">
              <span class="count-badge" :class="{ 'has-hides': blind.hides.length > 0 }">{{ blind.hides.length }}</span>
              <button class="icon-btn" @click.stop="regenerateRandoms(idx)">🎲</button>
              <button class="icon-btn text-danger" @click.stop="removeBlind(idx)">×</button>
            </div>
          </div>
        </div>

        <button class="btn-secondary mb-2" @click="addNewBlind">+ Add Blind</button>
        <button v-if="activeBlindIndex > 0" class="btn-secondary mb-2" @click="copyFromPrevious">Copy from Previous</button>

        <div class="action-row">
          <button class="btn-print" @click="emit('print', { showRandoms })">🖨️ Print Batch</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-blind-manager {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.top-bar {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ccc;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.btn-done {
  background: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
}

.bottom-sheet {
  pointer-events: auto;
  background: white;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  padding: 0 16px 20px;
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 16px 0 10px;
  cursor: pointer;
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
}

.mb-2 { margin-bottom: 10px; }

.tool-row {
  display: flex;
  gap: 5px;
}
.tool-row button {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 8px;
  font-size: 1.2rem;
}
.tool-row button.active {
  background: #e3f2fd;
  border-color: #2196f3;
}

.expanded-content {
  max-height: 45vh;
  overflow-y: auto;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.blind-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #eee;
  margin-bottom: 5px;
  border-radius: 8px;
  background: #fafafa;
}
.blind-item.active {
  border-color: #2196f3;
  background: #f0f9ff;
}
.blind-info { display: flex; flex-direction: column; }
.name { font-weight: bold; }
.randoms { font-size: 0.8rem; color: #666; font-family: monospace; }
.blind-actions { display: flex; align-items: center; gap: 8px; }

.count-badge {
  background: #eee; color: #999; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;
}
.count-badge.has-hides { background: #4caf50; color: white; }
.icon-btn { background: none; border: none; font-size: 1.2rem; }
.text-danger { color: #f44336; }

.btn-secondary { width: 100%; padding: 10px; background: #f1f3f4; border: 1px solid #ccc; border-radius: 8px; font-weight: bold; }
.btn-print { width: 100%; padding: 12px; background: #2196f3; color: white; border: none; border-radius: 8px; font-weight: bold; }

.panel-header { display: flex; justify-content: space-between; align-items: center; }
.text-blue { background: none; border: none; color: #2196f3; font-weight: bold; text-decoration: underline; }

.btn-elevation {
  width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc; background: white; font-weight: 500;
}
.btn-elevation.is-under { background: #e0f7fa; color: #006064; border-style: dashed; }

.number-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.number-grid button { padding: 8px; border: 1px solid #ccc; background: white; border-radius: 4px; font-weight: bold; }
.number-grid button.active { background: #2196f3; color: white; border-color: #1976d2; }
.btn-clear-num { grid-column: span 5; }

.btn-delete { width: 100%; padding: 10px; background: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2; border-radius: 8px; font-weight: bold; }
.tool-icon {
  /* 1em makes it exactly the same height as the text */
  width: 25px; 
  height: 25px;
  stroke-width: 3px;
  vertical-align: -0.125em;

}
</style>
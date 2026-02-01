<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const store = useMapStore()

// Move this logic here since it's only used by this bar
const isSingleBaleSelected = computed(() => {
  if (store.selection.length !== 1) return null
  return store.bales.find(b => b.id === store.selection[0]) || null
})
</script>

<template>
  <Transition name="slide-up">
    <div v-if="store.selection.length > 0" class="selection-bar">
      <span class="sel-count">{{ store.selection.length }} Selected</span>

      <button v-if="store.selection.length > 1" @click="store.rotateSelection()">🔄 Rotate Group</button>

      <div v-if="isSingleBaleSelected" class="context-group">
        <div class="divider"></div>
        <button @click="store.cycleOrientation(isSingleBaleSelected.id)" title="Toggle Orientation">
          🔀 Orientation
        </button>
        <button @click="store.cycleLean(isSingleBaleSelected.id)" title="Toggle Lean">
          ↗️ Lean
        </button>
        <div class="divider"></div>
      </div>

      <button v-if="store.currentLayer === 1 && isSingleBaleSelected" @click="store.toggleAnchor()"
        title="Mark Anchor Bale">
        ⚓ Anchor
      </button>
      <button v-if="isSingleBaleSelected" @click="store.rotateBale(isSingleBaleSelected.id)" title="Rotate Item">
        🔄Rotate
      </button>
      <div class="divider"></div>

      <button @click="store.clearSelection()" title="Clear Selection">Deselect</button>
      <button @click="store.deleteSelection()" class="btn-delete">🗑️ Delete</button>
    </div>
  </Transition>
</template>

<style scoped>
/* Move all .selection-bar related styles here */
/* FLOATING BAR (Updated) */
.selection-bar {
  position: fixed;
  bottom: 30px;
  left: calc(50% + 150px);
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
}

.sel-count {
  font-weight: bold;
  color: #555;
  font-size: 0.9rem;
  padding-right: 5px;
}

.selection-bar button {
  background: #f5f5f5;
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  color: #333;
}

.selection-bar button:hover {
  background: #e3f2fd;
  color: #1565c0;
}

.btn-delete {
  background: #ffebee !important;
  color: #c62828 !important;
}

.btn-delete:hover {
  background: #ffcdd2 !important;
}

/* Removed .btn-close style as it's no longer used */

.context-group {
  display: flex;
  /* Forces children into a row */
  align-items: center;
  /* Vertically centers them */
  gap: 8px;
  /* Adds space between buttons */
}

.divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
  /* Optional: Adds a little breathing room around the line */
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
// src/components/editor/gates/GateContextMenu.vue
<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useMenuPosition } from '@/services/menuPositionService'

const props = defineProps({
  id: String, 
  x: Number,
  y: Number
})

const emit = defineEmits(['close'])
const store = useMapStore()
const menuRef = ref(null)

const menuState = computed(() => store.activeGateMenu)
const { style } = useMenuPosition(menuState, menuRef)

const currentWidth = computed(() => store.gate?.width || 3)

function setWidth(width) {
  if (store.gate) {
    store.setGate({ ...store.gate, width })
  }
}
</script>

<template>
  <div ref="menuRef" class="gate-context-menu" :style="style">
    <div class="menu-header">Gate Options</div>
    <div class="menu-divider"></div>

    <div class="section-label">Width (Feet)</div>
    <div class="type-row">
        
      <button 
        @click="setWidth(3)" 
        :class="{ active: currentWidth === 3 }"
      >3'</button>
      <button 
        @click="setWidth(4)" 
        :class="{ active: currentWidth === 4 }"
      >4'</button>
      <button 
        @click="setWidth(5)" 
        :class="{ active: currentWidth === 5 }"
      >5'</button>
    </div>
  </div>
</template>

<style scoped>
.gate-context-menu {
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  width: 150px;
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

.type-row button:hover { background: #e0e0e0; }
.type-row button.active { background: #e3f2fd; color: #1976d2; border-color: #90caf9; font-weight: bold; }
</style>
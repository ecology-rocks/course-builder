<script setup>
import { useMapStore } from '@/stores/mapStore'

const props = defineProps({
  stepId: String,
  x: Number,
  y: Number
})

const emit = defineEmits(['close'])
const store = useMapStore()

function deleteStep() {
  store.removeStep(props.stepId)
  emit('close')
}

function rotateStep() {
  store.rotateStep(props.stepId)
  emit('close')
}

function openCustomizer() {
  store.editingCustomObject = props.stepId
  store.showCustomizationModal = true
  emit('close')
}
</script>

<template>
  <div class="context-menu" :style="{ top: y + 'px', left: x + 'px' }">
    <div class="menu-header">Step Options</div>
    
    <div class="action-stack">
      <button @click="openCustomizer" class="action-btn customize">🎨 Customize Style</button>
      <button @click="rotateStep" class="action-btn rotate">🔄 Rotate +15°</button>
      <button @click="deleteStep" class="action-btn delete">🗑️ Delete Step</button>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 12px;
  width: 150px;
}
.menu-header { font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #666; }
.action-stack { display: flex; flex-direction: column; gap: 4px; }
.action-btn { 
  width: 100%; text-align: left; padding: 6px 8px; cursor: pointer; 
  font-size: 11px; border-radius: 4px; border: 1px solid #ddd;
}
.action-btn.customize { border-color: #2b9e57; color: #186435; background: #eefff3; }
.action-btn.rotate { border-color: #00a1ff; color: #007acc; background: #ddeaf8; }
.action-btn.delete { border-color: #ffcdd2; color: #d32f2f; background: #ffebee; }
</style>
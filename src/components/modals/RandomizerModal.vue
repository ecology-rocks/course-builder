<script setup>
import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
const store = useMapStore()
const blindCount = ref(5)

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>Master Blind Randomizer</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="randomizer-controls">
        <label>Number of Blinds:</label>
        <input type="number" v-model.number="blindCount" min="1" max="20" class="small-input">
        <button @click="store.generateMasterBlinds(blindCount)" class="btn-primary">Generate</button>
      </div>
      <p class="small-note">ℹ️ These numbers will be printed on a <strong>separate, confidential page</strong> when you click Print.</p>
      <div v-if="store.masterBlinds.length > 0" class="results-list">
        <div v-for="(blind, index) in store.masterBlinds" :key="index" class="blind-row">
          <strong>Blind {{ index + 1 }}:</strong>
          <span class="numbers">{{ blind.join(' - ') }}</span>
        </div>
      </div>
      <div v-else class="empty-state">No blinds generated yet.</div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; padding: 20px; border-radius: 8px; min-width: 350px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.randomizer-controls { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
.small-input { width: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.btn-primary { background-color: #4CAF50; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px; }
.results-list { max-height: 300px; overflow-y: auto; }
.blind-row { display: flex; justify-content: space-between; padding: 10px; background: #f9f9f9; margin-bottom: 5px; border-radius: 4px; }
.numbers { font-family: monospace; font-size: 1.2em; color: #673ab7; font-weight: bold; }
.small-note { font-size: 0.85em; color: #666; margin-bottom: 15px; background: #e3f2fd; padding: 8px; border-radius: 4px; }
.empty-state { text-align: center; color: #888; padding: 20px; }
</style>
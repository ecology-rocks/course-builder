<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'start'])

const config = ref({
  numBlinds: 5,
  generateRandoms: true,
})

function handleStart() {
  emit('start', {
    numBlinds: config.value.numBlinds,
    generateRandoms: config.value.generateRandoms
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Blind / Tournament Setup</h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>
      
      <div class="form-group">
        <label>Number of Blinds/Groups</label>
        <input type="number" v-model.number="config.numBlinds" min="1" max="50">
        <p class="hint">How many different variations do you need?</p>
      </div>

      <div class="checkbox-row">
        <input type="checkbox" v-model="config.generateRandoms">
        <span>Generate Master Random Numbers (1-5)</span>
      </div>

      <div class="actions">
        <button @click="handleStart" class="btn-primary">Start Blind Manager</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5); z-index: 2000;
  display: flex; justify-content: center; align-items: center;
}
.modal-content {
  background: white; padding: 25px; border-radius: 8px;
  width: 90%; max-width: 400px;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;
}
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
.form-group input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.hint { font-size: 12px; color: #666; margin-top: 4px; }
.checkbox-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 25px;
  background: #f9f9f9; padding: 10px; border-radius: 4px;
}
.actions { display: flex; justify-content: flex-end; }
.btn-primary {
  background: #2196f3; color: white; border: none; padding: 10px 20px;
  border-radius: 4px; cursor: pointer; font-weight: bold;
}
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; }
</style>
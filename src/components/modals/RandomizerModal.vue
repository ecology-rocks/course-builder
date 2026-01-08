<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close'])

// Inputs
const numTrials = ref(2)
const numBlinds = ref(5)

// State
const generatedData = ref([])

function close() {
  emit('close')
}

function generate() {
  generatedData.value = []
  
  for (let t = 1; t <= numTrials.value; t++) {
    const trial = { id: t, blinds: [] }
    
    for (let b = 1; b <= numBlinds.value; b++) {
      // Generate 5 numbers, each randomly 1-5 (With Replacement)
      const numbers = []
      for (let i = 0; i < 5; i++) {
        numbers.push(Math.floor(Math.random() * 5) + 1)
      }
      
      trial.blinds.push(numbers)
    }
    
    generatedData.value.push(trial)
  }
}

function printResults() {
  if (generatedData.value.length === 0) return

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups to print.")
    return
  }

  const htmlContent = `
    <html>
    <head>
      <title>Master Blind Randomizer</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
        .trial-block { margin-bottom: 30px; page-break-inside: avoid; }
        .trial-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #333; margin-bottom: 10px; padding-bottom: 5px; }
        .blind-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 14px; }
        .blind-label { font-weight: bold; }
        .blind-numbers { font-family: monospace; font-size: 16px; font-weight: bold; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Master Randomizer Output</h1>
      ${generatedData.value.map(trial => `
        <div class="trial-block">
          <div class="trial-title">Trial ${trial.id}</div>
          ${trial.blinds.map((nums, idx) => `
            <div class="blind-row">
              <span class="blind-label">Blind ${idx + 1}</span>
              <span class="blind-numbers">${nums.join(' - ')}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
      <script>
        window.onload = () => { window.print(); }
      <\/script>
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
</script>

<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>Master Blind Randomizer</h3>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="config-section">
        <div class="form-row">
          <label>Trials:</label>
          <input type="number" v-model.number="numTrials" min="1" max="10" />
        </div>
        <div class="form-row">
          <label>Blinds / Trial:</label>
          <input type="number" v-model.number="numBlinds" min="1" max="20" />
        </div>
        
        <button @click="generate" class="btn-primary">Generate</button>
      </div>

      <div class="results-area" v-if="generatedData.length > 0">
        <div v-for="trial in generatedData" :key="trial.id" class="trial-preview">
          <h4>Trial {{ trial.id }}</h4>
          <ul>
            <li v-for="(nums, idx) in trial.blinds" :key="idx">
              <span>Blind {{ idx + 1 }}:</span>
              <strong>{{ nums.join(' - ') }}</strong>
            </li>
          </ul>
        </div>
      </div>
      
      <div v-else class="empty-state">
        Click Generate to create random sets.
      </div>

      <div class="footer-actions" v-if="generatedData.length > 0">
        <button @click="printResults" class="btn-print">🖨️ Print Randoms</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0,0,0,0.5); 
  display: flex; align-items: center; justify-content: center; 
  z-index: 100; 
}
.modal { 
  background: white; padding: 20px; border-radius: 8px; 
  width: 400px; max-height: 85vh; 
  display: flex; flex-direction: column; 
}
.modal-header { 
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;
}
.close-btn { 
  background: none; border: none; font-size: 1.5rem; cursor: pointer; 
}

.config-section {
  background: #f5f5f5; padding: 15px; border-radius: 6px;
  display: flex; flex-direction: column; gap: 10px;
  margin-bottom: 15px;
}
.form-row {
  display: flex; justify-content: space-between; align-items: center;
}
.form-row input {
  width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;
}

.results-area {
  flex: 1; overflow-y: auto; 
  border: 1px solid #eee; border-radius: 4px; padding: 10px;
  margin-bottom: 15px; background: #fafafa;
}
.trial-preview { margin-bottom: 15px; }
.trial-preview h4 { margin: 0 0 5px 0; color: #555; border-bottom: 1px solid #ddd; }
.trial-preview ul { list-style: none; padding: 0; margin: 0; }
.trial-preview li { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9rem; }
.trial-preview li strong { color: #2196F3; letter-spacing: 1px; }

.empty-state { text-align: center; color: #999; padding: 30px; font-style: italic; }

.btn-primary { 
  background: #2196f3; color: white; border: none; padding: 8px; 
  border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 5px;
}
.btn-primary:hover { background: #1976d2; }

.footer-actions { border-top: 1px solid #eee; padding-top: 15px; }
.btn-print { 
  width: 100%; background: #4CAF50; color: white; border: none; 
  padding: 10px; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: bold;
}
.btn-print:hover { background: #388E3C; }
</style>
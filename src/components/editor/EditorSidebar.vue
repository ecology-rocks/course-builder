<script setup>
import { useMapStore } from '../../stores/mapStore'
import { useUserStore } from '../../stores/userStore'
import { useRouter } from 'vue-router'
import AuthForm from '../auth/AuthForm.vue' // <--- 1. Import AuthForm

// --- 2. Import New Toolboxes ---
import BarnHuntToolbox from './toolboxes/BarnHuntToolbox.vue'
import AgilityToolbox from './toolboxes/AgilityToolbox.vue'
import ScentWorkToolbox from './toolboxes/ScentWorkToolbox.vue'

const store = useMapStore()
const userStore = useUserStore()
const router = useRouter()
const emit = defineEmits(['print'])

function handlePrint(isJudge) {
  emit('print', isJudge)
}
</script>

<template>
  <aside class="editor-sidebar">
    <div class="sidebar-header">
      <div class="header-left">
        <button @click="router.push('/dashboard')" class="btn-back" title="Back to Dashboard">⬅</button>
        <h2>Editor</h2>
      </div>
      
      <div class="history-controls">
        <button @click="store.undo()" :disabled="store.history.length === 0" title="Undo (Ctrl+Z)">↩️</button>
        <button @click="store.redo()" :disabled="store.future.length === 0" title="Redo (Ctrl+Y)">↪️</button>
        <button @click="store.saveToCloud" class="btn-save">💾</button>
      </div>
    </div>

    <div v-if="!userStore.user" class="auth-box">
      <AuthForm />
    </div>

    <div v-else class="sidebar-content">
      <div class="config-group">
        <label>Map Name</label>
        <input v-model="store.mapName" class="input-text" />
      </div>

      <div class="config-group">
        <label>Ring Size (ft)</label>
        <div class="dims-row">
          <input type="number" :value="store.ringDimensions.width" @change="e => store.resizeRing(e.target.value, store.ringDimensions.height)" />
          <span>x</span>
          <input type="number" :value="store.ringDimensions.height" @change="e => store.resizeRing(store.ringDimensions.width, e.target.value)" />
        </div>
      </div>

      <div class="config-group">
        <label>Class Level</label>
        <select v-model="store.classLevel">
          <option>Novice</option>
          <option>Open</option>
          <option>Senior</option>
          <option>Master</option>
          <option>Crazy8s</option>
        </select>
      </div>

      <hr />

      <BarnHuntToolbox v-if="store.sport === 'barnhunt'" />
      <AgilityToolbox v-else-if="store.sport === 'agility'" />
      <ScentWorkToolbox v-else-if="store.sport === 'scentwork'" />

      <hr />

      <div class="print-actions">
        <label>Print:</label>
        <div class="btn-group-sm">
          <button @click="handlePrint(true)" title="Print with Hides/Answers">👨‍⚖️ Judge</button>
          <button @click="handlePrint(false)" title="Print Clean Map">🏃 Exhibitor</button>
        </div>
      </div>

    </div>
  </aside>
</template>

<style scoped>
.editor-sidebar { width: 300px; background: #fff; border-right: 1px solid #ddd; display: flex; flex-direction: column; height: 100vh; }
.sidebar-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; }
.header-left { display: flex; align-items: center; gap: 10px; }
.sidebar-header h2 { margin: 0; font-size: 1.2rem; }
.btn-back { background: none; border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 1.1rem; }
.btn-back:hover { background: #e0e0e0; }
.sidebar-content { padding: 15px; overflow-y: auto; flex: 1; }

.config-group { margin-bottom: 15px; }
.config-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; font-size: 0.9rem; }
.input-text, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.dims-row { display: flex; align-items: center; gap: 5px; }
.dims-row input { width: 60px; padding: 5px; text-align: center; }

.auth-box { padding: 20px; text-align: center; background: #fff3e0; margin: 20px; border-radius: 8px; }

/* SHARED BUTTON STYLES FOR HEADER/FOOTER AREAS */
.btn-save { background: #4caf50; color: white; border: none; font-weight: bold; text-align: center; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-left: 5px; }
.btn-save:hover { background: #43a047; }

.print-actions { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
.print-actions label { font-size: 0.85em; color: #666; font-weight: bold; }
.btn-group-sm { display: flex; gap: 5px; flex: 1; }
.btn-group-sm button { flex: 1; padding: 4px; font-size: 0.85em; text-align: center; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }

.history-controls { display: flex; gap: 5px; }
.history-controls button { padding: 5px 8px; font-size: 1.1rem; border: none; background: transparent; cursor: pointer; opacity: 0.8; }
.history-controls button:hover:not(:disabled) { opacity: 1; background: #eee; border-radius: 4px; }
.history-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
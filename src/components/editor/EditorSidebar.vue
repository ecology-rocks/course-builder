<script setup>
import { computed, ref } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useUserStore } from '../../stores/userStore'
import { useRouter } from 'vue-router'

const store = useMapStore()
const userStore = useUserStore()
const router = useRouter()
const emit = defineEmits(['print'])

// AUTH / REGISTER STATE
const email = ref('')
const password = ref('')
const registerSport = ref('barnhunt')

async function handleLogin() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.login(email.value, password.value)
}

async function handleRegister() {
  if (!email.value || !password.value) return alert("Please enter email and password")
  await userStore.register(email.value, password.value, registerSport.value)
}

function handleForgotPassword() {
  const e = prompt("Enter your email to reset password:")
  if (e) userStore.resetPassword(e)
}

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
      <h3>Login Required</h3>
      <div class="auth-form">
        <input v-model="email" type="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Password" />
        
        <div class="sport-select-label">Choose your Primary Sport:</div>
        <div class="sport-selector">
          <label :class="{ active: registerSport === 'barnhunt' }">
            <input type="radio" v-model="registerSport" value="barnhunt">
            📦 Barn Hunt
          </label>
          <label :class="{ active: registerSport === 'agility' }">
            <input type="radio" v-model="registerSport" value="agility">
            🐕 Agility
          </label>
        </div>

        <div class="auth-buttons">
          <button @click="handleLogin" class="btn-primary">Login</button>
          <button @click="handleRegister" class="btn-secondary">Register</button>
        </div>
        <a href="#" @click.prevent="handleForgotPassword" class="forgot-link">Forgot Password?</a>
      </div>
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

      <div v-if="store.sport === 'barnhunt'" class="toolbox">
        <h3>Layers</h3>
        <div class="layer-controls">
          <button @click="store.currentLayer = 1" :class="{ active: store.currentLayer === 1 }">1</button>
          <button @click="store.currentLayer = 2" :class="{ active: store.currentLayer === 2 }">2</button>
          <button @click="store.currentLayer = 3" :class="{ active: store.currentLayer === 3 }">3</button>
        </div>

        <h3>Place Items</h3>
        <div class="tool-grid">
          <button @click="store.setTool('bale')" :class="{ active: store.activeTool === 'bale' }">📦 Bale</button>
          <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Tunnel Board</button>
          <button @click="store.setTool('startbox')" :class="{ active: store.activeTool === 'startbox' }">🏁 Start</button>
          <button @click="store.setTool('hide')" :class="{ active: store.activeTool === 'hide' }">🐀 Hide</button>
          <button @click="store.setTool('dcmat')" :class="{ active: store.activeTool === 'dcmat' }">🟨 Mat</button>
        </div>

        <h3>Actions</h3>
        <div class="action-tools">
          <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">🔄 Rotate</button>
          <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }">📐 Orientation</button>
          <button @click="store.setTool('lean')" :class="{ active: store.activeTool === 'lean' }">↗️ Lean</button>
          <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete</button>
        </div>
      </div>

      <div v-else-if="store.sport === 'agility'" class="toolbox">
        <h3>Obstacles</h3>
        <div class="tool-grid">
          <button @click="store.setTool('jump')" :class="{ active: store.activeTool === 'jump' }">🚧 Jump</button>
          <button @click="store.setTool('tunnel')" :class="{ active: store.activeTool === 'tunnel' }">🚇 Tunnel</button>
          <button @click="store.setTool('weave')" :class="{ active: store.activeTool === 'weave' }">💈 Weaves</button>
          <button @click="store.setTool('table')" :class="{ active: store.activeTool === 'table' }">🟨 Table</button>
        </div>
        
        <h3>Contacts</h3>
        <div class="tool-grid">
          <button @click="store.setTool('dogwalk')" :class="{ active: store.activeTool === 'dogwalk' }">🚶 DogWalk</button>
          <button @click="store.setTool('aframe')" :class="{ active: store.activeTool === 'aframe' }">🔺 A-Frame</button>
          <button @click="store.setTool('teeter')" :class="{ active: store.activeTool === 'teeter' }">⚖️ Teeter</button>
        </div>

        <h3>Actions</h3>
        <div class="action-tools">
          <button @click="store.setTool('rotate')" :class="{ active: store.activeTool === 'rotate' }">🔄 Rotate</button>
          <button @click="store.setTool('type')" :class="{ active: store.activeTool === 'type' }">📐 Shape</button>
          
          <div class="renumber-group">
            <button @click="store.setTool('renumber')" :class="{ active: store.activeTool === 'renumber' }">
              🔢 123
            </button>
            <input 
              v-if="store.activeTool === 'renumber'" 
              type="number" 
              v-model="store.nextNumber" 
              class="num-input" 
            />
          </div>

          <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete</button>
        </div>
      </div>

      <div v-else-if="store.sport === 'scentwork'" class="toolbox">
        <h3>Elements</h3>
        <div class="tool-grid">
          <button @click="store.setTool('box')" :class="{ active: store.activeTool === 'box' }">📦 Box</button>
          <button @click="store.setTool('luggage')" :class="{ active: store.activeTool === 'luggage' }">🧳 Luggage</button>
          <button @click="store.setTool('container')" :class="{ active: store.activeTool === 'container' }">🗑️ Cont.</button>
          <button @click="store.setTool('cone')" :class="{ active: store.activeTool === 'cone' }">⚠️ Cone</button>
          <button @click="store.setTool('vehicle')" :class="{ active: store.activeTool === 'vehicle' }">🚗 Vehicle</button>
          <button @click="store.setTool('buried')" :class="{ active: store.activeTool === 'buried' }">🏖️ Buried</button>
        </div>
        
        <h3>Tools</h3>
        <div class="tool-grid">
           <button @click="store.setTool('board')" :class="{ active: store.activeTool === 'board' }">➖ Tape/Wall</button>
           <button @click="store.setTool('hot')" :class="{ active: store.activeTool === 'hot' }">🔥 Mark Hot</button>
           <button @click="store.setTool('delete')" :class="{ active: store.activeTool === 'delete' }">🗑️ Delete</button>
        </div>
      </div>

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
.toolbox { margin-bottom: 20px; }
.toolbox h3 { font-size: 0.9rem; text-transform: uppercase; color: #888; margin: 15px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.layer-controls { display: flex; gap: 5px; margin-bottom: 10px; }
.layer-controls button { flex: 1; padding: 8px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; font-weight: bold; }
.layer-controls button.active { background: #2196f3; color: white; border-color: #1976d2; }
.tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.action-tools { display: flex; flex-direction: column; gap: 8px; }
button { padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; text-align: left; transition: all 0.2s; font-size: 0.9rem; }
button:hover { background: #f5f5f5; }
button.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; }
.btn-save { background: #4caf50; color: white; border: none; font-weight: bold; text-align: center; padding: 5px 15px; border-radius: 4px; cursor: pointer; }
.btn-save:hover { background: #43a047; }
.auth-box { padding: 20px; text-align: center; background: #fff3e0; margin: 20px; border-radius: 8px; }
.auth-form input { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
.auth-buttons { display: flex; gap: 10px; }
.btn-primary { background: #2c3e50; color: white; border: none; flex: 1; text-align: center; }
.btn-secondary { background: white; border: 1px solid #2c3e50; color: #2c3e50; flex: 1; text-align: center; }
.forgot-link { display: block; margin-top: 10px; font-size: 0.8rem; color: #666; }
.sport-select-label { font-size: 0.85em; color: #666; margin-top: 5px; margin-bottom: 3px; text-align: left; }
.sport-selector { display: flex; gap: 5px; margin-bottom: 10px; }
.sport-selector label { flex: 1; border: 1px solid #ccc; border-radius: 4px; padding: 8px 5px; font-size: 0.85em; text-align: center; cursor: pointer; background: white; transition: all 0.2s; }
.sport-selector label:hover { background: #f9f9f9; }
.sport-selector label.active { background: #e3f2fd; border-color: #2196f3; color: #1565c0; font-weight: bold; }
.sport-selector input { display: none; }
.renumber-group { display: flex; gap: 5px; }
.renumber-group button { flex: 1; }
.num-input { width: 40px; padding: 5px; text-align: center; border: 1px solid #2196f3; border-radius: 4px; font-weight: bold; }
.print-actions { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
.print-actions label { font-size: 0.85em; color: #666; font-weight: bold; }
.btn-group-sm { display: flex; gap: 5px; flex: 1; }
.btn-group-sm button { flex: 1; padding: 4px; font-size: 0.85em; text-align: center; }
.history-controls { display: flex; gap: 5px; }
.history-controls button { padding: 5px 8px; font-size: 1.1rem; border: none; background: transparent; cursor: pointer; opacity: 0.8; }
.history-controls button:hover:not(:disabled) { opacity: 1; background: #eee; border-radius: 4px; }
.history-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-save { margin-left: 5px; } /* Adjust save button margin */
</style>
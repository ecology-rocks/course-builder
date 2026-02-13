<template>
  <div class="card admin-panel">
    <div class="card-header">
      <h2>Replicate User Issue</h2>
      <span class="badge admin">DEBUG MODE</span>
    </div>

    <div class="card-body">
      <div class="form-group">
        <label>Target User (Email or UID)</label>
        <div class="input-row">
          <input 
            v-model="targetInput" 
            type="text" 
            placeholder="user@example.com or UID..." 
            @keyup.enter="loadMaps"
            :disabled="adminStore.loading"
          />
          <button 
            @click="loadMaps" 
            class="btn-primary" 
            :disabled="adminStore.loading || !targetInput"
          >
            {{ adminStore.loading ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>

      <div v-if="notification" :class="['status-msg', notification.type]">
        {{ notification.message }}
      </div>

      <div v-if="adminStore.targetUserMaps.length > 0" class="results-section">
        <div class="results-header">
          <h3>Found {{ adminStore.targetUserMaps.length }} Maps</h3>
          <button @click="clear" class="btn-text">Clear</button>
        </div>
        
        <ul class="map-list">
          <li v-for="map in adminStore.targetUserMaps" :key="map.id">
            <div class="map-info">
              <span class="map-name">{{ map.name || 'Untitled Map' }}</span>
              <span class="map-id">{{ map.id }}</span>
            </div>
            <button @click="replicate(map)" class="btn-outline btn-sm">
              Copy to My Profile
            </button>
          </li>
        </ul>
      </div>

      <div v-else-if="hasSearched && !adminStore.loading" class="empty-state">
        <p>No maps found for this user.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAdminStore } from '@/stores/adminStore';

const adminStore = useAdminStore();
const targetInput = ref('');
const notification = ref(null);
const hasSearched = ref(false);

async function loadMaps() {
  notification.value = null;
  hasSearched.value = false;
  
  if (!targetInput.value.trim()) return;

  try {
    await adminStore.fetchUserMaps(targetInput.value.trim());
    hasSearched.value = true;
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function replicate(map) {
  notification.value = null;
  try {
    const newId = await adminStore.copyMapToAdmin(map);
    showNotification(`Success! Map copied. New ID: ${newId}`, 'success');
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
  }
}

function showNotification(msg, type) {
  notification.value = { message: msg, type };
  if (type === 'success') {
    setTimeout(() => { notification.value = null }, 3000);
  }
}

function clear() {
  adminStore.targetUserMaps = [];
  targetInput.value = '';
  hasSearched.value = false;
  notification.value = null;
}
</script>

<style scoped>
/* Same styles as before */
.card { background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #eee; background: #f8f9fa; border-radius: 8px 8px 0 0; }
.card-header h2 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
.card-body { padding: 20px; }
.badge.admin { background: #2c3e50; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; letter-spacing: 0.5px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #555; font-size: 0.9rem; }
.input-row { display: flex; gap: 10px; }
.input-row input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
.input-row input:focus { outline: none; border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1); }
.btn-primary { background: #4CAF50; color: white; border: none; padding: 0 20px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
.btn-primary:hover:not(:disabled) { background: #43a047; }
.btn-primary:disabled { background: #a5d6a7; cursor: not-allowed; }
.btn-outline { background: white; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; color: #555; font-size: 0.85rem; transition: all 0.2s; }
.btn-outline:hover { border-color: #4CAF50; color: #4CAF50; background: #f1f8e9; }
.btn-text { background: none; border: none; color: #666; cursor: pointer; text-decoration: underline; font-size: 0.85rem; }
.results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 2px solid #eee; padding-bottom: 5px; }
.results-header h3 { font-size: 1rem; color: #333; margin: 0; }
.map-list { list-style: none; padding: 0; margin: 0; border: 1px solid #eee; border-radius: 6px; }
.map-list li { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #eee; background: #fff; }
.map-list li:last-child { border-bottom: none; }
.map-list li:hover { background: #f9f9f9; }
.map-info { display: flex; flex-direction: column; }
.map-name { font-weight: 600; color: #2c3e50; }
.map-id { font-size: 0.75rem; color: #999; font-family: monospace; }
.status-msg { padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 0.9rem; }
.status-msg.success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.status-msg.error { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
.empty-state { text-align: center; color: #777; padding: 20px; background: #fafafa; border-radius: 6px; font-style: italic; }
</style>
<script setup>
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useTunnelLogic } from './useTunnelLogic'

const store = useMapStore()
const { deletePath, selectPath } = useTunnelLogic(store)
const emit = defineEmits(['close'])

const activeTool = computed({
  get: () => store.activeTool,
  set: (val) => store.setTool(val)
})

function handleExit() {
  // We can add validation here later (e.g., "Finish your current path?")
  store.isTunnelMode = false
  store.setTool('select')
}

function isSelected(id) {
  return store.selection.includes(id)
}
</script>

<template>
  <div class="tunnel-manager-overlay">
    <div class="tunnel-sidebar">
      <div class="sidebar-header">
        <h3>Tunnel Engineer</h3>
        <button class="close-icon" @click="handleExit">×</button>
      </div>

      <div class="tool-selector">
        <button 
          :class="{ active: activeTool === 'tunnel_edges' }"
          @click="activeTool = 'tunnel_edges'"
          title="Step 1: Define Openings"
        >
          🧱 Set Edges
        </button>
        <button 
          :class="{ active: activeTool === 'tunnel_path' }"
          @click="activeTool = 'tunnel_path'"
          title="Step 2: Draw Paths"
        >
          ✏️ Draw Path
        </button>
      </div>

      <div class="options-panel">
        <label class="checkbox-row">
          <input type="checkbox" v-model="store.tunnelConfig.showGuardLines" />
          <span>Show Min Width (18")</span>
        </label>
      </div>

      <div class="tunnel-list">
        <h4>Active Tunnels</h4>
        <div v-if="store.mapData.tunnelPaths.length === 0" class="empty-state">
          No tunnels created yet.
          <br><br>
          1. Select <b>Set Edges</b> to mark openings.
          <br>
          2. Select <b>Draw Path</b> to connect them.
        </div>
        
        <div 
          v-for="(tunnel, idx) in store.mapData.tunnelPaths" 
          :key="tunnel.id"
          class="tunnel-item"
          :class="{ active: isSelected(tunnel.id) }" 
          @click="selectPath(tunnel.id)"
        >
          <span class="tunnel-name">Tunnel {{ idx + 1 }}</span>
          <button class="btn-delete" @click.stop="deletePath(tunnel.id)">🗑️</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-save" @click="handleExit">✅ Done</button>
      </div>
    </div>
    
    <div class="top-status">
      Mode: <strong>{{ activeTool === 'tunnel_edges' ? 'Setting Board Edges' : 'Drawing Tunnel Path' }}</strong>
    </div>
  </div>
</template>

<style scoped>
.tunnel-manager-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50; display: flex; }
.tunnel-sidebar { width: 300px; background: white; pointer-events: auto; display: flex; flex-direction: column; border-right: 1px solid #ddd; box-shadow: 2px 0 10px rgba(0,0,0,0.1); height: 100%; }
.sidebar-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; }
.close-icon { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; }

.tool-selector { padding: 15px; display: flex; gap: 10px; border-bottom: 1px solid #eee; }
.tool-selector button { flex: 1; padding: 10px; cursor: pointer; border: 1px solid #ddd; background: #fff; border-radius: 4px; font-weight: bold; font-size: 13px; }
.tool-selector button.active { background: #e3f2fd; border-color: #2196f3; color: #1976d2; }

.options-panel { padding: 15px; border-bottom: 1px solid #eee; background: #fcfcfc; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; user-select: none; }

.tunnel-list { flex: 1; overflow-y: auto; padding: 10px; }
.tunnel-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px; cursor: pointer; background: white; }
.tunnel-item.active { border-color: #2196f3; background: #f0f9ff; }
.tunnel-item:hover { background: #f5f5f5; }
.btn-delete { background: none; border: none; cursor: pointer; opacity: 0.5; }
.btn-delete:hover { opacity: 1; }
.empty-state { font-size: 13px; color: #777; text-align: center; padding: 20px; line-height: 1.5; }

.actions { padding: 15px; border-top: 1px solid #ddd; }
.btn-save { width: 100%; padding: 12px; background: #4caf50; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
.btn-save:hover { background: #43a047; }

.top-status { position: absolute; top: 20px; left: 320px; background: rgba(255,255,255,0.95); padding: 8px 16px; border-radius: 20px; border: 1px solid #ccc; font-size: 14px; color: #333; pointer-events: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
</style>
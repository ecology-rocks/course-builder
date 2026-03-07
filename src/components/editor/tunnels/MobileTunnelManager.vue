<script setup>
import { computed, ref, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useTunnelLogic } from './useTunnelLogic'

const store = useMapStore()
const {
  tunnelGroups, selectGroup, deleteGroup
} = useTunnelLogic(store)

const emit = defineEmits(['close'])
const showList = ref(false)

const activeTool = computed({
  get: () => store.activeTool,
  set: (val) => store.setTool(val)
})

onMounted(() => {
  store.setTool('tunnel_edges')
})

const selectedGroup = computed(() => {
  if (store.selection.length === 0) return null
  return tunnelGroups.value.find(g =>
    g.paths.some(p => store.selection.includes(p.id))
  )
})

function isGroupSelected(group) {
  return group.paths.some(p => store.selection.includes(p.id))
}

function handleExit() {
  store.isTunnelMode = false
  store.setTool('select')
  emit('close')
}
</script>

<template>
  <div class="mobile-tunnel-manager">
    <div class="tunnel-top-bar">
      <span v-if="activeTool === 'tunnel_edges'">
        <strong>Set Edges:</strong> Tap Start then End
      </span>
      <span v-else>
        <strong>Drawing:</strong> Tap to map path
      </span>
      <button class="btn-done" @click="handleExit">Done</button>
    </div>

    <div class="tunnel-bottom-sheet" :class="{ expanded: showList }">
      <div class="sheet-handle" @click="showList = !showList">
        <div class="handle-bar"></div>
      </div>
      
      <div class="tool-selector">
        <button :class="{ active: activeTool === 'tunnel_edges' }" @click="activeTool = 'tunnel_edges'">
          🧱 Set Edges
        </button>
        <button :class="{ active: activeTool === 'tunnel_path' }" @click="activeTool = 'tunnel_path'">
          ✏️ Draw Path
        </button>
      </div>

      <div class="options-panel">
        <label class="checkbox-row">
          <input type="checkbox" v-model="store.tunnelConfig.showGuardLines" />
          <span>Show 18" Min Width</span>
        </label>
      </div>

      <div v-if="showList" class="tunnel-list-container">
        <div v-if="selectedGroup" class="selected-info">
          <h4>Selected: {{ selectedGroup.totalLength }} ft</h4>
          <button class="btn-clear" @click="store.selection = []">Clear</button>
        </div>

        <div class="tunnel-list">
          <div v-if="tunnelGroups.length === 0" class="empty-state">No tunnels created.</div>
          <div v-for="group in tunnelGroups" :key="group.id" class="tunnel-item"
            :class="{ active: isGroupSelected(group) }" @click="selectGroup(group)">
            <div class="tunnel-info">
              <span class="tunnel-name">{{ group.name }}</span>
              <span class="tunnel-meta">Total: {{ group.totalLength }} ft</span>
            </div>
            <button class="btn-delete" @click.stop="deleteGroup(group)">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-tunnel-manager {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tunnel-top-bar {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ccc;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 0.9rem;
}

.btn-done {
  background: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
}

.tunnel-bottom-sheet {
  pointer-events: auto;
  background: white;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  padding: 0 16px 20px;
  transition: transform 0.3s ease;
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 16px 0 10px;
  cursor: pointer;
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
}

.tool-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.tool-selector button {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 8px;
  font-weight: bold;
}

.tool-selector button.active {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.options-panel {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.tunnel-list-container {
  margin-top: 10px;
  max-height: 40vh;
  overflow-y: auto;
}

.selected-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #e3f2fd;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.btn-clear {
  background: none;
  border: none;
  color: #1976d2;
  font-weight: bold;
  text-decoration: underline;
}

.tunnel-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #eee;
  margin-bottom: 5px;
  border-radius: 8px;
}

.tunnel-item.active {
  border-color: #2196f3;
  background: #f0f9ff;
}

.tunnel-info {
  display: flex;
  flex-direction: column;
}

.tunnel-meta {
  font-size: 0.8rem;
  color: #666;
}

.btn-delete {
  background: none;
  border: none;
  font-size: 1.2rem;
}

.empty-state {
  text-align: center;
  color: #888;
  padding: 20px 0;
}
</style>
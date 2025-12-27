<script setup>
import { ref, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUserStore } from '@/stores/userStore'
import { libraryService } from '@/services/libraryService'

const emit = defineEmits(['close'])
const store = useMapStore()
const userStore = useUserStore()

const items = ref([])
const loading = ref(true)
const isAdmin = userStore.user?.email === 'reallyjustsam@gmail.com'

onMounted(async () => {
  items.value = await libraryService.getLibraryItems(store.sport)
  loading.value = false
})

function handleImport(item) {
  // We re-use the "Merge" function you built earlier!
  // We just need to wrap the raw data in JSON
  const jsonString = JSON.stringify(item.data)
  store.mergeMapFromJSON(jsonString)
  emit('close')
}

async function handleDelete(id) {
  if (!confirm("Are you sure you want to delete this?")) return
  await libraryService.deleteItem(userStore.user, id)
  items.value = items.value.filter(i => i.id !== id)
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <header>
        <h2>📚 Map Library </h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </header>
      
      <div v-if="loading" class="loading">Loading library...</div>
      
      <div v-else class="library-grid">
        <div v-if="items.length === 0" class="empty-state">
          No items found for this sport.
        </div>

        <div v-for="item in items" :key="item.id" class="lib-card">
          <div class="card-header">
            <h3>{{ item.name }}</h3>
          </div>
          <div class="card-preview">
            <img v-if="item.thumbnail" :src="item.thumbnail" alt="Preview" />
            <span v-else>📦 {{ item.data.bales?.length || 0 }} Bales</span>
          </div>
          <div class="card-actions">
            <button @click="handleImport(item)" class="btn-primary">➕ Add to Map</button>
            <button v-if="isAdmin" @click="handleDelete(item.id)" class="btn-danger">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal { background: white; width: 90%; max-width: 800px; height: 80vh; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
header { padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.library-grid { padding: 20px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.lib-card { border: 1px solid #eee; border-radius: 8px; padding: 15px; background: #fafafa; display: flex; flex-direction: column; gap: 10px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-header h3 { margin: 0; font-size: 1.1rem; }
.tag { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
.card-preview { flex-grow: 1; background: white; border: 1px solid #eee; height: 100px; display: flex; align-items: center; justify-content: center; color: #888; border-radius: 4px; }
.card-actions { display: flex; gap: 10px; }
.btn-primary { flex-grow: 1; background: #2196f3; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; }
.btn-danger { background: #ffebee; color: #c62828; border: none; padding: 8px; border-radius: 4px; cursor: pointer; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.card-preview { 
  flex-grow: 1; 
  background: white; 
  border: 1px solid #eee; 
  height: 120px; /* Taller for image */
  display: flex; align-items: center; justify-content: center; 
  overflow: hidden; 
}
.card-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Keeps aspect ratio */
  padding: 5px;
}
</style>
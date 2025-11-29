<script setup>
import { onMounted, ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useMapStore } from '../stores/mapStore'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const mapStore = useMapStore()
const router = useRouter()
const userMaps = ref([])

onMounted(async () => {
  if (userStore.user) {
    userMaps.value = await mapStore.loadUserMaps()
  }
})



function createNewMap(sportType) {
  // Use the custom reset action we just made
  mapStore.reset() 
  
  router.push('/editor')
}

function editMap(map) {
  mapStore.loadMapFromData(map.id, map)
  router.push('/editor')
}
</script>

<template>
  <div class="dashboard">
    <nav class="navbar">
      <div class="logo" @click="router.push('/')">
        🐾 CourseBuilder.io
      </div>
      
      <div class="user-status">
        <span class="badge" :class="userStore.tier">{{ userStore.tier.toUpperCase() }} MEMBER</span>
        <button @click="userStore.logout">Logout</button>
      </div>
    </nav>
  <main class="content">
      <h1>My Maps</h1>

      <div v-if="userStore.tier === 'free'" class="upsell-banner">
        <p>Free Tier: You cannot save maps to the cloud or export JSON.</p>
        <button class="btn-upgrade">Upgrade to Pro ($5/mo)</button>
      </div>

    <div v-if="userStore.tier === 'free'" class="upsell-banner">
      <p>Free Tier: You cannot save maps to the cloud or export JSON.</p>
      <button class="btn-upgrade">Upgrade to Pro ($5/mo)</button>
    </div>
    </main>

    <div class="actions">
      <h2>Create New Map</h2>
      <div class="sport-grid">
        <button @click="createNewMap('barnhunt')" class="sport-card">
          🐀 Barn Hunt
        </button>
        <button class="sport-card disabled" title="Coming Soon">
          🐕 Agility (Coming Soon)
        </button>
        <button class="sport-card disabled" title="Coming Soon">
          👃 Scent Work (Coming Soon)
        </button>
      </div>
    </div>

    <div class="map-list">
      <div v-for="map in userMaps" :key="map.id" class="map-item" @click="editMap(map)">
        <strong>{{ map.name }}</strong>
        <small>{{ new Date(map.updatedAt.seconds * 1000).toLocaleDateString() }}</small>
        <span class="tag">{{ map.level }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { max-width: 800px; margin: 0 auto; padding: 20px; }
.badge { background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; margin-right: 10px; }
.badge.pro { background: #ffd700; color: #000; }
.badge.club { background: #9c27b0; color: white; }
.upsell-banner { background: #fff3cd; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
.sport-grid { display: flex; gap: 15px; margin-top: 10px; }
.sport-card { padding: 20px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; font-size: 1.1em; transition: transform 0.2s; }
.sport-card:hover:not(.disabled) { transform: translateY(-2px); border-color: #4CAF50; }
.sport-card.disabled { opacity: 0.6; cursor: not-allowed; background: #f9f9f9; }
.map-item { border: 1px solid #eee; padding: 15px; margin-bottom: 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 15px; }
.map-item:hover { background: #f9f9f9; }
.dashboard { 
  max-width: 800px; 
  margin: 0 auto; 
  padding: 0; /* Remove padding from container so nav touches edges */
}

/* NAVBAR STYLES */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 30px;
  background: white;
}

.logo {
  font-weight: 800;
  font-size: 1.2rem;
  color: #2c3e50;
  cursor: pointer;
  transition: opacity 0.2s;
}

.logo:hover {
  opacity: 0.7; /* Visual feedback for the link */
}

.content {
  padding: 0 20px; /* Add padding back to the content area */
}
</style>
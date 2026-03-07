<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useAdminStore } from '@/stores/adminStore'
import { db } from '@/firebase'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

const userStore = useUserStore()
const adminStore = useAdminStore()
const router = useRouter()

// State
const isLoading = ref(true)
const users = ref([])
const searchQuery = ref('')
const selectedUser = ref(null)
const selectedUserMaps = ref([])
const isLoadingMaps = ref(false)
const notification = ref(null)

// Stats HUD State
const stats = ref({
  total: 0,
  pro: 0,
  newThisMonth: 0,
  conversionRate: '0%'
})

// --- INIT ---
onMounted(async () => {
  // 1. Security Check
  if (userStore.user?.email !== 'reallyjustsam@gmail.com') { 
    router.push('/dashboard')
    return
  }

  // 2. Fetch Data
  try {
    users.value = await adminStore.fetchAllUsers()
    calculateStats(users.value)
  } catch (e) {
    console.error("Failed to load admin data", e)
    showNotification("Failed to load users", "error")
  } finally {
    isLoading.value = false
  }
})

function exportUsersCSV() {
  const headers = ['Judge Name', 'Email', 'Tier']
  const csvRows = [headers.join(',')]
  
  for (const u of users.value) {
    const row = [
      `"${u.judgeName || ''}"`,
      `"${u.email || ''}"`,
      `"${u.tier || 'free'}"`
    ]
    csvRows.push(row.join(','))
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'users_export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// --- LOGIC ---
function calculateStats(userList) {
  const total = userList.length
  // Assuming 'tier' field exists and isn't 'free'
  const pro = userList.filter(u => u.tier && u.tier !== 'free').length
  
  // New in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const newUsers = userList.filter(u => {
    if (!u.createdAt) return false
    return new Date(u.createdAt) > thirtyDaysAgo
  }).length

  stats.value = {
    total,
    pro,
    newThisMonth: newUsers,
    conversionRate: total > 0 ? ((pro / total) * 100).toFixed(1) + '%' : '0%'
  }
}

// Search Filter
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u => 
    (u.email && u.email.toLowerCase().includes(q)) || 
    (u.judgeName && u.judgeName.toLowerCase().includes(q)) ||
    (u.uid && u.uid.includes(q))
  )
})

// Select User & Fetch Maps
async function selectUser(user) {
  selectedUser.value = user
  selectedUserMaps.value = []
  isLoadingMaps.value = true
  
  try {
    const q = query(collection(db, "maps"), where("uid", "==", user.uid))
    const snapshot = await getDocs(q)
    selectedUserMaps.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    // Sort by updated date
    selectedUserMaps.value.sort((a, b) => b.updatedAt?.seconds - a.updatedAt?.seconds)
  } catch (e) {
    console.error(e)
    showNotification("Could not fetch maps for this user", "error")
  } finally {
    isLoadingMaps.value = false
  }
}

// Clone Map (The "Replicate Issue" Tool)
async function cloneMapToAdmin(map) {
  if (!confirm(`Clone "${map.name}" to your account for troubleshooting?`)) return

  try {
    // 1. Prepare Data (Strip ID, change Owner)
    const cloneData = {
      ...map,
      uid: userStore.user.uid, // Make Admin the owner
      name: `[ADMIN CLONE] ${map.name}`,
      originalOwner: map.uid,
      clonedAt: serverTimestamp(),
      isShared: false, // Make private
      folderId: null // Reset folder
    }
    delete cloneData.id // Remove old ID

    // 2. Save as New Map
    await addDoc(collection(db, "maps"), cloneData)
    
    showNotification("Map cloned to your Dashboard!", "success")
  } catch (e) {
    console.error(e)
    showNotification("Failed to clone map", "error")
  }
}

function showNotification(msg, type = 'info') {
  notification.value = { msg, type }
  setTimeout(() => notification.value = null, 3000)
}

function formatDate(timestamp) {
  if (!timestamp) return 'Never'
  // Handle Firebase Timestamp or Date string
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="admin-layout">
    
    <header class="admin-header">
      <div class="header-left">
        <h1>🐾 Admin Console</h1>
        <router-link to="/dashboard" class="btn-back">← Dashboard</router-link>
      </div>

      <div class="hud-grid">
        <div class="hud-card">
          <span class="hud-label">Total Users</span>
          <span class="hud-val">{{ stats.total }}</span>
        </div>
        <div class="hud-card highlight">
          <span class="hud-label">Paid Users</span>
          <div class="hud-row">
            <span class="hud-val">{{ stats.pro }}</span>
            <span class="hud-sub">{{ stats.conversionRate }}</span>
          </div>
        </div>
        <div class="hud-card">
          <span class="hud-label">New (30d)</span>
          <span class="hud-val">{{ stats.newThisMonth }}</span>
        </div>
      </div>
    </header>

    <div class="admin-content">
      
      <div class="panel user-list-panel">
        <div class="panel-header">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0;">Users ({{ filteredUsers.length }})</h3>
            <button @click="exportUsersCSV" class="btn-action" style="padding: 4px 8px; font-size: 0.8rem;">📥 Export CSV</button>
          </div>
          <input v-model="searchQuery" type="text" placeholder="Search name, email, uid..." class="search-box" />
        </div>
        
        <div class="user-scroll">
          <div 
            v-for="user in filteredUsers" 
            :key="user.id" 
            class="user-row"
            :class="{ active: selectedUser?.uid === user.uid }"
            @click="selectUser(user)"
          >
            <div class="u-avatar">{{ user.email?.charAt(0).toUpperCase() }}</div>
            <div class="u-info">
              <div class="u-name">{{ user.judgeName || 'No Name' }} <span v-if="user.tier !== 'free'" class="pro-badge">{{ user.tier }}</span></div>
              <div class="u-email">{{ user.email }}</div>
            </div>
            <div class="u-date">{{ formatDate(user.createdAt) }}</div>
          </div>
        </div>
      </div>

      <div class="panel inspector-panel">
        
        <div v-if="!selectedUser" class="empty-state">
          <p>Select a user to inspect their maps and details.</p>
        </div>

        <div v-else class="inspector-content">
          <div class="inspector-header">
            <div class="user-details">
              <h2>{{ selectedUser.judgeName || 'Unnamed User' }}</h2>
              <div class="meta-row">
                <span class="meta-tag">UID: {{ selectedUser.uid }}</span>
                <span class="meta-tag">Tier: {{ selectedUser.tier || 'Free' }}</span>
                <span class="meta-tag">Maps: {{ selectedUserMaps.length }}</span>
              </div>
            </div>
            <div class="user-actions">
              <a :href="`mailto:${selectedUser.email}`" class="btn-action">📧 Email</a>
            </div>
          </div>

          <hr />

          <h3>User Maps</h3>
          <div v-if="isLoadingMaps" class="spinner-box"><div class="spinner"></div></div>
          <div v-else-if="selectedUserMaps.length === 0" class="no-maps">No maps found.</div>
          
          <div v-else class="map-grid">
            <div v-for="map in selectedUserMaps" :key="map.id" class="map-card">
              <div class="map-info">
                <strong>{{ map.name }}</strong>
                <small>Last updated: {{ formatDate(map.updatedAt) }}</small>
                <div class="map-meta">{{ map.sport }} • {{ map.level }}</div>
              </div>
              <div class="map-actions">
                <button @click="cloneMapToAdmin(map)" class="btn-clone" title="Clone to my dashboard">
                  📥 Clone
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div v-if="notification" :class="['toast', notification.type]">
      {{ notification.msg }}
    </div>

  </div>
</template>

<style scoped>
.admin-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f7f9;
  font-family: 'Segoe UI', sans-serif;
}

/* --- HEADER & HUD --- */
.admin-header {
  background: white;
  padding: 15px 30px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h1 { margin: 0 0 5px 0; font-size: 1.5rem; color: #333; }
.btn-back { color: #666; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
.btn-back:hover { color: #2196f3; }

.hud-grid { display: flex; gap: 20px; }
.hud-card {
  background: #f8f9fa;
  border: 1px solid #eee;
  padding: 10px 20px;
  border-radius: 8px;
  min-width: 120px;
}
.hud-card.highlight { background: #e8f5e9; border-color: #c8e6c9; }
.hud-label { display: block; font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
.hud-val { font-size: 1.5rem; font-weight: 800; color: #333; }
.hud-row { display: flex; align-items: baseline; gap: 8px; }
.hud-sub { font-size: 0.8rem; color: #2e7d32; font-weight: bold; }

/* --- MAIN CONTENT --- */
.admin-content {
  flex: 1;
  display: flex;
  padding: 20px;
  gap: 20px;
  overflow: hidden; /* Prevent full page scroll, handle in panels */
}

.panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header { padding: 15px; border-bottom: 1px solid #eee; }
.panel-header h3 { margin: 0 0 10px 0; font-size: 1rem; color: #555; }

/* --- LEFT: USER LIST --- */
.user-list-panel { width: 350px; flex-shrink: 0; }
.search-box { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }

.user-scroll { flex: 1; overflow-y: auto; }
.user-row {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}
.user-row:hover { background: #f9f9f9; }
.user-row.active { background: #e3f2fd; border-left: 3px solid #2196f3; }

.u-avatar {
  width: 32px; height: 32px; background: #eee; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; color: #777;
}
.u-info { flex: 1; overflow: hidden; }
.u-name { font-weight: 600; font-size: 0.9rem; color: #333; display: flex; align-items: center; gap: 5px; }
.u-email { font-size: 0.8rem; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.u-date { font-size: 0.75rem; color: #aaa; }

.pro-badge { 
  background: #ffecb3; color: #f57f17; font-size: 0.65rem; 
  padding: 1px 4px; border-radius: 4px; text-transform: uppercase; 
}

/* --- RIGHT: INSPECTOR --- */
.inspector-panel { flex: 1; }
.inspector-content { padding: 20px; flex: 1; overflow-y: auto; }
.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; color: #999; }

.inspector-header { display: flex; justify-content: space-between; align-items: flex-start; }
.user-details h2 { margin: 0 0 5px 0; font-size: 1.4rem; }
.meta-row { display: flex; gap: 10px; font-size: 0.85rem; color: #666; }
.meta-tag { background: #eee; padding: 2px 6px; border-radius: 4px; font-family: monospace; }

.user-actions { display: flex; gap: 10px; }
.btn-action { 
  background: white; border: 1px solid #ccc; padding: 6px 12px; 
  border-radius: 4px; text-decoration: none; color: #333; font-size: 0.9rem; font-weight: 500;
}
.btn-action:hover { background: #f5f5f5; }

hr { margin: 20px 0; border: 0; border-top: 1px solid #eee; }

/* Map Grid */
.map-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}
.map-card {
  background: #fff; border: 1px solid #e0e0e0; border-radius: 6px;
  padding: 15px; display: flex; justify-content: space-between; align-items: center;
  transition: box-shadow 0.2s;
}
.map-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.map-info strong { display: block; font-size: 0.95rem; color: #333; margin-bottom: 2px; }
.map-info small { display: block; font-size: 0.8rem; color: #999; }
.map-meta { font-size: 0.75rem; color: #666; margin-top: 4px; text-transform: uppercase; }

.btn-clone {
  background: #e3f2fd; color: #1976d2; border: none;
  padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;
}
.btn-clone:hover { background: #bbdefb; }

/* Toast */
.toast {
  position: fixed; bottom: 20px; right: 20px;
  padding: 12px 24px; border-radius: 4px; color: white;
  font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 1000;
}
.toast.success { background: #4caf50; }
.toast.error { background: #f44336; }
.toast.info { background: #2196f3; }

.spinner-box { display: flex; justify-content: center; padding: 40px; }
.spinner { width: 30px; height: 30px; border: 3px solid #eee; border-top-color: #2196f3; border-radius: 50%; animation: spin 1s infinite linear; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
<script setup>
import { onMounted, computed, ref } from 'vue' // Added ref
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useAdminStore } from '@/stores/adminStore' // Import Admin Store
import AdminTroubleshooter from '@/components/admin/AdminTroubleshooter.vue'

const userStore = useUserStore()
const adminStore = useAdminStore() // Initialize
const router = useRouter()
const isAdmin = computed(() => userStore.user?.email === 'reallyjustsam@gmail.com')
const isExporting = ref(false) // State for loading button

onMounted(() => {
  if (!isAdmin) { 
    console.log("not an admin!")
    router.push('/dashboard')
  }
})

async function handleExport() {
  if (!confirm('Download full user list?')) return;
  
  isExporting.value = true;
  try {
    const users = await adminStore.fetchAllUsers();
    
    // CSV Header
    const headers = ['Email', 'Judge Name', 'Tier', 'Created At'];
    
    // Map data to CSV rows
    const rows = users.map(u => [
      u.email,
      `"${u.judgeName}"`, // Quote names to prevent comma splitting
      u.tier,
      u.createdAt
    ].join(','));

    // Combine
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `user_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (e) {
    alert("Export failed: " + e.message);
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <div class="admin-view">
    <nav class="navbar">
      <div class="logo" @click="router.push('/dashboard')">🐾 Admin Tools</div>
      
      <div class="actions">
        <button @click="handleExport" class="btn-export" :disabled="isExporting">
          {{ isExporting ? 'Generating CSV...' : '⬇ Export User List' }}
        </button>
      </div>
    </nav>
    <div class="container">
      <AdminTroubleshooter />
    </div>
  </div>
</template>

<style scoped>
.admin-view { padding: 20px; }
.container { max-width: 1000px; margin: 0 auto; }

/* Navbar Styling */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  cursor: pointer;
}

.btn-export {
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-export:disabled {
  background: #a5d6a7;
  cursor: not-allowed;
}

.btn-export:hover:not(:disabled) {
  background: #43a047;
}
</style>
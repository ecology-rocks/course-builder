<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import AdminTroubleshooter from '@/components/admin/AdminTroubleshooter.vue'

const userStore = useUserStore()
const router = useRouter()
const isAdmin = computed(() => userStore.user?.email === 'reallyjustsam@gmail.com')

onMounted(() => {
  // Restrict to specific UIDs or an admin flag in userProfile
  if (!isAdmin) {
    console.log("not an admin!")
    console.log(userStore.user)
    router.push('/dashboard')
  }
})
</script>

<template>
  <div class="admin-view">
    <nav class="navbar">
      <div class="logo" @click="router.push('/dashboard')">🐾 Admin Tools</div>
    </nav>
    <div class="container">
      <AdminTroubleshooter />
    </div>
  </div>
</template>

<style scoped>
.admin-view { padding: 20px; }
.container { max-width: 1000px; margin: 0 auto; }
</style>
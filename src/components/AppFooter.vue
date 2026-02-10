<script setup>
import { ref } from 'vue'
import BugReportModal from 'common/BugReportModal.vue'
const showBugModal = ref(false)
</script>

<template>
  <footer class="app-footer">
    <div class="footer-content">
      <div class="copyright">
        &copy; {{ new Date().getFullYear() }} K9CourseBuilder.com
      </div>
      <div class="links">
        <a href="/about">About</a>
        <span class="divider">•</span>
        <router-link to="/terms">ToS</router-link>
        <span class="divider">•</span>
        <router-link to="/privacy">Privacy Policy</router-link>
        <span class="divider">•</span>
        <a href="https://docs.k9coursebuilder.com">Docs</a>
        <span class="divider">•</span>
        <a href="https://docs.k9corusebuilder.com/blog">Blog</a>
        <span class="divider">•</span>
        <router-link to="/roadmap">Roadmap</router-link>
      </div>
    </div>
    <BugReportModal v-if="showBugModal" @close="showBugModal = false" />
  </footer>
</template>

<style scoped>
.app-footer { background: #f9f9f9; border-top: 1px solid #eee; padding: 30px 20px; margin-top: auto; }
.footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 10px; color: #666; font-size: 0.9rem; }
.links { display: flex; gap: 10px; align-items: center; }
a { color: #666; text-decoration: none; }
a:hover { color: #2c3e50; text-decoration: underline; }
.divider { color: #ccc; }

@media (min-width: 600px) {
  .footer-content { flex-direction: row; justify-content: space-between; }
}
</style>
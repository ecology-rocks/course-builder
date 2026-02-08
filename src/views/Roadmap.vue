<script setup>
import { ref } from 'vue'
import AppFooter from '@/components/AppFooter.vue'

// --- MANAGE YOUR ROADMAP HERE ---
const released = ref([
  { version: 'v1.0', date: '2026-02-07', desc: 'Adding right click menus and appropriate bottom bar / floating menus. Added individual object customization. ' },
  { version: 'v0.9', date: '2026-01-31', desc: 'Fully legal Barn Hunt maps thanks to beta testers.' },
  { version: 'v0.5', date: '2026-12-01', desc: 'Alpha version for testers to work out bugs.' }
])

const inProgress = ref([
  'Allowing custom objects in the print legend',
  'Blind/Hide Management/Printing Flow',
  'Fence tool for irregular rings',
])

const planned = ref([
  'Desktop Offline App (Late 2026)',
  'Mobile View Optimization',
  'Highlighting changed bales w/ comparison tools',
  'Print all or print group for trial sets of maps',
  '3d view - research to see if implementation is possible'
])
// -------------------------------

</script>

<template>
  <div class="page-wrapper">
    <nav class="navbar">
      <div class="logo">🐾 K9CourseBuilder</div>
      <router-link to="/" class="btn-text">← Back Home</router-link>
    </nav>

    <div class="container">
      <header class="header">
        <h1>Product Roadmap</h1>
        <p class="subtitle">See what's new and what's coming next for K9CourseBuilder.</p>
      </header>

      <div class="roadmap-grid">
        
        <div class="column">
          <div class="card current">
            <h3>🚧 In Progress</h3>
            <ul>
              <li v-for="(item, i) in inProgress" :key="i">{{ item }}</li>
            </ul>
          </div>

          <div class="card future">
            <h3>🔮 Up Next</h3>
            <ul>
              <li v-for="(item, i) in planned" :key="i">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="column">
          <h3>🚀 Release History</h3>
          <div class="timeline">
            <div v-for="(release, i) in released" :key="i" class="release-item">
              <div class="version-badge">{{ release.version }}</div>
              <div class="release-content">
                <span class="date">{{ release.date }}</span>
                <p>{{ release.desc }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
    <AppFooter />
  </div>
</template>

<style scoped>
.page-wrapper { font-family: 'Inter', sans-serif; background: #fff; min-height: 100vh; display: flex; flex-direction: column; }
.container { max-width: 900px; margin: 0 auto; padding: 40px 20px; flex: 1; }

.navbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #eee; }
.logo { font-weight: 900; font-size: 1.2rem; color: #2c3e50; }
.btn-text { text-decoration: none; color: #666; font-weight: bold; }

.header { text-align: center; margin-bottom: 60px; }
h1 { font-size: 2.5rem; margin-bottom: 10px; color: #2c3e50; }
.subtitle { color: #666; font-size: 1.1rem; }

.roadmap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }

.card { padding: 25px; border-radius: 12px; margin-bottom: 20px; }
.card h3 { margin-top: 0; color: #2c3e50; }
.card ul { padding-left: 20px; color: #555; line-height: 1.6; }
.card.current { background: #e3f2fd; border: 1px solid #bbdefb; }
.card.future { background: #f5f5f5; border: 1px solid #e0e0e0; }

.timeline { border-left: 2px solid #eee; margin-top: 20px; padding-left: 20px; }
.release-item { margin-bottom: 30px; position: relative; }
.release-item::before { 
  content: ''; position: absolute; left: -26px; top: 5px; 
  width: 10px; height: 10px; background: #2c3e50; border-radius: 50%; 
}
.version-badge { 
  display: inline-block; background: #2c3e50; color: white; 
  padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; margin-bottom: 5px; 
}
.date { font-size: 0.85rem; color: #999; margin-left: 10px; }
.release-content p { margin: 5px 0 0 0; color: #444; }

@media (max-width: 768px) {
  .roadmap-grid { grid-template-columns: 1fr; }
}
</style>
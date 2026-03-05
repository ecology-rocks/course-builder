<script setup>
import { ref } from 'vue'
import AppFooter from '@/components/AppFooter.vue'

// --- MANAGE YOUR ROADMAP HERE ---
// [UPDATE] Changed 'desc' string to 'changes' array for bullet points
const released = ref([
  { 
    version: 'v1.1.5', 
    date: '2026-02-22', 
    changes: [
      'Added tunnel manager (beta) and tunnel length stats to printables.',
      'Re-added comparison stats to smaller prints.',
      'Wall/fence customization.',
      'Updated library saves and added categories for future expansion',
      'Refreshed the share feature'
    ]
  },
  { 
    version: 'v1.1', 
    date: '2026-02-13', 
    changes: [
      'Redid the blind print flow so that users do not get timed out by their browsers.',
      'Fixed hitbox on custom rings.',
      'Gave access to blind prints to all users.',
      'Fixed anchor bales to appear at corners.'
    ]
  },
  { 
    version: 'v1.0', 
    date: '2026-02-07', 
    changes: [
      'Added right click menus and appropriate bottom bar / floating menus.',
      'Added individual object customization.'
    ]
  },
  { 
    version: 'v0.9', 
    date: '2026-01-31', 
    changes: [
      'Fully legal Barn Hunt maps thanks to beta testers.'
    ]
  },
  { 
    version: 'v0.5', 
    date: '2025-12-01', // Fixed year typo (was 2026)
    changes: [
      'Alpha version for testers to work out bugs.'
    ]
  }
])

const inProgress = ref([
  'Change layer with a right click menu',
  'Change gate size with a right click menu',
  'Highlight changed bales w/ comparison tools',
  'Mobile view optimization',
  'Print or print group from Dashboard'
])

const privateInHouse = ref([
  'make business cards with promo code JUDGE10',
  'make sure that people can cancel, and that downgrades work appropriately'
])

const planned = ref([
  'Desktop Offline App (Late 2026)',
  '3d view - research to see if implementation is possible',
  'validation for each course level',
  'random hides generator',
  'procedurally generated courses',
  
])
</script>

<template>
  <div class="about-page">
    <div class="header">
      <h1>Roadmap</h1>
      <p class="subtitle">See what's new and what's coming next.</p>
    </div>

    <div class="roadmap-grid">
      <div class="column">
        <h2>🚀 Released</h2>
        <div class="timeline">
          <div v-for="(release, i) in released" :key="i" class="card current">
            <div class="release-header">
              <h3>{{ release.version }}</h3>
              <span class="date">{{ release.date }}</span>
            </div>
            <ul>
              <li v-for="(change, cIndex) in release.changes" :key="cIndex">
                {{ change }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="column">
        <h2>🛠️ In Progress</h2>
        <div class="card future">
          <ul>
            <li v-for="(task, i) in inProgress" :key="i">{{ task }}</li>
          </ul>
        </div>

        <h2>🔮 Future Plans</h2>
        <div class="card future">
          <ul>
            <li v-for="(task, i) in planned" :key="i">{{ task }}</li>
          </ul>
        </div>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
.about-page { max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: 'Segoe UI', sans-serif; }
.header { text-align: center; margin-bottom: 60px; }
h1 { font-size: 2.5rem; margin-bottom: 10px; color: #2c3e50; }
.subtitle { color: #666; font-size: 1.1rem; }

.roadmap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
@media (max-width: 768px) { .roadmap-grid { grid-template-columns: 1fr; } }

.column h2 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }

.card { padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.card.current { background: #e3f2fd; border: 1px solid #bbdefb; }
.card.future { background: #f5f5f5; border: 1px solid #e0e0e0; }

.release-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; }
.release-header h3 { margin: 0; color: #1565c0; }
.date { font-size: 0.85rem; color: #555; font-family: monospace; }

ul { margin: 0; padding-left: 20px; }
li { color: #444; margin-bottom: 6px; line-height: 1.5; }
</style>
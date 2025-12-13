import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Dashboard from '../views/Dashboard.vue'
import MapEditor from '../components/MapEditor.vue'
import MapView from '../views/MapView.vue'
import Settings from '../views/Settings.vue'
import Terms from '../views/Terms.vue'     // <--- NEW
import Privacy from '../views/Privacy.vue' // <--- NEW

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Scroll to top on navigation
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/dashboard', name: 'dashboard', component: Dashboard },
    { path: '/editor', name: 'editor', component: MapEditor },
    { path: '/view/:id', name: 'map-view', component: MapView },
    { path: '/settings', name: 'settings', component: Settings },
    { path: '/terms', name: 'terms', component: Terms },     // <--- NEW
    { path: '/privacy', name: 'privacy', component: Privacy } // <--- NEW
  ]
})

export default router
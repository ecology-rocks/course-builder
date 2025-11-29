import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue' // <--- Import Landing Page
import Dashboard from '../views/Dashboard.vue'
import MapEditor from '../components/MapEditor.vue'
import MapView from '../views/MapView.vue' // <--- Import
import Settings from '../views/Settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home // <--- Home is now default
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/editor',
      name: 'editor',
      component: MapEditor
    },
    {
      path: '/view/:id',
      name: 'map-view',
      component: MapView
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings
    }
  ]
})

export default router
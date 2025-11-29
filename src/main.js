import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva' // Import the library
import App from './App.vue'
import router from './router' // <--- Import the router

const app = createApp(App)

app.use(createPinia())
app.use(VueKonva) // Register it globally
app.use(router) // <--- Use the router
app.mount('#app')
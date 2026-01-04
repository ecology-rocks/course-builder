import DefaultTheme from 'vitepress/theme'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 1. Register Pinia so useMapStore() works
    const pinia = createPinia()
    app.use(pinia)

    // 2. Register Konva so <v-stage> works
    app.use(VueKonva)
  }
}
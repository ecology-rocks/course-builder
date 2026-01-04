# Data Connection Test

<script setup>
import { useMapStore } from '@/stores/mapStore.js' // Don't forget .js!
import { onMounted, ref } from 'vue'

const status = ref('Connecting...')
const dimensions = ref('Unknown')

onMounted(() => {
  try {
    const store = useMapStore()
    
    // Set some dummy data since Firebase won't load it
    store.ringDimensions = { width: 100, height: 100 }
    
    status.value = '✅ Connected to Store (with Mocked Firebase)'
    dimensions.value = `${store.ringDimensions.width} x ${store.ringDimensions.height}`
  } catch (e) {
    status.value = '❌ Error: ' + e.message
    console.error(e)
  }
})
</script>

Status: {{ status }}
Dimensions: {{ dimensions }}
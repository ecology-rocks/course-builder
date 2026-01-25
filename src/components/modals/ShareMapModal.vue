<script setup>
import { ref, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { toDataURL } from 'qrcode'

const emit = defineEmits(['close'])
const store = useMapStore()

const shareQrUrl = ref('')
const shareLink = ref('')
const error = ref(null)
const isLoading = ref(true)
const isPublishing = ref(false)

onMounted(async () => {
  // 1. Safety Check
  if (!store.currentMapId) {
    error.value = "Map is not saved. Save to cloud to generate a link."
    isLoading.value = false
    return
  }

  // 2. AUTO-PUBLISH: If map is private, make it public immediately
  if (!store.isShared) {
    isPublishing.value = true
    store.isShared = true
    try {
      await store.saveToCloud(true) // Silent save
    } catch (e) {
      console.error("Failed to publish map", e)
      error.value = "Could not update map permissions."
      isLoading.value = false
      return
    } finally {
      isPublishing.value = false
    }
  }

  // 3. Generate Link & QR
  shareLink.value = `${window.location.origin}/view/${store.currentMapId}`
  
  try {
    shareQrUrl.value = await toDataURL(shareLink.value, { 
      width: 250, 
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch (e) {
    console.error("QR Generation failed", e)
    error.value = "Could not generate QR Code."
  } finally {
    isLoading.value = false
  }
})

// [NEW] Download Logic
function downloadQr() {
  if (!shareQrUrl.value) return
  
  const link = document.createElement('a')
  link.href = shareQrUrl.value
  
  // Create a safe filename based on the map name
  const safeName = (store.mapName || 'map').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  link.download = `${safeName}_qr.png`
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function close() {
  emit('close')
}

function copyToClipboard() {
  if (!shareLink.value) return
  navigator.clipboard.writeText(shareLink.value)
  alert("Link copied to clipboard!")
}

async function stopSharing() {
  if (confirm("Are you sure? The existing link will stop working.")) {
    store.isShared = false
    await store.saveToCloud()
    close()
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal share-modal">
      <div class="modal-header">
        <h3>Share Map</h3>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="share-content">
        <div v-if="error" class="error-msg">{{ error }}</div>

        <div v-else-if="isPublishing" class="loading-state">
          <div class="spinner"></div>
          <p>Publishing map to cloud...</p>
        </div>

        <div v-else>
          <p>Anyone with this link can view the map layers (Read Only).</p>

          <div class="qr-preview">
            <span v-if="isLoading" class="loading">Generating QR...</span>
            <img v-if="shareQrUrl" :src="shareQrUrl" alt="Scan to View Map" />
          </div>

          <button v-if="shareQrUrl" @click="downloadQr" class="btn-text small-download">
            ⬇ Download Image
          </button>

          <div class="link-box">
            <input type="text" :value="shareLink" readonly @click="$event.target.select()" />
            <button @click="copyToClipboard">📋 Copy</button>
          </div>

          <hr />

          <button @click="stopSharing" class="btn-danger">Stop Sharing (Make Private)</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0,0,0,0.5); display: flex; 
  align-items: center; justify-content: center; z-index: 2000; 
}

.modal { 
  background: white; padding: 25px; border-radius: 8px; 
  min-width: 350px; max-width: 90%;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.modal-header { 
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; 
}
.modal-header h3 { margin: 0; color: #333; }

.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; }
.share-modal { text-align: center; }

.qr-preview {
  display: flex; justify-content: center; align-items: center;
  min-height: 200px; background: #f9f9f9; border-radius: 8px;
  margin-bottom: 10px; border: 1px solid #eee;
}

.qr-preview img { max-width: 100%; height: auto; }
.loading { color: #888; font-style: italic; }

/* [NEW] Small Download Link Style */
.small-download {
  display: block;
  margin: 0 auto 15px auto;
  font-size: 0.9rem;
  color: #2196f3;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}
.small-download:hover { color: #1976d2; }

.link-box { display: flex; gap: 8px; margin-bottom: 20px; }
.link-box input { 
  flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; 
  background: #f9f9f9; font-size: 0.9rem; color: #555; 
}
.link-box button { 
  cursor: pointer; background: #eee; border: 1px solid #ccc; 
  border-radius: 4px; padding: 0 15px; font-weight: bold;
}
.link-box button:hover { background: #e0e0e0; }

.btn-danger { 
  background: white; color: #d32f2f; border: 1px solid #ffcdd2; 
  width: 100%; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;
}
.btn-danger:hover { background: #ffebee; }

.error-msg { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 4px; }
.loading-state { padding: 40px; color: #666; font-style: italic; }

.spinner {
  border: 4px solid #f3f3f3; border-top: 4px solid #3498db;
  border-radius: 50%; width: 30px; height: 30px;
  animation: spin 1s linear infinite; margin: 0 auto 10px auto;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

hr { margin: 20px 0; border: 0; border-top: 1px solid #eee; }
</style>
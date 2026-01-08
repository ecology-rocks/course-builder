<script setup>
import { ref, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import QRCode from 'qrcode'

// Changed: No props, emit 'close'
const emit = defineEmits(['close'])
const store = useMapStore()

const shareQrUrl = ref('')
const shareLink = ref('')

// Changed: Generate QR on mount
onMounted(async () => {
  if (store.currentMapId) {
    shareLink.value = `${window.location.origin}/view/${store.currentMapId}`
    try {
      shareQrUrl.value = await QRCode.toDataURL(shareLink.value, { width: 250, margin: 2 })
    } catch (e) {
      console.error(e)
    }
  }
})

function close() {
  emit('close')
}

function copyToClipboard() {
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
        <p>Anyone with this link can view the map layers (Read Only).</p>

        <div class="qr-preview">
          <img :src="shareQrUrl" v-if="shareQrUrl" />
        </div>

        <div class="link-box">
          <input type="text" :value="shareLink" readonly />
          <button @click="copyToClipboard">📋 Copy</button>
        </div>

        <hr />

        <button @click="stopSharing" class="btn-danger">Stop Sharing (Make Private)</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; padding: 20px; border-radius: 8px; min-width: 350px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.share-modal { text-align: center; }
.qr-preview img { border: 1px solid #ddd; border-radius: 8px; margin: 10px 0; }
.link-box { display: flex; gap: 5px; margin-bottom: 20px; }
.link-box input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: #f9f9f9; }
.link-box button { cursor: pointer; }
.btn-danger { background: #ffebee; color: #d32f2f; border: 1px solid #d32f2f; width: 100%; padding: 10px; border-radius: 4px; cursor: pointer; }
.btn-danger:hover { background: #d32f2f; color: white; }
hr { margin: 20px 0; border: 0; border-top: 1px solid #eee; }
</style>
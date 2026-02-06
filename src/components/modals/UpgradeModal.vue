<script setup>
import { functions, auth } from '@/firebase'
import { httpsCallable } from 'firebase/functions'

const emit = defineEmits(['close'])
const PRICE_ID_FOUNDER = import.meta.env.VITE_STRIPE_PRICE_FOUNDER

async function handleUpgrade() {
  if (!auth.currentUser) return alert("Please login again.")
  if (!PRICE_ID_FOUNDER) return alert("System Error: Price ID missing.")

  try {
    const createSession = httpsCallable(functions, 'createCheckoutSession')
    const response = await createSession({
      priceId: PRICE_ID_FOUNDER,
      tierName: 'pro',
      successUrl: window.location.origin + '/dashboard',
      cancelUrl: window.location.origin + '/editor'
    })
    if (response.data.url) window.location.href = response.data.url
  } catch (e) {
    console.error(e)
    alert(`Payment failed: ${e.message}`)
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content highlight">
      <button class="close-btn" @click="emit('close')">×</button>
      
      <div class="header">
        <div class="badge">LIMITED TIME</div>
        <h2>Unlock Professional Tools</h2>
      </div>

      <div class="body">
        <p>Remove watermarks and get professional features with the <strong>Founder's License</strong>.</p>
        
        <ul class="benefits">
          <li>✅ <strong>Clean PDF Exports</strong> (No Watermark)</li>
          <li>✅ <strong>Cloud Save & Sync</strong></li>
          <li>✅ <strong>Future Offline App</strong> (Coming 2026)</li>
          <li>✅ <strong>Lock in $75/yr Price</strong> (Forever)</li>
        </ul>

        <div class="price-tag">
          <span class="currency">$</span>75<span class="period">/year</span>
        </div>

        <button @click="handleUpgrade" class="btn-upgrade">
          Upgrade Now
        </button>
        
        <p class="guarantee">Cancel anytime in Settings.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  position: relative;
  text-align: center;
  border: 4px solid #4CAF50; /* Green highlight */
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.close-btn {
  position: absolute; top: 10px; right: 10px;
  background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;
}

.badge {
  background: #e8f5e9; color: #2e7d32; display: inline-block;
  padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.8rem;
  margin-bottom: 10px; border: 1px solid #c8e6c9;
}

h2 { margin: 0 0 15px 0; color: #2c3e50; }

.benefits {
  text-align: left; list-style: none; padding: 0; margin: 20px 0;
  background: #f9f9f9; padding: 15px; border-radius: 8px;
}

.benefits li { margin-bottom: 8px; font-size: 0.95rem; }

.price-tag {
  font-size: 3rem; font-weight: 800; color: #2c3e50; margin: 10px 0 20px 0;
}
.currency { font-size: 1.5rem; vertical-align: super; }
.period { font-size: 1rem; color: #777; font-weight: normal; }

.btn-upgrade {
  width: 100%; background: #4CAF50; color: white; border: none;
  padding: 15px; font-size: 1.1rem; font-weight: bold; border-radius: 6px;
  cursor: pointer; transition: background 0.2s;
  box-shadow: 0 4px 6px rgba(76, 175, 80, 0.3);
}
.btn-upgrade:hover { background: #43a047; transform: translateY(-1px); }

.guarantee { margin-top: 15px; font-size: 0.85rem; color: #888; }
</style>
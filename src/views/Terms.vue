<script setup>
import AppFooter from '@/components/AppFooter.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="legal-page">
    <nav class="navbar">
      <div class="logo" @click="router.push('/')">🐾 K9CourseBuilder.com</div>
      <button @click="router.push('/')">Back to Home</button>
    </nav>

    <div class="content">
      <h1>Terms of Service</h1>
      <p>Last updated: {{ new Date().toLocaleDateString() }}</p>

      <h3>1. Acceptance of Terms</h3>
      <p>By accessing and using K9 Course Builder, you accept and agree to be bound by the terms and provision of this agreement.</p>

      <h3>2. Subscription & Payments</h3>
      <p>We offer paid subscriptions ("Solo", "Pro", "Club"). You agree to pay the fees associated with your chosen tier. Payments are processed securely via Stripe. You may cancel at any time via the Settings page.</p>

      <h3>3. User Generated Content</h3>
      <p>You retain ownership of the maps you create. By saving maps to the cloud, you grant us permission to host and display them as requested by you (e.g. for sharing).</p>

      <h3>4. Disclaimer</h3>
      <p>This tool is for educational and planning purposes. You are responsible for ensuring your physical course setups comply with official organization rules and safety standards.</p>

      <h3>5. Contact</h3>
      <p>For questions, please contact us at support@k9coursebuilder.com.</p>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
.legal-page { font-family: sans-serif; min-height: 100vh; display: flex; flex-direction: column; }
.navbar { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.logo { font-weight: 800; cursor: pointer; color: #2c3e50; }
.content { max-width: 800px; margin: 0 auto; padding: 40px 20px; flex: 1; }
h1 { margin-bottom: 10px; }
h3 { margin-top: 30px; margin-bottom: 10px; }
p { line-height: 1.6; color: #444; }
button { background: none; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
</style>
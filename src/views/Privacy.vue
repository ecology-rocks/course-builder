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
      <h1>Privacy Policy</h1>
      <p>Last updated: {{ new Date().toLocaleDateString() }}</p>

      <h3>1. Information We Collect</h3>
      <p>We collect your email address when you register. If you upgrade to a paid plan, our payment processor (Stripe) collects your payment details. We do not store credit card numbers on our servers.</p>

      <h3>2. How We Use Information</h3>
      <p>We use your information to provide account access, save your maps to the cloud, and process subscription payments.</p>

      <h3>3. Data Sharing</h3>
      <p>We do not sell your data. We only share data with service providers essential to our operation (e.g. Google Firebase for hosting, Stripe for payments).</p>

      <h3>4. Your Rights</h3>
      <p>You may request deletion of your account and data at any time by contacting support.</p>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
/* Same styles as Terms.vue */
.legal-page { font-family: sans-serif; min-height: 100vh; display: flex; flex-direction: column; }
.navbar { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.logo { font-weight: 800; cursor: pointer; color: #2c3e50; }
.content { max-width: 800px; margin: 0 auto; padding: 40px 20px; flex: 1; }
h1 { margin-bottom: 10px; }
h3 { margin-top: 30px; margin-bottom: 10px; }
p { line-height: 1.6; color: #444; }
button { background: none; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
</style>
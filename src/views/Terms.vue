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
      <p>Last updated: February 6, 2026</p>

      <h3>1. Acceptance of Terms</h3>
      <p>By accessing and using K9 Course Builder ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree, you must cease using the Service immediately.</p>

      <h3>2. Accounts & Security</h3>
      <p>You are responsible for maintaining the confidentiality of your account and password. You may not share your account credentials with others. We reserve the right to terminate accounts found to be shared or used in violation of these terms.</p>

      <h3>3. Subscription, Payments & Refunds</h3>
      <p>We offer paid subscriptions processed securely via Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis (monthly or annually) until you cancel.</p>
      <ul>
        <li><strong>Cancellation:</strong> You may cancel your renewal at any time via the Settings page. You will retain access until the end of your current billing period.</li>
        <li><strong>Refunds:</strong> Since this is a digital product with immediate access, all sales are final. We generally do not offer refunds for partial billing periods, but exceptions may be made for technical errors at our sole discretion.</li>
        <li><strong>Price Changes:</strong> We reserve the right to adjust pricing for our service or any components thereof in any manner and at any time. Any price changes will take effect following email notice to you.</li>
      </ul>

      <h3>4. User Generated Content & Data</h3>
      <p>You retain ownership of the maps you create. By saving maps to our cloud storage, you grant us a non-exclusive license to host, store, and display them as required to provide the Service. We are not responsible for any data loss; please keep local backups of critical course designs using the Export tool.</p>

      <h3>5. Use of Service & Disclaimer</h3>
      <p>This tool is for planning and design purposes only. It does not validate your maps for safety or rule compliance.</p>
      <p><strong>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong> You are solely responsible for ensuring your physical course setups comply with official organization rules (e.g., Barn Hunt Association, etc.) and safety standards. We are not liable for any injuries, disqualifications, or damages resulting from the use of course designs created with this tool.</p>

      <h3>6. Limitation of Liability</h3>
      <p>To the maximum extent permitted by law, K9 Course Builder shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.</p>

      <h3>7. Termination</h3>
      <p>We reserve the right to suspend or terminate your access to the Service at our sole discretion, without notice or liability, for any reason, including but not limited to a breach of these Terms.</p>

      <h3>8. Contact</h3>
      <p>For support or questions regarding these terms, please contact us at support@k9coursebuilder.com.</p>
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
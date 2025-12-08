<script setup>
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import AppFooter from '@/components/AppFooter.vue'

const userStore = useUserStore()
const router = useRouter()

function handleCta() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="landing-page">
    
    <div class="beta-banner">
      🚧 <strong>Public Beta:</strong> We are looking for testers! Stripe is in <u>Sandbox Mode</u> (No real cards charged). Use this app to help us find bugs.
    </div>

    <nav class="navbar">
      <div class="logo">🐾 K9CourseBuilder <span class="badge">BETA</span></div>
      <div class="nav-links">
        <button v-if="!userStore.user" @click="router.push('/dashboard')" class="btn-login">Login</button>
        <button v-else @click="router.push('/dashboard')" class="btn-login">Go to Dashboard</button>
      </div>
    </nav>

    <header class="hero">
      <div class="hero-content">
        <h1>Design Legal Courses <br> <span class="highlight">In Minutes, Not Hours</span></h1>
        <p class="subtitle">
          The specialized editor for Barn Hunt and Agility judges. <br>
          Stop fighting with PowerPoint and start designing.
        </p>
        <button @click="handleCta" class="cta-button">Start Building (It's Free)</button>
        <p class="tiny-text">No credit card required to sign up.</p>
      </div>
      <div class="hero-image">
        <div class="fake-screenshot">
          <div class="fs-header">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
          </div>
          <div class="fs-body">
            <div class="grid-preview">📦 📦 📦 🐕</div>
          </div>
        </div>
      </div>
    </header>

    <section class="features">
      <div class="feature-card">
        <div class="icon">📏</div>
        <h3>Auto-Validation</h3>
        <p>The editor knows the rules. It warns you if bales are unsupported or if you place obstacles out of bounds.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🔢</div>
        <h3>Smart Numbering</h3>
        <p>One-click renumbering tool. Drag obstacles around and the numbers stick with them.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🖨️</div>
        <h3>Pro Printouts</h3>
        <p>Generate clean, judge-ready PDF maps with branding, layer views, and proper headers.</p>
      </div>
    </section>

    <section class="pricing">
      <h2>Help Us Test</h2>
      <p class="pricing-sub">
        We are testing our subscription system. You can use the app for <strong>Free</strong>, 
        or help us test the "Upgrade" flow using a Stripe Test Card.
      </p>
      
      <div class="pricing-grid">
        <div class="price-card">
          <h3>Tester</h3>
          <div class="price">Free</div>
          <ul>
            <li>✅ 1 Sport (Agility OR Barn Hunt)</li>
            <li>✅ Create & Save Maps</li>
            <li>✅ Print Judge's Maps</li>
          </ul>
          <button @click="handleCta" class="btn-outline">Sign Up Free</button>
        </div>

        <div class="price-card featured">
          <div class="pill">Test This!</div>
          <h3>Club / Pro</h3>
          <div class="price">Sandbox</div>
          <p class="sand-note">Use Stripe Test Card (4242 4242 4242 4242 with any future date and any 3-digit code)</p>
          <ul>
            <li>✅ <strong>All Sports Unlocked</strong></li>
            <li>✅ Club Branding & Logo</li>
            <li>✅ Sponsor other Judges</li>
          </ul>
          <button @click="handleCta" class="btn-solid">Try Upgrade Flow</button>
        </div>
      </div>
    </section>

    <AppFooter />
  </div>
</template>

<style scoped>
/* BETA BANNER */
.beta-banner {
  background-color: #fff3cd;
  color: #856404;
  text-align: center;
  padding: 10px;
  font-size: 0.9rem;
  border-bottom: 1px solid #ffeeba;
}

/* NAVBAR */
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; max-width: 1200px; margin: 0 auto; }
.logo { font-weight: 800; font-size: 1.5rem; color: #2c3e50; display: flex; align-items: center; gap: 10px; }
.badge { background: #ff9800; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; vertical-align: middle; }
.btn-login { background: none; border: 2px solid #2c3e50; padding: 8px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; color: #2c3e50; transition: all 0.2s; }
.btn-login:hover { background: #2c3e50; color: white; }

/* HERO */
.hero { display: flex; flex-direction: column-reverse; align-items: center; padding: 40px 20px; max-width: 1200px; margin: 0 auto; gap: 40px; text-align: center; }
@media (min-width: 768px) {
  .hero { flex-direction: row; text-align: left; padding: 80px 40px; }
  .hero-content { flex: 1; }
  .hero-image { flex: 1; display: flex; justify-content: center; }
}

.hero h1 { font-size: 2.5rem; line-height: 1.2; margin-bottom: 20px; color: #2c3e50; }
.highlight { color: #4CAF50; }
.subtitle { font-size: 1.2rem; color: #666; margin-bottom: 30px; line-height: 1.6; }
.cta-button { background: #4CAF50; color: white; border: none; padding: 15px 40px; font-size: 1.1rem; font-weight: bold; border-radius: 30px; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); }
.cta-button:hover { transform: translateY(-2px); background: #45a049; }
.tiny-text { font-size: 0.8rem; color: #999; margin-top: 10px; }

/* FAKE SCREENSHOT */
.fake-screenshot { width: 100%; max-width: 400px; height: 300px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; }
.fs-header { background: #f0f0f0; padding: 10px; display: flex; gap: 6px; border-bottom: 1px solid #ddd; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.red { background: #ff5f56; } .yellow { background: #ffbd2e; } .green { background: #27c93f; }
.fs-body { flex: 1; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 3rem; }

/* FEATURES */
.features { display: flex; flex-wrap: wrap; gap: 30px; justify-content: center; padding: 60px 20px; background: #fff; }
.feature-card { flex: 1; min-width: 250px; max-width: 300px; padding: 30px; border-radius: 12px; background: #f9f9f9; text-align: center; border: 1px solid #eee; }
.icon { font-size: 3rem; margin-bottom: 15px; }
.feature-card h3 { margin-bottom: 10px; color: #2c3e50; }
.feature-card p { color: #666; line-height: 1.5; }

/* PRICING */
.pricing { padding: 60px 20px; text-align: center; background: #f4f6f8; }
.pricing h2 { margin-bottom: 10px; }
.pricing-sub { max-width: 600px; margin: 0 auto 40px auto; color: #666; }
.pricing-grid { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; }
.price-card { background: white; padding: 40px; border-radius: 12px; width: 300px; border: 1px solid #ddd; position: relative; }
.price-card.featured { border: 2px solid #4CAF50; transform: scale(1.05); }
.price { font-size: 2.5rem; font-weight: 800; color: #2c3e50; margin: 10px 0; }
.sand-note { color: #e65100; font-size: 0.9rem; font-weight: bold; margin-bottom: 15px; }
.pill { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #4CAF50; color: white; padding: 5px 15px; border-radius: 15px; font-size: 0.8rem; font-weight: bold; }
.price-card ul { list-style: none; padding: 0; text-align: left; margin: 20px 0; }
.price-card li { margin-bottom: 10px; color: #555; }
.btn-outline { width: 100%; padding: 12px; border: 1px solid #ccc; background: white; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-solid { width: 100%; padding: 12px; border: none; background: #2c3e50; color: white; border-radius: 6px; cursor: pointer; font-weight: bold; }
</style>
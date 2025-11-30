<script setup>
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

function handleCta() {
  if (userStore.user) {
    router.push('/dashboard')
  } else {
    router.push('/dashboard') // Dashboard handles the login form
  }
}
</script>

<template>
  <div class="landing-page">
    <nav class="navbar">
      <div class="logo">🐾 K9CourseBuilder.com</div>
      <div class="nav-links">
        <button v-if="userStore.user" @click="router.push('/dashboard')" class="btn-nav">
          Go to Dashboard
        </button>
        <button v-else @click="router.push('/dashboard')" class="btn-nav">
          Login
        </button>
      </div>
    </nav>

    <header class="hero">
      <h1>The Professional Map Builder for <span class="highlight">Dog Sports</span></h1>
      <p class="subtitle">
        Stop using spreadsheets and paint. Design legal, safe, and beautiful maps in minutes.
        Starting with <strong>Barn Hunt</strong>.
      </p>
      <button @click="handleCta" class="btn-cta">Start Building for Free</button>
      <div class="hero-image">
        <div class="fake-browser">
          <div class="browser-dots"><span></span><span></span><span></span></div>
          <div class="browser-content">📦 🐀 📦 📦 📦</div>
        </div>
      </div>
    </header>

    <section class="features">
      <div class="feature-card">
        <div class="icon">✅</div>
        <h3>Smart Validation</h3>
        <p>Never build an illegal map again. Our tool checks for tunnel darkness, safety steps, and bale support automatically.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🖨️</div>
        <h3>Print Ready</h3>
        <p>Generate PDF-ready layouts for Layer 1, 2, and 3 instantly. Your course builders will love you.</p>
      </div>
      <div class="feature-card">
        <div class="icon">☁️</div>
        <h3>Cloud Storage</h3>
        <p>Save your maps to the cloud. Access them from your phone at the trial site or your laptop at home.</p>
      </div>
    </section>

    <section class="pricing">
      <h2>Simple Pricing</h2>
      <div class="pricing-grid">
        
        <div class="price-card">
          <h3>Free</h3>
          <div class="price">$0<span>/mo</span></div>
          <ul>
            <li>✅ Barn Hunt Builder</li>
            <li>✅ Print Maps</li>
            <li>✅ Smart Validation</li>
            <li>❌ Cloud Saving</li>
            <li>❌ Export JSON</li>
          </ul>
          <button @click="router.push('/dashboard')" class="btn-outline">Try Now</button>
        </div>

        <div class="price-card popular">
          <div class="badge">MOST POPULAR</div>
          <h3>Solo Judge</h3>
          <div class="price">$8<span>/mo</span></div>
          <ul>
            <li>✅ <strong>Everything in Free</strong></li>
            <li>✅ Unlimited Cloud Saves</li>
            <li>✅ Import/Export JSON</li>
            <li>✅ Master Hide Markers</li>
          </ul>
          <button @click="router.push('/dashboard')" class="btn-solid">Get Solo</button>
        </div>

        <div class="price-card">
          <h3>Club</h3>
          <div class="price">$49<span>/mo (Coming Soon)</span></div>
          <ul>
            <li>✅ <strong>Everything in Solo</strong></li>
            <li>✅ Multi-Sport Access*</li>
            <li>✅ Agility Builder (Coming Soon)</li>
            <li>✅ Scent Work (Coming Soon)</li>
          </ul>
          <button @click="router.push('/dashboard')" class="btn-outline">Get Club</button>
        </div>

      </div>
    </section>

    <footer>
      <p>&copy; 2025 🐾 K9CourseBuilder.com - Built for Judges, by Judges.</p>
    </footer>
  </div>
</template>

<style scoped>
/* RESET & BASE */
.landing-page { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
h1, h2, h3 { margin: 0; font-weight: 700; }

/* NAVBAR */
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; max-width: 1200px; margin: 0 auto; }
.logo { font-size: 1.5rem; font-weight: 800; color: #2c3e50; }
.btn-nav { background: none; border: 2px solid #2c3e50; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; color: #2c3e50; transition: 0.2s; }
.btn-nav:hover { background: #2c3e50; color: white; }

/* HERO */
.hero { text-align: center; padding: 80px 20px 40px; background: linear-gradient(to bottom, #fdfbf7, #fff); }
.hero h1 { font-size: 3rem; margin-bottom: 20px; color: #2c3e50; }
.highlight { color: #4CAF50; }
.subtitle { font-size: 1.2rem; color: #666; max-width: 600px; margin: 0 auto 40px; }
.btn-cta { background: #4CAF50; color: white; border: none; padding: 15px 40px; font-size: 1.2rem; border-radius: 8px; cursor: pointer; font-weight: bold; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); }
.btn-cta:hover { transform: translateY(-2px); }

/* FAKE BROWSER IMAGE */
.hero-image { margin-top: 50px; display: flex; justify-content: center; }
.fake-browser { width: 80%; max-width: 800px; height: 300px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.1); overflow: hidden; }
.browser-dots { background: #f1f1f1; padding: 10px; display: flex; gap: 6px; }
.browser-dots span { width: 10px; height: 10px; border-radius: 50%; background: #ccc; }
.browser-content { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 3rem; color: #eee; background: #fafafa; }

/* FEATURES */
.features { display: flex; flex-wrap: wrap; justify-content: center; gap: 30px; padding: 80px 20px; background: white; max-width: 1200px; margin: 0 auto; }
.feature-card { flex: 1; min-width: 250px; max-width: 350px; padding: 30px; border-radius: 12px; background: #f9f9f9; text-align: center; }
.icon { font-size: 2.5rem; margin-bottom: 20px; }

/* PRICING */
.pricing { background: #f4f6f8; padding: 80px 20px; text-align: center; }
.pricing h2 { margin-bottom: 50px; font-size: 2.5rem; }
.pricing-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; max-width: 1000px; margin: 0 auto; align-items: center; }
.price-card { background: white; padding: 40px; border-radius: 12px; width: 280px; position: relative; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
.price-card.popular { border: 2px solid #4CAF50; transform: scale(1.05); z-index: 2; box-shadow: 0 10px 30px rgba(76, 175, 80, 0.15); }
.badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #4CAF50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
.price { font-size: 3rem; font-weight: 800; color: #2c3e50; margin: 20px 0; }
.price span { font-size: 1rem; color: #999; font-weight: 400; }
.price-card ul { list-style: none; padding: 0; margin-bottom: 30px; text-align: left; }
.price-card li { margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.btn-outline { background: white; border: 2px solid #ddd; color: #333; padding: 12px; width: 100%; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-solid { background: #2c3e50; border: none; color: white; padding: 12px; width: 100%; border-radius: 6px; cursor: pointer; font-weight: bold; }

/* FOOTER */
footer { text-align: center; padding: 40px; color: #666; font-size: 0.9rem; }

/* MOBILE */
@media (max-width: 768px) {
  .hero h1 { font-size: 2rem; }
  .price-card.popular { transform: none; }
}
</style>
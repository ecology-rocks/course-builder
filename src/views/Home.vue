<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from 'stores/userStore'
import AppFooter from 'components/AppFooter.vue'

const router = useRouter()
const userStore = useUserStore()

function handleCta() {
  if (userStore.user) {
    router.push('/dashboard')
  } else {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="landing-page">
    
    <nav class="navbar">
      <div class="logo">🐾 K9CourseBuilder</div>
      <div class="nav-actions">
        <button v-if="!userStore.user" @click="handleCta" class="btn-text">Log In</button>
        <button v-else @click="router.push('/dashboard')" class="btn-primary small">Go to Dashboard</button>
      </div>
    </nav>

    <header class="hero">
      <div class="hero-content">
        <div class="badge-pill">✨ New for 2026: Founder's Pricing</div>
        <h1>Stop Fighting with Excel. <br>Start Designing Courses.</h1>
        <p class="subtitle">
          Built for the judge who wants to spend more time with their dogs.
          The professional design tool that handles the rules so you don't have to.
        </p>
        
        <div class="cta-row">
          <button @click="handleCta" class="btn-primary big">Start Designing for Free</button>
          <span class="sub-text">No credit card required.</span>
        </div>
      </div>
    </header>

    <section class="features">
      <div class="container">
        <h2>Built for the Rules, Not just the Grid</h2>
        <div class="feature-grid">
          
          <div class="feature-card">
            <div class="icon">📐</div>
            <h3>Smart Scaling</h3>
            <p>Change ring size instantly or rearrange your course in a flash. Select, move, and rotate entire groups of objects without breaking a sweat.</p>
          </div>

          <div class="feature-card">
            <div class="icon">🪺</div>
            <h3>Made For Nesting</h3>
            <p>Design your whole day in one sitting. Compare against any other map and automatically calculate statistics within and between maps.</p>
          </div>

          <div class="feature-card">
            <div class="icon">⚖️</div>
            <h3>Perfect Prints</h3>
            <p>Generate fully legal maps with measurements, anchor bales, grid labels, legends, and statistics. No more revising fifty times because you forgot something.</p>
          </div>

        </div>
      </div>
    </section>

    <section class="pricing">
      <div class="container">
        <h2>Simple, Transparent Pricing</h2>
        <div class="pricing-cards">
          
          <div class="card">
            <div class="card-header">
              <h3>The Sandbox</h3>
              <div class="price">$0</div>
              <p class="term">Forever</p>
            </div>
            <ul>
              <li>✅ Unlimited Map Creation</li>
              <li>✅ Access to All Tools</li>
              <li>✅ <strong>JSON Import/Export</strong></li>
              <li>✅ Browser Autosave</li>
              <li class="dim">❌ Watermarked Prints</li>
              <li class="dim">❌ Cloud Sync</li>
            </ul>
            <button @click="handleCta" class="btn-outline">Try Free</button>
          </div>

          <div class="card highlight">
            <div class="badge">LIMITED TIME OFFER</div>
            <div class="card-header">
              <h3>Founder's Tier</h3>
              <div class="price">$59<span>/year</span></div>
              <p class="lock-in">Lock in this price forever.</p>
            </div>
            <ul>
              <li>✅ <strong>Clean, Legal Printouts</strong></li>
              <li>✅ <strong>Cloud Save & Sync</strong></li>
              <li>✅ <strong>Share Live Links</strong></li>
              <li>✨ <strong>Offline Desktop App</strong> <small>(Coming Late 2026)</small></li>
            </ul>
            <button @click="handleCta" class="btn-primary">Get the Deal</button>
          </div>

        </div>
        <div class="guarantee">
          <p>Standard pricing will be <strong>$89/year</strong> after launch. <br>Join now to keep the $59 rate for life.</p>
        </div>
      </div>
    </section>

    <AppFooter />
  </div>
</template>

<style scoped>
.landing-page { font-family: 'Inter', sans-serif; color: #333; background: #fff; }
.container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }

/* NAVBAR */
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; }
.logo { font-weight: 900; font-size: 1.2rem; color: #2c3e50; }
.btn-text { background: none; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; color: #2c3e50; }
.small { padding: 8px 16px; font-size: 0.9rem; }

/* HERO */
.hero {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 80px 0 100px 0;
  text-align: center;
}
.hero-content { max-width: 800px; margin: 0 auto; padding: 0 20px; }
.badge-pill { 
  display: inline-block; background: #e8f5e9; color: #2e7d32; 
  padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; 
  margin-bottom: 20px; border: 1px solid #c8e6c9;
}
.hero h1 { font-size: 3.5rem; margin-bottom: 20px; line-height: 1.1; color: #2c3e50; letter-spacing: -1px; }
.subtitle { font-size: 1.25rem; color: #555; margin-bottom: 40px; line-height: 1.6; }

.cta-row { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.big { padding: 18px 45px; font-size: 1.2rem; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.2); }
.sub-text { font-size: 0.9rem; color: #777; }

/* FEATURES */
.features { padding: 80px 0; background: white; }
.features h2 { text-align: center; font-size: 2rem; margin-bottom: 60px; color: #2c3e50; }
.feature-grid { display: flex; gap: 40px; flex-wrap: wrap; justify-content: center; }
.feature-card { flex: 1; min-width: 250px; max-width: 300px; text-align: center; }
.icon { font-size: 3.5rem; margin-bottom: 20px; display: inline-block; background: #f0f4f8; padding: 20px; border-radius: 50%; }
.feature-card h3 { margin-bottom: 10px; font-size: 1.3rem; color: #2c3e50; }
.feature-card p { color: #666; line-height: 1.6; }

/* PRICING */
.pricing { padding: 100px 0; background: #f8f9fa; border-top: 1px solid #eee; }
.pricing h2 { text-align: center; margin-bottom: 60px; font-size: 2.2rem; color: #2c3e50; }
.pricing-cards { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; align-items: flex-start; }

.card { 
  background: white; border: 1px solid #e1e4e8; border-radius: 16px; 
  padding: 40px; width: 320px; text-align: center; 
  transition: transform 0.2s;
}
.card:hover { transform: translateY(-5px); }

.card.highlight { 
  border: 2px solid #4CAF50; 
  background: #ffffff; 
  box-shadow: 0 10px 30px rgba(76, 175, 80, 0.15); 
  position: relative; 
  transform: scale(1.05);
}
.card.highlight:hover { transform: scale(1.08); }

.badge { 
  position: absolute; top: -14px; left: 50%; transform: translateX(-50%); 
  background: #4CAF50; color: white; padding: 6px 16px; 
  border-radius: 20px; font-weight: bold; font-size: 0.8rem; letter-spacing: 1px;
}

.card-header { border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
.card-header h3 { margin: 0 0 10px 0; color: #555; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; }
.price { font-size: 3rem; font-weight: 800; color: #2c3e50; }
.price span { font-size: 1.2rem; color: #999; font-weight: normal; }
.term { color: #999; }
.lock-in { font-size: 0.9rem; color: #2e7d32; font-weight: bold; margin-top: 5px; background: #e8f5e9; display: inline-block; padding: 4px 10px; border-radius: 4px; }

.card ul { list-style: none; padding: 0; margin-bottom: 30px; text-align: left; }
.card ul li { margin-bottom: 12px; font-size: 1rem; color: #444; display: flex; align-items: center; gap: 8px; }
.dim { opacity: 0.5; }

.btn-primary { background: #2c3e50; color: white; border: none; padding: 14px 25px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: background 0.2s; width: 100%; }
.btn-primary:hover { background: #34495e; }
.card.highlight .btn-primary { background: #4CAF50; }
.card.highlight .btn-primary:hover { background: #43a047; }

.btn-outline { background: white; border: 2px solid #e1e4e8; color: #333; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; }
.btn-outline:hover { border-color: #333; background: #f8f9fa; }

.guarantee { text-align: center; margin-top: 50px; color: #666; font-size: 1.1rem; }

@media (max-width: 768px) {
  .hero h1 { font-size: 2.5rem; }
  .feature-grid { flex-direction: column; align-items: center; }
  .pricing-cards { flex-direction: column; align-items: center; }
  .card.highlight { transform: scale(1); }
}
</style>
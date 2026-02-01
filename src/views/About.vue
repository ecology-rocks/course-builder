<script setup>
import { useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import samAndLuther from '../assets/sam_and_luther.jpg'
const router = useRouter()
</script>

<template>
  <div class="about-page">
    <nav class="navbar">
      <div class="logo" @click="router.push('/')" style="cursor: pointer">🐾 K9CourseBuilder</div>
      <div class="nav-actions">
        <button @click="router.push('/dashboard')" class="btn-text">Go to App</button>
      </div>
    </nav>

    <header class="about-hero">
      <div class="container">
        <h1>About the Project</h1>
        <p class="subtitle">Built by a competitor for the community.</p>
      </div>
    </header>

    <section class="content">
      <div class="container split-layout">
        <div class="text-side">
          <h2>Rooted in the Sport</h2>
          <p>
            K9CourseBuilder started in the straw. As both a competitor and trial chair, I've seen all kinds of maps from our judges. I always wondered how their maps were built, and when I started asking questions, I was horrified. Microsoft Publisher? Adobe Illustrator? Why wasn't there a dedicated map tool for Barn Hunt judges?
          </p>
          
          <p>
            We're all in dog sports for the same reason: to have fun with our dogs. I built this tool to address the biggest frustration of my judge-friends: course design. Don't waste days building maps. You can build a fully legal map in less than a half hour using this tool. You can build an entire trial's worth of maps in a few hours, not a few days. Your time is valuable, so take it back. 
          </p>

          <p>
            I'm an environmental scientist by training, with decades of web and programming experience. I don't have a team, or a fancy chatbot to wow you. I don't outsource to other programmers. This project is entirely a labor of love. I hope you'll trust me with your time and a little bit of your money, and in exchange, I will make this the best possible program for building dog sport maps. 
          </p>
          <p>
            I've had the chance to work with a great team of judges and members of the Barn Hunt administration community. Special thanks especially to Rachel Corbett, Katelyn Spooner, Joyce Shively, Sarah Bostock, Mark Shaw, Pam Opanowitz, and others who provided feedback at various points in this process. 
          </p>
        </div>

        <div class="image-side">
          <img :src="samAndLuther" alt="Sam and Luther" class="profile-img" />
          <p class="caption">Sam & Luther (Natural Twenty CZ8B RATS - Golden Doofus extraordinaire)</p>
        </div>
        
      </div>
    </section>

    <AppFooter />
  </div>
</template>

<style scoped>
.about-page { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
.container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }

.navbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; }
.logo { font-weight: 900; font-size: 1.2rem; color: #2c3e50; }

.about-hero { background: #f8f9fa; padding: 60px 0; text-align: center; border-bottom: 1px solid #eee; }
.about-hero h1 { font-size: 2.5rem; margin-bottom: 10px; color: #2c3e50; }

.content { padding: 60px 0; }
.split-layout { display: flex; gap: 60px; align-items: center; }

.text-side { flex: 1; }
.text-side h2 { font-size: 1.8rem; margin-bottom: 20px; color: #2c3e50; }
.text-side p { margin-bottom: 20px; font-size: 1.05rem; color: #555; }

.image-side { flex: 0 0 350px; }
.profile-img {
  width: 100%;
  max-width: 400px; /* Limits the maximum width of the photo */
  height: auto;      /* Maintains aspect ratio */
  border-radius: 12px;
  object-fit: cover; /* Ensures the image fills the area if you set a fixed height */
  display: block;
}

@media (max-width: 768px) {
  .profile-img {
    max-width: 100%; /* Allows image to fill the screen on mobile */
    margin: 0 auto;
  }
}

.btn-text { background: none; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; color: #2c3e50; }

@media (max-width: 768px) {
  .split-layout { flex-direction: column-reverse; gap: 40px; }
  .image-side { width: 100%; max-width: 350px; margin: 0 auto; }
}
</style>
<template>
  <section class="hero-banner">
    <div class="hero-bg">
      <div class="particles" v-if="themeStore.isLight">
        <div 
          v-for="i in 20" 
          :key="i" 
          class="particle morning-particle"
          :style="getParticleStyle(i)"
        ></div>
      </div>
      <div class="stars" v-if="themeStore.isDark">
        <div 
          v-for="i in 50" 
          :key="i" 
          class="star star-twinkle"
          :style="getStarStyle(i)"
        ></div>
      </div>
    </div>
    
    <div class="hero-content">
      <div class="container">
        <div class="hero-text">
          <h1 class="hero-title fade-in-up">她的诗集</h1>
          <p class="hero-subtitle fade-in-up delay-1">她名中有晓，所以每一首诗都带一点光</p>
          <p class="hero-description fade-in-up delay-2">
            在文字的世界里，每一个字都是光，每一句话都是温暖的拥抱
          </p>
          <div class="hero-actions fade-in-up delay-3">
            <router-link to="/posts" class="btn-primary">开始阅读</router-link>
            <router-link to="/series" class="btn-secondary">浏览系列</router-link>
          </div>
        </div>
        
        <div class="hero-image float">
          <div class="image-container">
            <div class="image-placeholder">
              <!-- 这里可以放置插画或图片 -->
              <div class="poem-preview">
                <div class="poem-lines">
                  <span class="poem-line">晨曦透过窗棂</span>
                  <span class="poem-line delay-1">轻抚沉睡的大地</span>
                  <span class="poem-line delay-2">那是希望的颜色</span>
                  <span class="poem-line delay-3">也是梦想的开始</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useThemeStore } from '@/store/theme'

const themeStore = useThemeStore()

const getParticleStyle = (index) => {
  const delay = Math.random() * 3
  const duration = 3 + Math.random() * 2
  const left = Math.random() * 100
  const size = 2 + Math.random() * 4
  
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`
  }
}

const getStarStyle = (index) => {
  const delay = Math.random() * 5
  const duration = 2 + Math.random() * 3
  const left = Math.random() * 100
  const top = Math.random() * 100
  const size = 1 + Math.random() * 2
  
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`
  }
}
</script>

<style scoped>
.hero-banner {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--bg-primary);
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  background: var(--accent-primary);
  border-radius: 50%;
  opacity: 0.6;
  animation: morningParticle 3s ease-in-out infinite;
}

.stars {
  position: absolute;
  width: 100%;
  height: 100%;
}

.star {
  position: absolute;
  background: var(--accent-primary);
  border-radius: 50%;
  opacity: 0.8;
  animation: starTwinkle 2s ease-in-out infinite;
}

.hero-content {
  position: relative;
  z-index: 2;
  width: 100%;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1.2;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin: 0;
}

.hero-description {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-container {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  position: relative;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: var(--card-bg);
  border: 2px dashed var(--border-color);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.poem-preview {
  text-align: center;
  padding: 40px 20px;
}

.poem-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.poem-line {
  display: block;
  color: var(--text-secondary);
  font-size: 16px;
  font-style: italic;
  opacity: 0;
  animation: fadeInUp 0.8s ease forwards;
}

.poem-line.delay-1 { animation-delay: 0.2s; }
.poem-line.delay-2 { animation-delay: 0.4s; }
.poem-line.delay-3 { animation-delay: 0.6s; }

@media (max-width: 1024px) {
  .container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }
  
  .hero-title {
    font-size: 3rem;
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
  }
}

@media (max-width: 768px) {
  .hero-banner {
    min-height: 80vh;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .hero-description {
    font-size: 1rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 200px;
    text-align: center;
  }
  
  .image-container {
    max-width: 300px;
  }
  
  .poem-preview {
    padding: 30px 15px;
  }
  
  .poem-line {
    font-size: 14px;
  }
}
</style>

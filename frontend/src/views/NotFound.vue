<template>
  <div class="not-found">
    <div class="container">
      <div class="error-content">
        <div class="error-animation">
          <div class="error-number">4</div>
          <div class="error-icon">🌸</div>
          <div class="error-number">4</div>
        </div>
        
        <h1 class="error-title">页面走丢了</h1>
        <p class="error-description">
          抱歉，您访问的页面不存在或已被移除。<br>
          就像诗句中偶尔走失的韵脚，让我们重新找到回家的路。
        </p>
        
        <div class="error-actions">
          <router-link to="/" class="btn-primary">回到首页</router-link>
          <button @click="goBack" class="btn-secondary">返回上页</button>
        </div>
        
        <div class="error-suggestions">
          <h3>您可能在寻找：</h3>
          <ul class="suggestions-list">
            <li><router-link to="/posts">文章列表</router-link></li>
            <li><router-link to="/series">系列合集</router-link></li>
            <li><router-link to="/tags">标签索引</router-link></li>
            <li><router-link to="/archive">文章归档</router-link></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.container {
  width: 100%;
  max-width: 600px;
  text-align: center;
}

.error-content {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: var(--shadow-medium);
  border: 1px solid var(--border-color);
}

.error-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 32px;
  font-size: 6rem;
  font-weight: 700;
}

.error-number {
  color: var(--accent-primary);
  animation: bounce 2s ease-in-out infinite;
}

.error-number:nth-child(3) {
  animation-delay: 0.2s;
}

.error-icon {
  animation: float 3s ease-in-out infinite;
  font-size: 4rem;
}

.error-title {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-description {
  font-size: 1.1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  font-size: 16px;
}

.btn-primary {
  background: var(--accent-gradient);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium);
}

.btn-secondary {
  background: transparent;
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
}

.btn-secondary:hover {
  background: var(--accent-primary);
  color: white;
}

.error-suggestions {
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
}

.error-suggestions h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.suggestions-list li {
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.suggestions-list li:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.suggestions-list a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s ease;
}

.suggestions-list li:hover a {
  color: white;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translateY(0);
  }
  40%, 43% {
    transform: translateY(-20px);
  }
  70% {
    transform: translateY(-10px);
  }
  90% {
    transform: translateY(-5px);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) rotate(5deg);
  }
  50% {
    transform: translateY(-5px) rotate(0deg);
  }
  75% {
    transform: translateY(-15px) rotate(-5deg);
  }
}

@media (max-width: 768px) {
  .error-content {
    padding: 40px 24px;
  }
  
  .error-animation {
    font-size: 4rem;
    gap: 15px;
  }
  
  .error-icon {
    font-size: 3rem;
  }
  
  .error-title {
    font-size: 2rem;
  }
  
  .error-description {
    font-size: 1rem;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 200px;
  }
  
  .suggestions-list {
    flex-direction: column;
    align-items: center;
  }
}
</style>

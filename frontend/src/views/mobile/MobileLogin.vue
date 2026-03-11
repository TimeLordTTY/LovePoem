<template>
  <div class="login-page">
    <div class="login-brand"><em>白秦</em>的文字</div>
    <p class="login-subtitle">写给世界，也写给自己。</p>
    <div class="login-form">
      <input
        class="login-input"
        type="text"
        placeholder="用户名"
        v-model="username"
        @keyup.enter="$refs.pwdInput?.focus()"
      />
      <input
        ref="pwdInput"
        class="login-input"
        type="password"
        placeholder="密码"
        v-model="password"
        @keyup.enter="doLogin"
      />
      <button class="login-btn" :disabled="loading" @click="doLogin">
        {{ loading ? '登录中...' : '登 录' }}
      </button>
    </div>
    <p class="login-alt">还没有账号？<a @click="$router.push('/m/register')">立即注册</a></p>
    <p class="login-skip" @click="goSkip">跳过，先随便看看 →</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

const doLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.login({ username: username.value, password: password.value })
    ElMessage.success('登录成功')
    router.replace('/m')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}

const goSkip = () => {
  router.replace('/m')
}
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  background:
    radial-gradient(circle at 20% 20%, rgba(252, 231, 243, 0.7), transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(219, 234, 254, 0.7), transparent 50%),
    #FAFBFE;
  font-family: -apple-system, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.login-brand {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
  color: #0F172A;
}
.login-brand em {
  font-style: normal;
  color: #E11D48;
}

.login-subtitle {
  font-size: 13px;
  color: #94A3B8;
  margin-bottom: 36px;
}

.login-form {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(148,163,184,0.18);
  background: rgba(255,255,255,0.82);
  font-size: 15px;
  color: #0F172A;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.login-input:focus {
  border-color: #E11D48;
}
.login-input::placeholder {
  color: #94A3B8;
}

.login-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #E11D48, #BE123C);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(225, 29, 72, 0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}
.login-btn:active {
  transform: scale(0.97);
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2);
}
.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-alt {
  margin-top: 16px;
  font-size: 13px;
  color: #94A3B8;
}
.login-alt a {
  color: #E11D48;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}

.login-skip {
  margin-top: 24px;
  font-size: 13px;
  color: #94A3B8;
  cursor: pointer;
}
.login-skip:hover {
  color: #64748B;
}
</style>

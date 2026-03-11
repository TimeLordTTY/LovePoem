<template>
  <div class="m-register">
    <div class="reg-brand">
      <h1><span style="color:#E11D48">白秦</span>的文字</h1>
      <p>创建账号，开始你的阅读之旅</p>
    </div>

    <div class="reg-form">
      <input v-model="form.username" type="text" placeholder="用户名（3-50字符）"
        class="reg-input" @blur="checkUser" />
      <span v-if="userErr" class="field-err">{{ userErr }}</span>

      <input v-model="form.displayName" type="text" placeholder="显示名称"
        class="reg-input" />

      <input v-model="form.email" type="email" placeholder="邮箱（可选）"
        class="reg-input" @blur="checkMail" />
      <span v-if="mailErr" class="field-err">{{ mailErr }}</span>

      <input v-model="form.password" type="password" placeholder="密码（6-50字符）"
        class="reg-input" />

      <input v-model="form.confirmPassword" type="password" placeholder="确认密码"
        class="reg-input" />

      <button class="reg-btn" :disabled="loading" @click="doRegister">
        {{ loading ? '注册中...' : '立即注册' }}
      </button>
    </div>

    <p class="reg-alt">已有账号？<a @click="$router.push('/m/login')">去登录</a></p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register, checkUsername, checkEmail } from '@/api/auth'

const router = useRouter()
const loading = ref(false)
const userErr = ref('')
const mailErr = ref('')

const form = reactive({
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const checkUser = async () => {
  userErr.value = ''
  if (!form.username || form.username.length < 3) {
    userErr.value = '用户名至少3个字符'
    return
  }
  try {
    const resp = await checkUsername(form.username)
    if (resp.data) userErr.value = '用户名已被使用'
  } catch { /* ignore */ }
}

const checkMail = async () => {
  mailErr.value = ''
  if (!form.email) return
  try {
    const resp = await checkEmail(form.email)
    if (resp.data) mailErr.value = '邮箱已被使用'
  } catch { /* ignore */ }
}

const doRegister = async () => {
  if (!form.username || form.username.length < 3) {
    ElMessage.warning('用户名至少3个字符')
    return
  }
  if (!form.password || form.password.length < 6) {
    ElMessage.warning('密码至少6个字符')
    return
  }
  if (form.password !== form.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }
  if (userErr.value || mailErr.value) return

  loading.value = true
  try {
    await register({
      username: form.username,
      displayName: form.displayName || form.username,
      email: form.email || undefined,
      password: form.password
    })
    ElMessage.success('注册成功，请登录')
    router.replace('/m/login')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '注册失败')
  }
  loading.value = false
}
</script>

<style scoped>
.m-register {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 28px;
  background: radial-gradient(ellipse at 50% 0%, rgba(225,29,72,0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 100%, rgba(124,58,237,0.05) 0%, transparent 50%),
              #FAFBFE;
  font-family: -apple-system, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.reg-brand { text-align: center; margin-bottom: 28px; }
.reg-brand h1 { font-size: 22px; font-weight: 700; color: #0F172A; }
.reg-brand p { font-size: 13px; color: #94A3B8; margin-top: 6px; }

.reg-form { width: 100%; max-width: 340px; }

.reg-input {
  display: block;
  width: 100%;
  padding: 13px 16px;
  margin-bottom: 6px;
  border-radius: 14px;
  border: 0.5px solid rgba(148,163,184,0.25);
  background: rgba(255,255,255,0.8);
  font-size: 14px;
  color: #0F172A;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.reg-input:focus { border-color: #E11D48; }
.reg-input::placeholder { color: #CBD5E1; }

.field-err {
  display: block;
  font-size: 11px;
  color: #E11D48;
  padding: 0 4px 6px;
}

.reg-btn {
  display: block;
  width: 100%;
  padding: 14px;
  margin-top: 10px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #E11D48, #BE123C);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 2px;
}
.reg-btn:disabled { opacity: 0.6; }
.reg-btn:active:not(:disabled) { transform: scale(0.98); }

.reg-alt {
  margin-top: 16px;
  font-size: 13px;
  color: #94A3B8;
}
.reg-alt a { color: #E11D48; cursor: pointer; font-weight: 500; }
</style>

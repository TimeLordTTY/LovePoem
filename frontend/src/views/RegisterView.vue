<template>
  <div class="register-view">
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <h2>用户注册</h2>
          <p>加入我们，收藏您喜欢的文章</p>
        </div>

        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-width="80px"
          @submit.prevent="handleRegister"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="registerForm.username"
              placeholder="请输入用户名（3-50字符）"
              @blur="checkUsernameAvailable"
            />
          </el-form-item>

          <el-form-item label="显示名称" prop="displayName">
            <el-input
              v-model="registerForm.displayName"
              placeholder="请输入显示名称"
            />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model="registerForm.email"
              type="email"
              placeholder="请输入邮箱（可选）"
              @blur="checkEmailAvailable"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="请输入密码（6-50字符）"
              show-password
            />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="registering"
              @click="handleRegister"
              class="register-btn"
            >
              注册
            </el-button>
            <el-button @click="goToLogin" class="login-link-btn">
              已有账号？去登录
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register, checkUsername, checkEmail } from '@/api/auth'

const router = useRouter()
const registerFormRef = ref(null)
const registering = ref(false)

const registerForm = reactive({
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 自定义验证规则
const validateUsername = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入用户名'))
  } else if (value.length < 3 || value.length > 50) {
    callback(new Error('用户名长度必须在3-50字符之间'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  username: [{ validator: validateUsername, trigger: 'blur' }],
  displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度必须在6-50字符之间', trigger: 'blur' }
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

// 检查用户名是否可用
const checkUsernameAvailable = async () => {
  if (!registerForm.username || registerForm.username.length < 3) return

  try {
    const response = await checkUsername(registerForm.username)
    if (response.data) {
      ElMessage.warning('用户名已存在，请换一个')
    }
  } catch (error) {
    console.error('检查用户名失败:', error)
  }
}

// 检查邮箱是否可用
const checkEmailAvailable = async () => {
  if (!registerForm.email) return

  try {
    const response = await checkEmail(registerForm.email)
    if (response.data) {
      ElMessage.warning('邮箱已被使用，请换一个')
    }
  } catch (error) {
    console.error('检查邮箱失败:', error)
  }
}

// 处理注册
const handleRegister = async () => {
  try {
    await registerFormRef.value.validate()
    registering.value = true

    await register(registerForm)
    ElMessage.success('注册成功！请登录')
    router.push('/login')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('注册失败:', error)
      ElMessage.error(error.message || '注册失败')
    }
  } finally {
    registering.value = false
  }
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.register-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  padding: 20px;
}

.register-container {
  width: 100%;
  max-width: 400px;
}

.register-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  box-shadow: var(--shadow-medium);
  border: 1px solid var(--border-color);
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-header h2 {
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
}

.register-header p {
  color: var(--text-secondary);
  font-size: 14px;
}

.register-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  margin-bottom: 16px;
}

.login-link-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.el-form-item {
  margin-bottom: 24px;
}

.el-input {
  height: 44px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .register-view {
    padding: 10px;
  }
  
  .register-card {
    padding: 24px;
  }
}
</style> 
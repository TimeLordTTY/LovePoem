<template>
  <div class="m-settings">
    <div class="settings-top">
      <button class="back" @click="$router.back()">←</button>
      <div class="top-title">个人设置</div>
      <div style="width:32px"></div>
    </div>

    <div class="settings-body" v-if="loaded">
      <!-- 基本信息 -->
      <div class="section">
        <div class="sec-label">基本信息</div>

        <div class="form-group">
          <label>昵称</label>
          <input v-model="profile.displayName" class="m-input" placeholder="设置你的昵称" />
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input :value="profile.email" class="m-input" disabled placeholder="暂不支持修改" />
        </div>
        <div class="form-group">
          <label>个人简介</label>
          <textarea v-model="profile.bio" class="m-input m-textarea" rows="3" placeholder="介绍一下自己吧"></textarea>
        </div>

        <button class="save-btn" :disabled="saving" @click="saveProfile">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </div>

      <!-- 修改密码 -->
      <div class="section">
        <div class="sec-label">修改密码</div>

        <div class="form-group">
          <label>旧密码</label>
          <input v-model="pwd.oldPassword" type="password" class="m-input" placeholder="输入当前密码" />
        </div>
        <div class="form-group">
          <label>新密码</label>
          <input v-model="pwd.newPassword" type="password" class="m-input" placeholder="输入新密码（6位以上）" />
        </div>
        <div class="form-group">
          <label>确认密码</label>
          <input v-model="pwd.confirmPassword" type="password" class="m-input" placeholder="再次输入新密码" />
        </div>

        <button class="save-btn pwd-btn" :disabled="changingPwd" @click="doChangePwd">
          {{ changingPwd ? '修改中...' : '修改密码' }}
        </button>
      </div>
    </div>

    <div v-else class="loading-text">加载中...</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserProfile, updateUserProfile, changePassword } from '@/api/user'

const loaded = ref(false)
const saving = ref(false)
const changingPwd = ref(false)

const profile = reactive({ displayName: '', email: '', bio: '' })
const pwd = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

onMounted(async () => {
  try {
    const resp = await getUserProfile()
    const d = resp.data || {}
    profile.displayName = d.displayName || ''
    profile.email = d.email || ''
    profile.bio = d.bio || ''
  } catch { /* ignore */ }
  loaded.value = true
})

const saveProfile = async () => {
  if (!profile.displayName) { ElMessage.warning('昵称不能为空'); return }
  saving.value = true
  try {
    await updateUserProfile({ displayName: profile.displayName, bio: profile.bio })
    ElMessage.success('保存成功')
  } catch { ElMessage.error('保存失败') }
  saving.value = false
}

const doChangePwd = async () => {
  if (!pwd.oldPassword) { ElMessage.warning('请输入旧密码'); return }
  if (!pwd.newPassword || pwd.newPassword.length < 6) { ElMessage.warning('新密码至少6个字符'); return }
  if (pwd.newPassword !== pwd.confirmPassword) { ElMessage.warning('两次密码不一致'); return }
  changingPwd.value = true
  try {
    await changePassword({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword })
    ElMessage.success('密码修改成功')
    pwd.oldPassword = ''
    pwd.newPassword = ''
    pwd.confirmPassword = ''
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '修改失败')
  }
  changingPwd.value = false
}
</script>

<style scoped>
.m-settings {
  min-height: 100vh;
  background: #FAFBFE;
  font-family: -apple-system, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif;
  color: #0F172A;
}

.settings-top {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(250, 251, 254, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 0.5px solid rgba(148, 163, 184, 0.12);
}
.settings-top .back {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #F1F3F8;
  color: #64748B;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings-top .top-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.settings-body { padding: 16px; }

.section {
  background: rgba(255, 255, 255, 0.82);
  border: 0.5px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.sec-label {
  font-size: 15px;
  font-weight: 600;
  color: #0F172A;
  margin-bottom: 14px;
}

.form-group {
  margin-bottom: 12px;
}
.form-group label {
  display: block;
  font-size: 12px;
  color: #64748B;
  margin-bottom: 4px;
  font-weight: 500;
}

.m-input {
  display: block;
  width: 100%;
  padding: 11px 14px;
  border-radius: 12px;
  border: 0.5px solid rgba(148, 163, 184, 0.25);
  background: #FAFBFE;
  font-size: 14px;
  color: #0F172A;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}
.m-input:focus { border-color: #E11D48; }
.m-input:disabled { color: #94A3B8; background: #F1F3F8; }
.m-input::placeholder { color: #CBD5E1; }
.m-textarea { resize: vertical; min-height: 60px; }

.save-btn {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 6px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #E11D48, #BE123C);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.save-btn:disabled { opacity: 0.6; }
.save-btn:active:not(:disabled) { transform: scale(0.98); }

.pwd-btn {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
}

.loading-text {
  text-align: center;
  padding: 60px 0;
  font-size: 13px;
  color: #94A3B8;
}
</style>

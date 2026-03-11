<template>
  <div class="m-profile">
    <!-- 已登录 -->
    <template v-if="authStore.isLoggedIn && user">
      <div class="profile-header">
        <div class="avatar">{{ avatarChar }}</div>
        <div class="profile-name">{{ user.displayName || user.username }}</div>
        <div class="profile-bio">{{ user.bio || '写给世界，也写给自己。' }}</div>
      </div>

      <div class="stat-row">
        <div class="stat-box">
          <div class="num">{{ todayCheckins }}</div>
          <div class="label">今日阅读</div>
        </div>
        <div class="stat-box">
          <div class="num">{{ streakDays }}</div>
          <div class="label">连续打卡</div>
        </div>
        <div class="stat-box">
          <div class="num">{{ favoriteCount }}</div>
          <div class="label">收藏</div>
        </div>
      </div>

      <div class="menu-list">
        <div class="menu-item" @click="$router.push('/m/library')">
          <span>阅读记录</span>
          <span class="arrow">›</span>
        </div>
        <div class="menu-item" @click="$router.push('/m/settings')">
          <span>个人设置</span>
          <span class="arrow">›</span>
        </div>
        <div class="menu-item" @click="doLogout">
          <span style="color: #E11D48">退出登录</span>
          <span class="arrow">›</span>
        </div>
      </div>
    </template>

    <!-- 未登录 -->
    <template v-else>
      <div class="profile-header">
        <div class="avatar">?</div>
        <div class="profile-name">未登录</div>
        <div class="profile-bio">登录后享受完整体验</div>
      </div>

      <div class="stat-row">
        <div class="stat-box">
          <div class="num">{{ todayCheckins }}</div>
          <div class="label">今日阅读</div>
        </div>
        <div class="stat-box">
          <div class="num">{{ streakDays }}</div>
          <div class="label">连续打卡</div>
        </div>
        <div class="stat-box">
          <div class="num">0</div>
          <div class="label">收藏</div>
        </div>
      </div>

      <div class="menu-list">
        <div class="menu-item" @click="$router.push('/m/login')">
          <span style="color: #E11D48">登录 / 注册</span>
          <span class="arrow">›</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { getFavorites } from '@/api/favorite'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)
const favoriteCount = ref(0)
const todayCheckins = ref(0)
const streakDays = ref(0)

const avatarChar = computed(() => {
  const name = user.value?.displayName || user.value?.username || '?'
  return name.charAt(0)
})

const calcCheckins = () => {
  const uid = authStore.user?.id || 'anon'
  const prefix = `mStreak:${uid}:`
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  const datesSet = new Set()
  Object.keys(localStorage)
    .filter(k => k.startsWith(prefix))
    .forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        if (data.date) datesSet.add(data.date)
      } catch { /* ignore */ }
    })
  todayCheckins.value = [...datesSet].includes(todayStr) ? 1 : 0
  streakDays.value = datesSet.size
}

const loadFavoriteCount = async () => {
  if (!authStore.isLoggedIn) { favoriteCount.value = 0; return }
  try {
    const resp = await getFavorites()
    const d = resp.data
    const list = Array.isArray(d) ? d : (d?.records || [])
    favoriteCount.value = d?.total ?? list.length
  } catch { favoriteCount.value = 0 }
}

const doLogout = () => {
  authStore.logout()
  router.replace('/m/login')
}

onMounted(() => {
  calcCheckins()
  loadFavoriteCount()
})
</script>

<style scoped>
.m-profile { animation: mPageIn 0.28s ease; }

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0 16px;
  margin-top: 8px;
}
.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E11D48, #7C3AED);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(225, 29, 72, 0.25);
}
.profile-name { margin-top: 12px; font-size: 18px; font-weight: 700; color: #0F172A; }
.profile-bio { font-size: 12px; color: #94A3B8; margin-top: 4px; }

.stat-row { display: flex; gap: 8px; margin-top: 16px; }
.stat-box {
  flex: 1;
  padding: 14px 10px;
  border-radius: 12px;
  text-align: center;
  background: rgba(255,255,255,0.82);
  border: 0.5px solid rgba(148,163,184,0.18);
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}
.stat-box .num { font-size: 22px; font-weight: 700; color: #0F172A; }
.stat-box .label { font-size: 11px; color: #94A3B8; margin-top: 2px; }

.menu-list {
  margin-top: 18px;
  border-radius: 12px;
  overflow: hidden;
  border: 0.5px solid rgba(148,163,184,0.18);
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255,255,255,0.82);
  font-size: 14px;
  cursor: pointer;
  border-bottom: 0.5px solid rgba(148,163,184,0.18);
  color: #0F172A;
}
.menu-item:last-child { border-bottom: none; }
.menu-item .arrow { color: #94A3B8; font-size: 14px; }
</style>

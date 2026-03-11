import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '白秦的文字世界 - 白秦' }
  },
  {
    path: '/posts',
    name: 'Posts',
    component: () => import('@/views/PostsView.vue'),
    meta: { title: '文章列表' }
  },
  // 手机端登录
  {
    path: '/m/login',
    name: 'MobileLogin',
    component: () => import('@/views/mobile/MobileLogin.vue'),
    meta: { title: '登录', isMobile: true }
  },
  // 手机端注册
  {
    path: '/m/register',
    name: 'MobileRegister',
    component: () => import('@/views/mobile/MobileRegister.vue'),
    meta: { title: '注册', isMobile: true }
  },
  // 手机端个人设置
  {
    path: '/m/settings',
    name: 'MobileSettings',
    component: () => import('@/views/mobile/MobileSettings.vue'),
    meta: { title: '个人设置', isMobile: true, requiresAuth: true }
  },
  // 手机端文章列表（独立全屏，不带 Shell）
  {
    path: '/m/posts',
    name: 'MobilePosts',
    component: () => import('@/views/mobile/MobilePostsList.vue'),
    meta: { title: '文章列表', isMobile: true }
  },
  // 手机端阅读页（独立全屏，不带 Shell）
  {
    path: '/m/read/:slug',
    name: 'MobileReading',
    component: () => import('@/views/mobile/MobileReadingPage.vue'),
    meta: { title: '阅读', isMobile: true }
  },
  // 手机端主框架
  {
    path: '/m',
    component: () => import('@/views/mobile/MobileShell.vue'),
    children: [
      {
        path: '',
        name: 'MobileHome',
        component: () => import('@/views/mobile/MobileHome.vue'),
        meta: { title: '首页', isMobile: true }
      },
      {
        path: 'library',
        name: 'MobileLibrary',
        component: () => import('@/views/mobile/MobileLibrary.vue'),
        meta: { title: '书架', isMobile: true }
      },
      {
        path: 'discover',
        name: 'MobileDiscover',
        component: () => import('@/views/mobile/MobileDiscover.vue'),
        meta: { title: '发现', isMobile: true }
      },
      {
        path: 'profile',
        name: 'MobileProfile',
        component: () => import('@/views/mobile/MobileProfile.vue'),
        meta: { title: '我的', isMobile: true }
      }
    ]
  },
  {
    path: '/post/:slug',
    name: 'PostDetail',
    component: () => import('@/views/PostDetail.vue'),
    meta: { title: '文章详情' }
  },
  {
    path: '/series',
    name: 'Series',
    component: () => import('@/views/SeriesView.vue'),
    meta: { title: '系列' }
  },
  {
    path: '/series/:id',
    name: 'SeriesDetail',
    component: () => import('@/views/SeriesDetail.vue'),
    meta: { title: '系列详情' }
  },
  {
    path: '/tags',
    name: 'Tags',
    component: () => import('@/views/TagView.vue'),
    meta: { title: '标签' }
  },
  {
    path: '/tag/:id',
    name: 'TagPosts',
    component: () => import('@/views/TagPosts.vue'),
    meta: { title: '标签文章' }
  },
  {
    path: '/archive',
    name: 'Archive',
    component: () => import('@/views/ArchiveView.vue'),
    meta: { title: '归档' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '用户注册' }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/FavoritesView.vue'),
    meta: { title: '我的收藏', requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { title: '管理后台', requiresAuth: true }
  },
  {
    path: '/admin/posts',
    name: 'AdminPosts',
    component: () => import('@/views/admin/PostManagement.vue'),
    meta: { title: '文章管理', requiresAuth: true }
  },
  {
    path: '/admin/tags',
    name: 'AdminTags',
    component: () => import('@/views/admin/TagManagement.vue'),
    meta: { title: '标签管理', requiresAuth: true }
  },
  {
    path: '/admin/series',
    name: 'AdminSeries',
    component: () => import('@/views/admin/SeriesManagement.vue'),
    meta: { title: '系列管理', requiresAuth: true }
  },
  {
    path: '/admin/stats',
    name: 'AdminStats',
    component: () => import('@/views/admin/DataStats.vue'),
    meta: { title: '数据统计', requiresAuth: true }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('@/views/admin/SystemSettings.vue'),
    meta: { title: '系统设置', requiresAuth: true }
  },
  {
    path: '/admin/backup',
    name: 'AdminBackup',
    component: () => import('@/views/admin/BackupRestore.vue'),
    meta: { title: '备份恢复', requiresAuth: true }
  },

  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/settings',
    name: 'UserSettings',
    component: () => import('@/views/UserSettings.vue'),
    meta: { title: '用户设置', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

// 从 <base> 标签读取部署路径，nginx 会动态注入
const base = document.querySelector('base')?.getAttribute('href') || '/'

const router = createRouter({
  history: createWebHistory(base),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title + ' - 白秦的文字世界'
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!authStore.isLoggedIn) {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await authStore.getCurrentUser()
          next()
        } catch (error) {
          next(to.meta.isMobile ? '/m/login' : '/login')
        }
      } else {
        next(to.meta.isMobile ? '/m/login' : '/login')
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router

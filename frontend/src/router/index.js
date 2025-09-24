import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '她的诗集 - 白秦' }
  },
  {
    path: '/posts',
    name: 'Posts',
    component: () => import('@/views/PostsView.vue'),
    meta: { title: '文章列表' }
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

const router = createRouter({
  history: createWebHistory(),
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
    document.title = to.meta.title + ' - 她的诗集'
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!authStore.isLoggedIn) {
      // 尝试从本地存储恢复登录状态
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await authStore.getCurrentUser()
          next()
        } catch (error) {
          next('/login')
        }
      } else {
        next('/login')
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router

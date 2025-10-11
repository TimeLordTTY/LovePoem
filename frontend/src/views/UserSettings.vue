<template>
  <div class="user-settings">
    <div class="container">
      <div class="settings-header">
        <h1>用户设置</h1>
        <p>管理您的个人信息和偏好设置</p>
      </div>
      
      <div class="settings-content">
        <!-- 基本信息设置 -->
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>基本信息</span>
            </div>
          </template>
          
          <div class="profile-section">
            <!-- 头像设置 -->
            <div class="avatar-section">
              <div class="avatar-display">
                <el-avatar 
                  :size="100" 
                  :src="userForm.avatarUrl" 
                  :icon="UserFilled"
                  class="user-avatar"
                />
                <el-upload
                  :show-file-list="false"
                  :before-upload="handleAvatarUpload"
                  accept="image/*"
                  class="avatar-upload"
                >
                  <el-button size="small" type="primary">
                    <el-icon><Upload /></el-icon>
                    更换头像
                  </el-button>
                </el-upload>
              </div>
            </div>
            
            <!-- 用户信息表单 -->
            <div class="info-form">
              <el-form :model="userForm" label-width="80px">
                <el-form-item label="昵称">
                  <el-input 
                    v-model="userForm.displayName" 
                    placeholder="请输入昵称"
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>
                
                <el-form-item label="邮箱">
                  <el-input 
                    v-model="userForm.email" 
                    placeholder="请输入邮箱"
                    disabled
                  />
                  <div class="form-tip">邮箱暂不支持修改</div>
                </el-form-item>
                
                <el-form-item label="个人简介">
                  <el-input 
                    v-model="userForm.bio" 
                    type="textarea" 
                    :rows="3"
                    placeholder="介绍一下自己吧"
                    maxlength="200"
                    show-word-limit
                  />
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="updateProfile" :loading="updating">
                    保存修改
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </el-card>
        
        <!-- 密码修改 -->
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><Lock /></el-icon>
              <span>密码修改</span>
            </div>
          </template>
          
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input 
                v-model="passwordForm.currentPassword" 
                type="password" 
                placeholder="请输入当前密码"
                show-password
              />
            </el-form-item>
            
            <el-form-item label="新密码" prop="newPassword">
              <el-input 
                v-model="passwordForm.newPassword" 
                type="password" 
                placeholder="请输入新密码"
                show-password
              />
            </el-form-item>
            
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input 
                v-model="passwordForm.confirmPassword" 
                type="password" 
                placeholder="请再次输入新密码"
                show-password
              />
            </el-form-item>
            
            <el-form-item>
                <el-button type="primary" @click="changeUserPassword" :loading="changingPassword">
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 我的收藏 -->
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><Star /></el-icon>
              <span>我的收藏</span>
              <span class="count">({{ favorites.length }})</span>
            </div>
          </template>
          
          <div v-if="favorites.length === 0" class="empty-state">
            <el-empty description="暂无收藏的文章" />
          </div>
          
          <div v-else class="favorites-list">
            <div 
              v-for="favorite in favorites" 
              :key="favorite.id"
              class="favorite-item"
            >
              <div class="favorite-info">
                <h4 class="favorite-title">
                  <router-link :to="`/post/${favorite.slug}`">
                    {{ favorite.title }}
                  </router-link>
                </h4>
                <p class="favorite-summary">{{ favorite.summary }}</p>
                <div class="favorite-meta">
                  <span>{{ formatDate(favorite.createdAt) }}</span>
                  <span>{{ favorite.readingTime }}分钟阅读</span>
                </div>
              </div>
              
              <div class="favorite-actions">
                <el-button 
                  size="small" 
                  type="danger" 
                  text
                  @click="removeUserFavorite(favorite.postId)"
                >
                  <el-icon><Delete /></el-icon>
                  取消收藏
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
        
        <!-- 我的评论 -->
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><ChatLineSquare /></el-icon>
              <span>我的评论</span>
              <span class="count">({{ comments.length }})</span>
            </div>
          </template>
          
          <div v-if="comments.length === 0" class="empty-state">
            <el-empty description="暂无评论记录" />
          </div>
          
          <div v-else class="comments-list">
            <div 
              v-for="comment in comments" 
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-content">
                <div class="comment-text">{{ comment.content }}</div>
                <div class="comment-meta">
                  <span>发表于：</span>
                  <router-link :to="`/post/${comment.postSlug}`" class="post-link">
                    {{ comment.postTitle }}
                  </router-link>
                  <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                </div>
              </div>
              
              <div class="comment-actions">
                <el-button 
                  size="small" 
                  type="danger" 
                  text
                  @click="deleteComment(comment.id)"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, 
  UserFilled, 
  Upload, 
  Lock, 
  Star, 
  ChatLineSquare, 
  Delete 
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/store/auth'
import { 
  getUserProfile, 
  updateUserProfile, 
  uploadAvatar, 
  changePassword,
  getUserFavorites,
  removeFavorite,
  getUserComments,
  deleteUserComment
} from '@/api/user'

const authStore = useAuthStore()

// 响应式数据
const updating = ref(false)
const changingPassword = ref(false)
const favorites = ref([])
const comments = ref([])

// 用户信息表单
const userForm = reactive({
  displayName: '',
  email: '',
  bio: '',
  avatarUrl: ''
})

// 密码修改表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordFormRef = ref()

// 表单验证规则
const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 方法
const loadUserProfile = async () => {
  try {
    const response = await getUserProfile()
    Object.assign(userForm, response.data)
  } catch (error) {
    console.error('加载用户信息失败:', error)
    ElMessage.error('加载用户信息失败')
    // 使用默认数据作为fallback
    Object.assign(userForm, {
      displayName: authStore.user?.displayName || '用户',
      email: authStore.user?.email || 'user@example.com',
      bio: '这个人很懒，什么都没有写...',
      avatarUrl: ''
    })
  }
}

const loadUserFavorites = async () => {
  try {
    const response = await getUserFavorites()
    favorites.value = response.data || []
  } catch (error) {
    console.error('加载收藏列表失败:', error)
    ElMessage.error('加载收藏列表失败')
    favorites.value = []
  }
}

const loadUserComments = async () => {
  try {
    const response = await getUserComments()
    comments.value = response.data || []
  } catch (error) {
    console.error('加载评论列表失败:', error)
    ElMessage.error('加载评论列表失败')
    comments.value = []
  }
}

const handleAvatarUpload = async (file) => {
  try {
    const response = await uploadAvatar(file)
    userForm.avatarUrl = response.data
    
    // 头像上传成功后，立即刷新auth store中的用户信息
    await authStore.getCurrentUser()
    
    ElMessage.success('头像上传成功')
    return false // 阻止默认上传行为
  } catch (error) {
    console.error('头像上传失败:', error)
    ElMessage.error('头像上传失败')
    return false
  }
}

const updateProfile = async () => {
  try {
    updating.value = true
    await updateUserProfile(userForm)
    
    // 更新成功后，刷新auth store中的用户信息
    await authStore.getCurrentUser()
    
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('更新失败：' + (error.message || error))
  } finally {
    updating.value = false
  }
}

const changeUserPassword = async () => {
  try {
    await passwordFormRef.value.validate()
    
    changingPassword.value = true
    await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    
    ElMessage.success('密码修改成功')
    
    // 清空表单
    Object.assign(passwordForm, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  } catch (error) {
    console.error('密码修改失败:', error)
    ElMessage.error('密码修改失败：' + (error.message || error))
  } finally {
    changingPassword.value = false
  }
}

const removeUserFavorite = async (favoriteId) => {
  try {
    await ElMessageBox.confirm('确定要取消收藏这篇文章吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await removeFavorite(favoriteId)
    favorites.value = favorites.value.filter(f => f.postId !== favoriteId)
    ElMessage.success('已取消收藏')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消收藏失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

const deleteComment = async (commentId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteUserComment(commentId)
    comments.value = comments.value.filter(c => c.id !== commentId)
    ElMessage.success('评论已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除评论失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 生命周期
onMounted(() => {
  loadUserProfile()
  loadUserFavorites()
  loadUserComments()
})
</script>

<style scoped>
.user-settings {
  min-height: calc(100vh - 160px);
  padding: 40px 0;
  background: var(--bg-primary);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.settings-header {
  text-align: center;
  margin-bottom: 40px;
}

.settings-header h1 {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.settings-header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.settings-card {
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.count {
  color: var(--text-secondary);
  font-weight: normal;
  font-size: 0.9rem;
}

/* 基本信息设置 */
.profile-section {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.user-avatar {
  border: 3px solid var(--border-color);
}

.info-form {
  flex: 1;
}

.form-tip {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 5px;
}

/* 收藏和评论列表 */
.favorites-list,
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.favorite-item,
.comment-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.favorite-info,
.comment-content {
  flex: 1;
}

.favorite-title h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
}

.favorite-title a {
  color: var(--text-primary);
  text-decoration: none;
}

.favorite-title a:hover {
  color: var(--accent-primary);
}

.favorite-summary {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.favorite-meta,
.comment-meta {
  display: flex;
  gap: 15px;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.comment-text {
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 10px;
}

.post-link {
  color: var(--accent-primary);
  text-decoration: none;
}

.post-link:hover {
  text-decoration: underline;
}

.favorite-actions,
.comment-actions {
  flex-shrink: 0;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  .profile-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .info-form {
    width: 100%;
  }
  
  .favorite-item,
  .comment-item {
    flex-direction: column;
    gap: 15px;
  }
  
  .favorite-actions,
  .comment-actions {
    align-self: flex-end;
  }
}
</style>

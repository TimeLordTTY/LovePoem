<template>
  <div class="system-settings">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
          <el-button type="primary" @click="saveSettings" :loading="saving">
            保存设置
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane 
          v-for="(settings, groupName) in groupedSettings" 
          :key="groupName"
          :label="groupName"
          :name="groupName"
        >
          <el-form :model="formData" label-width="150px" class="settings-form">
            <el-form-item 
              v-for="setting in settings" 
              :key="setting.id"
              :label="setting.description || setting.settingKey"
            >
              <!-- 壁纸设置特殊处理 -->
              <div v-if="setting.settingKey === 'site_wallpaper'" class="wallpaper-setting">
                <div class="wallpaper-preview" v-if="formData[setting.settingKey]">
                  <img :src="formData[setting.settingKey]" alt="壁纸预览" />
                </div>
                <div class="wallpaper-upload">
                  <el-upload
                    ref="wallpaperUpload"
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="handleWallpaperSelect"
                    :before-upload="beforeWallpaperUpload"
                  >
                    <el-button type="primary" :loading="uploadingWallpaper">
                      <el-icon><Picture /></el-icon>
                      选择壁纸
                    </el-button>
                  </el-upload>
                  <span class="upload-tip">支持JPG、PNG、GIF格式，建议尺寸1920x1080，最大5MB</span>
                </div>
                <el-input 
                  v-model="formData[setting.settingKey]"
                  placeholder="壁纸URL地址"
                  class="wallpaper-url"
                />
              </div>
              <!-- 普通设置 -->
              <div v-else>
                <el-input 
                  v-model="formData[setting.settingKey]"
                  :placeholder="setting.description"
                />
                <div class="setting-help" v-if="setting.description">
                  {{ setting.description }}
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { getSystemSettings, updateSystemSettings } from '@/api/system'
import { uploadImage } from '@/api/file'

// 响应式数据
const activeTab = ref('网站基本')
const groupedSettings = ref({})
const formData = reactive({})
const saving = ref(false)
const uploadingWallpaper = ref(false)

// 加载设置
const loadSettings = async () => {
  try {
    const response = await getSystemSettings()
    groupedSettings.value = response.data
    
    // 初始化表单数据
    Object.values(response.data).flat().forEach(setting => {
      formData[setting.settingKey] = setting.value || ''
    })
    
    // 设置默认激活标签
    const groups = Object.keys(response.data)
    if (groups.length > 0) {
      activeTab.value = groups[0]
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    ElMessage.error('加载设置失败')
  }
}

// 保存设置
const saveSettings = async () => {
  saving.value = true
  try {
    await updateSystemSettings(formData)
    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败')
  } finally {
    saving.value = false
  }
}

// 页面加载时获取设置
// 壁纸上传相关方法
const beforeWallpaperUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

const handleWallpaperSelect = async (file) => {
  if (!beforeWallpaperUpload(file.raw)) {
    return
  }

  try {
    uploadingWallpaper.value = true
    ElMessage.info('正在上传壁纸...')
    
    const response = await uploadImage(file.raw)
    const imageUrl = response.data.url
    
    // 更新表单数据
    formData['site_wallpaper'] = imageUrl
    
    ElMessage.success('壁纸上传成功')
    
  } catch (error) {
    console.error('壁纸上传失败:', error)
    ElMessage.error('壁纸上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploadingWallpaper.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.system-settings {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-form {
  max-width: 600px;
}

.setting-help {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 壁纸设置样式 */
.wallpaper-setting {
  width: 100%;
}

.wallpaper-preview {
  margin-bottom: 15px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.wallpaper-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.wallpaper-upload {
  margin-bottom: 15px;
  text-align: center;
}

.wallpaper-upload .el-button {
  margin-bottom: 8px;
}

.upload-tip {
  display: block;
  font-size: 12px;
  color: #909399;
}

.wallpaper-url {
  margin-top: 10px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .system-settings {
    padding: 15px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .card-header span {
    font-size: 1.5rem;
    text-align: center;
  }
  
  .card-header .el-button {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    height: auto;
  }
  
  .wallpaper-preview img {
    height: 150px;
  }
  
  .wallpaper-upload .el-button {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    height: auto;
  }
  
  :deep(.el-form-item__label) {
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 8px;
  }
  
  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
  
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    font-size: 16px; /* 防止iOS缩放 */
  }
  
  :deep(.el-tabs__header) {
    margin-bottom: 15px;
  }
  
  :deep(.el-tab-pane) {
    padding: 0 5px;
  }
  
  :deep(.el-tabs__nav-wrap) {
    padding: 0 10px;
  }
  
  :deep(.el-tabs__item) {
    padding: 0 12px;
    font-size: 14px;
  }
  
  .settings-form {
    max-width: none;
  }
}

:deep(.el-tabs__content) {
  padding: 20px 0;
}
</style>

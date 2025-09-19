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
              <el-input 
                v-model="formData[setting.settingKey]"
                :placeholder="setting.description"
              />
              <div class="setting-help" v-if="setting.description">
                {{ setting.description }}
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
import { getSystemSettings, updateSystemSettings } from '@/api/system'

// 响应式数据
const activeTab = ref('网站基本')
const groupedSettings = ref({})
const formData = reactive({})
const saving = ref(false)

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

:deep(.el-tabs__content) {
  padding: 20px 0;
}
</style>

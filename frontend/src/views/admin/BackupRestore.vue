<template>
  <div class="backup-restore-tool">
    <el-card>
      <template #header>
        <span>数据备份与恢复</span>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <!-- 数据备份 -->
        <el-tab-pane label="数据备份" name="backup">
          <div class="backup-section">
            <el-alert
              title="数据备份说明"
              type="info"
              :closable="false"
              show-icon
            >
              <p>数据备份将导出网站的所有数据，包括文章、标签、系列、用户、设置等</p>
              <p>备份文件为 JSON 格式，可用于数据迁移或灾难恢复</p>
              <p>建议定期进行数据备份以确保数据安全</p>
            </el-alert>

            <div class="backup-actions">
              <el-button 
                type="primary" 
                size="large"
                @click="performBackup" 
                :loading="backing"
                icon="Download"
              >
                开始备份数据
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 数据恢复 -->
        <el-tab-pane label="数据恢复" name="restore">
          <div class="restore-section">
            <el-alert
              title="数据恢复说明"
              type="warning"
              :closable="false"
              show-icon
            >
              <p><strong>注意：数据恢复将覆盖现有数据！</strong></p>
              <p>请确保备份文件是有效的 JSON 格式文件</p>
              <p>恢复过程中如果数据已存在，将直接覆盖而不是新增</p>
              <p>建议在恢复前先备份当前数据</p>
            </el-alert>

            <el-upload
              ref="restoreUploadRef"
              class="upload-area"
              drag
              :auto-upload="false"
              :on-change="handleRestoreFileChange"
              accept=".json"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将备份文件拖拽到此处，或<em>点击选择文件</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  仅支持 JSON 格式的备份文件
                </div>
              </template>
            </el-upload>

            <div v-if="restoreFile" class="file-info">
              <p><strong>已选择文件：</strong>{{ restoreFile.name }}</p>
              <p><strong>文件大小：</strong>{{ formatFileSize(restoreFile.size) }}</p>
            </div>

            <div class="action-buttons">
              <el-button 
                type="danger" 
                @click="performRestore"
                :loading="restoring"
                :disabled="!restoreFile"
              >
                开始恢复数据
              </el-button>
              <el-button @click="clearRestoreFile">清除</el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 操作历史 -->
        <el-tab-pane label="操作历史" name="history">
          <div class="history-section">
            <el-alert
              title="操作历史"
              type="info"
              :closable="false"
              show-icon
            >
              <p>这里显示最近的备份和恢复操作记录</p>
            </el-alert>

            <el-table :data="operationHistory" stripe>
              <el-table-column prop="type" label="操作类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'backup' ? 'success' : 'warning'">
                    {{ row.type === 'backup' ? '备份' : '恢复' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="time" label="操作时间" width="180" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                    {{ row.status === 'success' ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Download } from '@element-plus/icons-vue'
import { backupData, restoreData } from '@/api/system'

// 响应式数据
const activeTab = ref('backup')
const restoreFile = ref(null)
const backing = ref(false)
const restoring = ref(false)

// 操作历史（模拟数据）
const operationHistory = ref([
  {
    type: 'backup',
    time: '2025-09-19 10:30:00',
    status: 'success',
    description: '完整数据备份'
  }
])

// 处理恢复文件选择
const handleRestoreFileChange = (file) => {
  restoreFile.value = file.raw
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 执行数据备份
const performBackup = async () => {
  backing.value = true
  try {
    const response = await backupData()
    
    // 创建下载链接
    const dataStr = JSON.stringify(response.data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    // 触发下载
    const link = document.createElement('a')
    link.href = url
    link.download = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('数据备份成功')
    
    // 添加到操作历史
    operationHistory.value.unshift({
      type: 'backup',
      time: new Date().toLocaleString('zh-CN'),
      status: 'success',
      description: '完整数据备份'
    })
    
  } catch (error) {
    console.error('数据备份失败:', error)
    ElMessage.error('数据备份失败')
    
    // 添加失败记录
    operationHistory.value.unshift({
      type: 'backup',
      time: new Date().toLocaleString('zh-CN'),
      status: 'failed',
      description: '数据备份失败: ' + error.message
    })
  } finally {
    backing.value = false
  }
}

// 执行数据恢复
const performRestore = async () => {
  if (!restoreFile.value) {
    ElMessage.warning('请先选择备份文件')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要恢复数据吗？这将覆盖现有的所有数据！',
      '数据恢复确认',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )

    restoring.value = true
    
    const formData = new FormData()
    formData.append('file', restoreFile.value)
    
    await restoreData(formData)
    
    ElMessage.success('数据恢复成功')
    clearRestoreFile()
    
    // 添加到操作历史
    operationHistory.value.unshift({
      type: 'restore',
      time: new Date().toLocaleString('zh-CN'),
      status: 'success',
      description: '数据恢复成功'
    })
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('数据恢复失败:', error)
      ElMessage.error('数据恢复失败')
      
      // 添加失败记录
      operationHistory.value.unshift({
        type: 'restore',
        time: new Date().toLocaleString('zh-CN'),
        status: 'failed',
        description: '数据恢复失败: ' + error.message
      })
    }
  } finally {
    restoring.value = false
  }
}

// 清除恢复文件
const clearRestoreFile = () => {
  restoreFile.value = null
}
</script>

<style scoped>
.backup-restore-tool {
  padding: 20px;
}

.backup-section,
.restore-section,
.history-section {
  max-width: 800px;
}

.backup-actions {
  margin: 40px 0;
  text-align: center;
}

.upload-area {
  margin: 20px 0;
}

.file-info {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  margin: 16px 0;
}

.action-buttons {
  margin-top: 20px;
}

.action-buttons .el-button {
  margin-right: 16px;
}

:deep(.el-alert__content) {
  line-height: 1.6;
}

:deep(.el-upload-dragger) {
  padding: 40px;
}

.history-section {
  margin-top: 20px;
}
</style>

<template>
  <div class="table-of-contents" v-if="tocItems.length > 0">
    <div class="toc-header">
      <h4>目录</h4>
      <el-button size="small" text @click="toggleCollapsed">
        <el-icon>
          <component :is="collapsed ? 'ArrowDown' : 'ArrowUp'" />
        </el-icon>
      </el-button>
    </div>
    
    <div class="toc-content" v-show="!collapsed">
      <ul class="toc-list">
        <li 
          v-for="item in tocItems" 
          :key="item.id"
          :class="['toc-item', `toc-level-${item.level}`, { active: activeId === item.id }]"
        >
          <a 
            :href="`#${item.id}`" 
            @click.prevent="scrollToHeading(item.id)"
            class="toc-link"
          >
            {{ item.title }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'

const props = defineProps({
  tableOfContents: {
    type: String,
    default: '[]'
  },
  autoCollapse: {
    type: Boolean,
    default: false
  }
})

const collapsed = ref(props.autoCollapse)
const activeId = ref('')

// 解析目录数据
const tocItems = computed(() => {
  try {
    return JSON.parse(props.tableOfContents || '[]')
  } catch (error) {
    console.error('解析目录数据失败:', error)
    return []
  }
})

// 切换折叠状态
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

// 滚动到指定标题
const scrollToHeading = (id) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    })
    activeId.value = id
  }
}

// 监听滚动事件，更新当前激活的标题
const handleScroll = () => {
  const headings = tocItems.value.map(item => {
    const element = document.getElementById(item.id)
    return {
      id: item.id,
      element,
      top: element ? element.offsetTop : 0
    }
  }).filter(item => item.element)

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight

  // 找到当前可视区域内的标题
  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i]
    if (scrollTop >= heading.top - windowHeight / 3) {
      activeId.value = heading.id
      break
    }
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  // 初始化时设置第一个标题为激活状态
  if (tocItems.value.length > 0) {
    activeId.value = tocItems.value[0].id
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.table-of-contents {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
  position: sticky;
  top: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.toc-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.toc-content {
  transition: all 0.3s ease;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: 4px 0;
}

.toc-link {
  display: block;
  padding: 6px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 14px;
  line-height: 1.4;
  border-left: 2px solid transparent;
}

.toc-link:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.toc-item.active .toc-link {
  background: var(--accent-primary);
  color: white;
  border-left-color: var(--accent-secondary);
}

/* 不同层级的缩进 */
.toc-level-1 .toc-link {
  padding-left: 12px;
  font-weight: 600;
}

.toc-level-2 .toc-link {
  padding-left: 24px;
  font-weight: 500;
}

.toc-level-3 .toc-link {
  padding-left: 36px;
}

.toc-level-4 .toc-link {
  padding-left: 48px;
  font-size: 13px;
}

.toc-level-5 .toc-link,
.toc-level-6 .toc-link {
  padding-left: 60px;
  font-size: 12px;
  color: var(--text-muted);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .table-of-contents {
    position: static;
    max-height: none;
    margin: 16px 0;
    padding: 12px;
  }
  
  .toc-header h4 {
    font-size: 14px;
  }
  
  .toc-link {
    font-size: 13px;
    padding: 4px 8px;
  }
  
  .toc-level-1 .toc-link {
    padding-left: 8px;
  }
  
  .toc-level-2 .toc-link {
    padding-left: 16px;
  }
  
  .toc-level-3 .toc-link {
    padding-left: 24px;
  }
  
  .toc-level-4 .toc-link,
  .toc-level-5 .toc-link,
  .toc-level-6 .toc-link {
    padding-left: 32px;
    font-size: 12px;
  }
}
</style> 
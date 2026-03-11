<template>
  <div class="tag-cloud">
    <router-link
      v-for="tag in tags"
      :key="tag.id"
      :to="`/posts?tagId=${tag.id}`"
      class="tag-item"
      :style="getTagStyle(tag.postCount)"
    >
      {{ tag.name }}
      <span class="tag-count">({{ tag.postCount }})</span>
    </router-link>
  </div>
</template>

<script setup>
const props = defineProps({
  tags: {
    type: Array,
    default: () => []
  }
})

const getTagStyle = (count) => {
  if (!props.tags || props.tags.length === 0) return { fontSize: '14px', opacity: 1 }
  const counts = props.tags.map(t => t.postCount || 0)
  const maxCount = Math.max(...counts)
  const minCount = Math.min(...counts)
  const ratio = maxCount === minCount ? 0 : (count - minCount) / (maxCount - minCount)
  
  const minSize = 14
  const maxSize = 24
  const fontSize = minSize + (maxSize - minSize) * ratio
  
  const opacity = 0.6 + 0.4 * ratio
  
  return {
    fontSize: `${fontSize}px`,
    opacity: opacity
  }
}
</script>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  font-weight: 500;
}

.tag-item:hover {
  color: white;
  background: var(--accent-gradient);
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.tag-count {
  font-size: 0.8em;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .tag-cloud {
    gap: 12px;
    padding: 16px;
  }
  
  .tag-item {
    padding: 6px 12px;
    font-size: 14px !important;
  }
}
</style>

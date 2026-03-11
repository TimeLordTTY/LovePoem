<template>
  <div class="m-discover">
    <!-- 随机一篇 -->
    <div class="random-card" v-if="randomPost" @click="$router.push(`/m/read/${randomPost.slug}`)">
      <div class="random-label">随机一篇</div>
      <div class="random-title">《{{ randomPost.title }}》</div>
      <div class="random-excerpt">不妨给今天一个完全随机的开头。</div>
      <button class="random-btn" @click.stop="loadRandom">换一篇</button>
    </div>

    <!-- 精选系列 -->
    <div class="sec" v-if="seriesList.length">
      <div class="sec-head">
        <div class="sec-title">精选系列</div>
      </div>
      <div class="series-grid">
        <div
          class="series-item"
          v-for="s in seriesList"
          :key="s.id"
          @click="$router.push(`/m/posts?seriesId=${s.id}`)"
        >
          <h4>{{ s.title }}</h4>
          <p>{{ s.postCount || 0 }} 篇</p>
        </div>
      </div>
    </div>

    <!-- 情绪标签 -->
    <div class="sec" v-if="tags.length">
      <div class="sec-head">
        <div class="sec-title">情绪标签</div>
      </div>
      <div class="tag-scroll">
        <button
          v-for="(tag, idx) in tags"
          :key="tag.id"
          class="tag-pill"
          :class="tagColorClass(idx)"
          @click="$router.push(`/m/posts?tagId=${tag.id}`)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getPosts } from '@/api/post'
import { getAllSeries } from '@/api/series'
import { getAllTags } from '@/api/tag'

const randomPost = ref(null)
const seriesList = ref([])
const tags = ref([])

const tagColors = ['tag-warm', 'tag-cool', 'tag-green', 'tag-amber', 'tag-purple']
const tagColorClass = (idx) => tagColors[idx % tagColors.length]

const loadRandom = async () => {
  try {
    const resp = await getPosts({ page: 1, size: 20, status: 'PUBLISHED', visibility: 'PUBLIC' })
    const list = resp.data?.records || []
    if (list.length) {
      randomPost.value = list[Math.floor(Math.random() * list.length)]
    }
  } catch { randomPost.value = null }
}

const loadSeriesAndTags = async () => {
  try {
    const [sResp, tResp] = await Promise.all([getAllSeries(), getAllTags()])
    seriesList.value = (sResp.data || []).slice(0, 8)
    tags.value = (tResp.data || []).slice(0, 12)
  } catch {
    seriesList.value = []
    tags.value = []
  }
}

onMounted(() => {
  Promise.all([loadRandom(), loadSeriesAndTags()])
})
</script>

<style scoped>
.m-discover { animation: mPageIn 0.28s ease; }

/* Random Card */
.random-card {
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%);
  box-shadow: 0 8px 24px rgba(15,23,42,0.06);
  margin-top: 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.random-card::before {
  content: '';
  position: absolute;
  right: -20px;
  top: -20px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%);
}
.random-label { font-size: 11px; color: #94A3B8; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
.random-title { font-size: 17px; font-weight: 700; margin-bottom: 6px; color: #0F172A; }
.random-excerpt { font-size: 13px; color: #64748B; line-height: 1.5; }
.random-btn {
  margin-top: 12px;
  padding: 8px 20px;
  border-radius: 999px;
  border: none;
  background: #7C3AED;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Section */
.sec { margin-top: 20px; }
.sec-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; padding: 0 2px; }
.sec-title { font-size: 17px; font-weight: 700; letter-spacing: -0.2px; color: #0F172A; }

/* Series Grid */
.series-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.series-item {
  padding: 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.82);
  border: 0.5px solid rgba(148,163,184,0.18);
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
  cursor: pointer;
}
.series-item h4 { font-size: 14px; font-weight: 600; margin: 0 0 4px; line-height: 1.3; color: #0F172A; }
.series-item p { font-size: 11px; color: #94A3B8; margin: 0; }

/* Tags */
.tag-scroll { display: flex; gap: 8px; flex-wrap: wrap; }
.tag-pill {
  padding: 7px 14px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: transform 0.15s;
}
.tag-pill:active { transform: scale(0.94); }
.tag-warm { background: linear-gradient(135deg, #FFF1F2, #FFE4E6); color: #BE123C; }
.tag-cool { background: linear-gradient(135deg, #EFF6FF, #DBEAFE); color: #1D4ED8; }
.tag-purple { background: linear-gradient(135deg, #F5F3FF, #EDE9FE); color: #6D28D9; }
.tag-green { background: linear-gradient(135deg, #F0FDF4, #DCFCE7); color: #15803D; }
.tag-amber { background: linear-gradient(135deg, #FFFBEB, #FEF3C7); color: #B45309; }
</style>

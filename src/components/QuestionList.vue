<script setup>
import { ref } from 'vue'
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-vue-next'

const props = defineProps(['questions'])
const expandedIndex = ref(0)

const toggleExpand = (index) => {
  expandedIndex.value = expandedIndex.value === index ? -1 : index
}

const getTypeLabel = (type) => {
  const labels = {
    'main-idea-ko': '주제 찾기 (한글)',
    'main-idea-en': '주제 찾기 (영어)',
    'blank': '빈칸 추론',
    'insertion': '문장 삽입',
    'ordering': '순서 배열',
    'descriptive': '서술형'
  }
  return labels[type] || type
}
</script>

<template>
  <div class="questions-list">
    <div 
      v-for="(q, index) in questions" 
      :key="index"
      class="question-card mb-md"
      :class="{ 'is-expanded': expandedIndex === index }"
    >
      <div class="question-header" @click="toggleExpand(index)">
        <div class="flex items-center gap-md">
          <span class="q-number">Q{{ index + 1 }}</span>
          <span class="q-type badge">{{ getTypeLabel(q.type) }}</span>
          <p class="q-preview text-truncate">{{ q.question }}</p>
        </div>
        <component :is="expandedIndex === index ? ChevronUp : ChevronDown" :size="20" class="text-muted" />
      </div>

      <div v-if="expandedIndex === index" class="question-body fade-in">
        <div class="question-text mb-lg">
          {{ q.question }}
        </div>

        <div v-if="q.options && q.options.length" class="options-list mb-lg">
          <div 
            v-for="(opt, oIndex) in q.options" 
            :key="oIndex"
            class="option-item"
            :class="{ 'is-correct': q.answer === (oIndex + 1).toString() || q.answer === opt }"
          >
            <span class="option-num">{{ oIndex + 1 }}.</span>
            <span class="option-text">{{ opt }}</span>
            <CheckCircle2 v-if="q.answer === (oIndex + 1).toString() || q.answer === opt" :size="18" class="text-accent" />
          </div>
        </div>

        <div class="explanation-box card mb-md">
          <div class="flex items-center gap-sm mb-sm font-bold text-accent">
            <CheckCircle2 :size="18" />
            <span>정답: {{ q.answer }}</span>
          </div>
          <div class="explanation-content">
            <p class="font-bold mb-xs">해설</p>
            <p>{{ q.explanation }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: all 0.3s;
}

.question-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow);
}

.is-expanded {
  border-color: var(--primary);
  box-shadow: var(--shadow-lg);
}

.question-header {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: #fdfdfd;
}

.q-number {
  font-weight: 800;
  color: var(--primary);
  font-size: 1.1rem;
}

.q-preview {
  font-weight: 500;
  color: var(--text);
  max-width: 500px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.question-body {
  padding: 1.5rem;
  border-top: 1px solid var(--border);
}

.question-text {
  font-size: 1.1rem;
  line-height: 1.7;
  font-weight: 500;
  color: var(--secondary);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f8fafc;
}

.option-item.is-correct {
  background: rgba(16, 185, 129, 0.05);
  border-color: var(--accent);
}

.option-num {
  font-weight: 700;
  color: var(--text-muted);
}

.option-text {
  flex: 1;
}

.explanation-box {
  background: #f0fdf4;
  border-color: #bbf7d0;
  padding: 1rem;
}

.font-bold { font-weight: 700; }
.mb-xs { margin-bottom: 0.25rem; }
.mb-sm { margin-bottom: 0.5rem; }
.mb-md { margin-bottom: 1rem; }
.mb-lg { margin-bottom: 1.5rem; }
.text-accent { color: var(--accent); }
.text-primary { color: var(--primary); }

.badge {
  background: #eef2ff;
  color: var(--primary);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>

<script setup>
import { Check, Hash, Languages, ListOrdered, Type, Edit3 } from 'lucide-vue-next'

const props = defineProps(['selectedModel', 'selectedTypes', 'countPerType', 'difficulty'])
const emit = defineEmits(['update:selectedModel', 'update:selectedTypes', 'update:countPerType', 'update:difficulty'])

const types = [
  { id: 'main-idea-ko', label: '주제 찾기 (한글)', icon: Languages },
  { id: 'main-idea-en', label: '주제 찾기 (영어)', icon: Languages },
  { id: 'blank', label: '빈칸 추론', icon: Type },
  { id: 'insertion', label: '문장 삽입', icon: Type },
  { id: 'ordering', label: '순서 배열', icon: ListOrdered },
  { id: 'descriptive', label: '서술형', icon: Edit3 },
]

const toggleType = (id) => {
  const newTypes = [...props.selectedTypes]
  const index = newTypes.indexOf(id)
  if (index > -1) {
    if (newTypes.length > 1) newTypes.splice(index, 1)
  } else {
    newTypes.push(id)
  }
  emit('update:selectedTypes', newTypes)
}

const updateCount = (e) => {
  emit('update:countPerType', parseInt(e.target.value))
}
</script>

<template>
  <div class="settings-group">
    <div class="mb-lg">
      <label class="label-heading">AI Model</label>
      <select :value="selectedModel" @change="$emit('update:selectedModel', $event.target.value)" class="w-full type-btn mt-xs" style="padding: 0.5rem 1rem;">
        <option value="gemini-2.0-flash">Gemini 2.0 Flash (최신)</option>
        <option value="gemini-1.5-flash">Gemini 1.5 Flash (빠름)</option>
        <option value="gemini-1.5-pro">Gemini 1.5 Pro (고성능)</option>
        <option value="gemini-1.0-pro">Gemini 1.0 Pro (호환/구버전)</option>
        <option value="gemini-pro">Gemini Pro (레거시)</option>
      </select>
    </div>

    <label class="label-heading">Question Types</label>
    <div class="type-grid">
      <button 
        v-for="type in types" 
        :key="type.id"
        @click="toggleType(type.id)"
        class="type-btn"
        :class="{ 'active': selectedTypes.includes(type.id) }"
      >
        <div class="flex items-center gap-sm">
          <component :is="type.icon" :size="16" />
          <span>{{ type.label }}</span>
        </div>
        <Check v-if="selectedTypes.includes(type.id)" :size="16" />
      </button>
    </div>

    <div class="count-selector mt-lg">
      <div class="flex items-center justify-between">
        <label class="label-heading flex items-center gap-sm mb-0">
          <Hash :size="16" /> Questions per type
        </label>
        <select :value="countPerType" @change="updateCount" class="count-select">
          <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
    </div>

    <div class="mt-lg">
      <label class="label-heading">Difficulty Level</label>
      <div class="difficulty-grid">
        <button 
          v-for="level in [
            { id: 'low', label: '초등', color: '#f59e0b' },
            { id: 'middle', label: '중등', color: '#10b981' },
            { id: 'high', label: '고등', color: '#4f46e5' },
            { id: 'csat', label: '수능', color: '#ef4444' }
          ]" 
          :key="level.id"
          @click="$emit('update:difficulty', level.id)"
          class="diff-btn"
          :class="{ 'active': difficulty === level.id }"
          :style="{ '--active-color': level.color }"
        >
          {{ level.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-group {
  display: flex;
  flex-direction: column;
}

.label-heading {
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.025em;
  margin-bottom: 0.75rem;
}

.type-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-weight: 500;
  text-align: left;
}

.type-btn:hover {
  border-color: var(--primary);
  background: #f8fafc;
}

.type-btn.active {
  background: rgba(79, 70, 229, 0.05);
  border-color: var(--primary);
  color: var(--primary);
}

.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-sm { gap: 0.5rem; }
.mb-0 { margin-bottom: 0; }
.mt-lg { margin-top: 1.5rem; }

.count-select {
  padding: 0.4rem 0.75rem;
  width: 80px;
}

.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.diff-btn {
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.diff-btn.active {
  background: var(--active-color);
  border-color: var(--active-color);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>

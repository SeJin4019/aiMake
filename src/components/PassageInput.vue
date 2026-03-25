<script setup>
import { computed } from 'vue'
import { FileText, Trash2 } from 'lucide-vue-next'

const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const wordCount = computed(() => {
  if (!props.modelValue) return 0
  return props.modelValue.trim().split(/\s+/).filter(word => word.length > 0).length
})

const handleInput = (e) => {
  emit('update:modelValue', e.target.value)
}

const clearText = () => {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="card passage-container">
    <div class="passage-header">
      <div class="flex items-center gap-sm">
        <FileText :size="18" class="text-primary" />
        <span class="font-bold">English Passage</span>
      </div>
      <div class="flex items-center gap-md">
        <span class="badge" :class="{ 'badge-active': wordCount > 0 }">
          {{ wordCount }} words
        </span>
        <button v-if="modelValue" @click="clearText" class="btn-icon" title="Clear text">
          <Trash2 :size="16" />
        </button>
      </div>
    </div>
    
    <textarea
      :value="modelValue"
      @input="handleInput"
      placeholder="Paste your English passage here..."
      class="passage-textarea"
    ></textarea>
    
    <div v-if="!modelValue" class="passage-hint">
      <p>Tip: Questions are generated based on the context of this text.</p>
    </div>
  </div>
</template>

<style scoped>
.passage-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: var(--radius);
  transition: transform 0.2s;
}

.passage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.passage-textarea {
  width: 100%;
  min-height: 250px;
  resize: vertical;
  line-height: 1.6;
  font-size: 1.1rem;
  padding: 1rem;
  border: 1px solid var(--border);
  background: #fdfdfd;
}

.font-bold { font-weight: 600; }
.flex { display: flex; }
.items-center { align-items: center; }
.gap-sm { gap: 0.5rem; }
.gap-md { gap: 1rem; }

.badge {
  background: #f1f5f9;
  color: var(--text-muted);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.badge-active {
  background: rgba(79, 70, 229, 0.1);
  color: var(--primary);
}

.btn-icon {
  background: transparent;
  color: var(--text-muted);
  padding: 0.4rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.btn-icon:hover {
  background: #fee2e2;
  color: #ef4444;
}

.passage-hint {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-style: italic;
}
</style>

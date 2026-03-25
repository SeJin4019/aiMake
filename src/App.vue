<script setup>
import { ref, reactive, computed } from 'vue'
import { Plus, Settings, FileText, Download, Sparkles, Languages, Hash, ListOrdered, Edit3, Type } from 'lucide-vue-next'
import PassageInput from './components/PassageInput.vue'
import QuestionSettings from './components/QuestionSettings.vue'
import QuestionList from './components/QuestionList.vue'
import { generateQuestions } from './services/QuestionGenerator'
import { exportToDocx, exportToPdf } from './services/Exporter'
import confetti from 'canvas-confetti'

const passage = ref('')
const apiKey = ref(localStorage.getItem('gemini_api_key') || '')
const selectedModel = ref(localStorage.getItem('gemini_model') || 'gemini-1.5-flash')
const isGenerating = ref(false)
const generatedQuestions = ref([])

const settings = reactive({
  types: ['main-idea-ko', 'main-idea-en', 'blank', 'insertion', 'ordering', 'descriptive'],
  selectedTypes: ['main-idea-ko', 'blank'],
  countPerType: 1,
  difficulty: 'high' // 'middle', 'high', 'csat'
})

const handleGenerate = async () => {
  if (!passage.value.trim() || settings.selectedTypes.length === 0) return
  if (!apiKey.value) {
    alert('AI 사용을 위해 Gemini API Key를 입력해 주세요.');
    return;
  }
  
  // 저장
  localStorage.setItem('gemini_api_key', apiKey.value);
  localStorage.setItem('gemini_model', selectedModel.value);

  isGenerating.value = true
  try {
    const results = await generateQuestions(passage.value, settings, apiKey.value, selectedModel.value)
    generatedQuestions.value = results
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4f46e5', '#10b981', '#3b82f6']
    })
  } catch (error) {
    console.error('Generation failed:', error)
    alert(`문제 생성 중 오류가 발생했습니다.\n\n내용: ${error.message}\n\n도움말:\n1. API Key가 올바른지 확인해 주세요.\n2. 인터넷 연결 상태를 확인해 주세요.\n3. 모델을 'Gemini 1.0 Pro'로 바꿔서 다시 시도해 보세요.`)
  } finally {
    isGenerating.value = false
  }
}

const handleExport = async (format) => {
  if (generatedQuestions.value.length === 0) return
  
  if (format === 'docx') {
    await exportToDocx(generatedQuestions.value, passage.value)
  } else {
    await exportToPdf(generatedQuestions.value, passage.value)
  }
}
</script>

<template>
  <header class="glass sticky-nav">
    <div class="container nav-content">
      <div class="logo">
        <div class="logo-icon">
          <Sparkles class="icon-primary" />
        </div>
        <h1>English Exam AI</h1>
      </div>
      <div v-if="generatedQuestions.length > 0" class="actions fade-in">
        <button @click="handleExport('docx')" class="btn-outline">
          <Download :size="18" /> DOCX
        </button>
        <button @click="handleExport('pdf')" class="btn-primary">
          <Download :size="18" /> PDF
        </button>
      </div>
    </div>
  </header>

  <main class="container">
    <div class="grid-layout">
      <!-- Sidebar / Settings -->
      <aside class="sidebar fade-in">
        <section class="card">
          <div class="section-header">
            <Settings :size="20" class="text-muted" />
            <h2>Settings</h2>
          </div>
          
          <QuestionSettings 
            v-model:selectedTypes="settings.selectedTypes"
            v-model:countPerType="settings.countPerType"
            v-model:difficulty="settings.difficulty"
          />

          <div class="mt-md">
            <label class="section-label">Gemini API Key</label>
            <input 
              v-model="apiKey" 
              type="password" 
              placeholder="Enter your API Key..." 
              class="w-full mt-sm api-input"
            />
            <p class="text-xs text-muted mt-sm">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" class="link">무료 API 키 발급받기</a>
            </p>
            <p class="text-xs text-muted mt-sm" style="font-size: 0.7rem; opacity: 0.8;">
              * 본 서비스는 사용자의 API 키를 서버에 저장하지 않으며 브라우저에만 보관합니다.
            </p>
          </div>

          <div class="mt-md">
            <label class="section-label">AI Model</label>
            <select v-model="selectedModel" class="w-full mt-sm api-input">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (최신)</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (표준)</option>
              <option value="gemini-pro-latest">Gemini Pro Latest</option>
              <option value="gemini-pro">Gemini 1.0 Pro</option>
            </select>
          </div>

          <button 
            @click="handleGenerate" 
            class="btn-primary w-full mt-lg"
            :class="{ 'loading': isGenerating }"
            :disabled="!passage.trim() || settings.selectedTypes.length === 0 || isGenerating"
          >
            <template v-if="isGenerating">
              <span class="loader"></span> 문제 생성 중...
            </template>
            <template v-else>
              <Sparkles :size="20" /> 문제 생성하기
            </template>
          </button>
        </section>
      </aside>

      <!-- Main Content -->
      <div class="content fade-in">
        <PassageInput v-model="passage" />
        
        <div v-if="generatedQuestions.length > 0" class="mt-xl">
          <div class="section-header mb-md">
            <FileText :size="22" class="text-muted" />
            <h2>Preview Questions</h2>
          </div>
          <QuestionList :questions="generatedQuestions" />
        </div>

        <div v-else-if="!isGenerating" class="empty-state">
          <div class="empty-icon">
            <Edit3 :size="48" class="text-muted" />
          </div>
          <h3>Ready to start?</h3>
          <p>지문을 입력하고 옵션을 선택하여 Gemini AI로 다양한 문제를 생성해 보세요.</p>
        </div>

        <div v-if="isGenerating" class="generating-state">
          <div class="spinner"></div>
          <p>Gemini AI가 지문을 분석하고 문제를 생성하고 있습니다...</p>
        </div>
      </div>
    </div>
  </main>

  <footer class="mt-auto py-lg text-center text-muted">
    <p>&copy; 2026 English Exam AI. Powered by Google Gemini.</p>
  </footer>
</template>

<style>
@import './assets/main.css';

.sticky-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem !important;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  background: rgba(79, 70, 229, 0.1);
  padding: 0.5rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-primary {
  color: var(--primary);
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.grid-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2rem;
  align-items: start;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.mt-lg { margin-top: 1.5rem; }
.mt-xl { margin-top: 3rem; }
.mb-md { margin-bottom: 1rem; }
.w-full { width: 100%; }

.sidebar {
  position: sticky;
  top: 90px;
}

.empty-state, .generating-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

/* Spinner */
.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(79, 70, 229, 0.1);
  border-left-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loader {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@media (max-width: 900px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>

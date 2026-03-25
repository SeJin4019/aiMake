import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // 상대 경로로 설정하여 어디서든 호스팅 가능하게 함
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})

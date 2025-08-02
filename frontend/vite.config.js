// frontend/vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'; // Импортируем плагин Vue

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(), // Используем плагин Vue
  ],
  // Если у вас есть другие конфигурации, они могут быть здесь.
  // Например, для CORS прокси, если понадобится:
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3900', // URL вашего бэкенда
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
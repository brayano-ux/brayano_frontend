import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/login': { target: 'http://localhost:3000', changeOrigin: true },
      '/register': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/organizations': { target: 'http://localhost:3000', changeOrigin: true },
      '/conversations': { target: 'http://localhost:3000', changeOrigin: true },
      '/ai-settings': { target: 'http://localhost:3000', changeOrigin: true },
      '/whatsapp': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})

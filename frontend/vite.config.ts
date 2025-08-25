import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In prod SPA lives under /ui/, dev runs at /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ui/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // single proxy for JSON API
      '/api': 'http://localhost:18080'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
}))

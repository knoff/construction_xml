import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { URL } from 'node:url'

// In prod SPA lives under /ui/, dev runs at /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ui/' : '/',
  plugins: [
    tailwind(),react()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
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

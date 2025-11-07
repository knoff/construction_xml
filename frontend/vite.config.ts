import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { visualizer } from "rollup-plugin-visualizer";
import { fileURLToPath } from 'node:url'
import { URL } from 'node:url'

// In prod SPA lives under /ui/, dev runs at /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ui/' : '/',
  plugins: [
    tailwind(),react(),
    visualizer({ filename: "stats.html", gzipSize: true, brotliSize: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // гарантированно одна копия реакта во всей сборке
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  server: {
    port: 5173,
    proxy: {
      // single proxy for JSON API
      '/api': 'http://localhost:18080'
    }
  },
  build: {
    sourcemap: true, // Временно для отладки
    minify: false,   // Временно для отладки
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Минимально и безопасно: только то, что точно нужно
          // Только безопасный чанк для реакт-ядра
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
            return "react-core";
          }
          // Календарь (и его транзитивы) — в отдельный ленивый чанк
          if (id.includes("react-day-picker")) {
            return "daypicker";
          }
          // Остальное — пусть решает Rollup сам
        },
      },
    },
    // необязательно, но помогает исключить дубли и гарантирует предсборку реакта
    // чтобы он не разъехался по нескольким чанкам
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    chunkSizeWarningLimit: 900,
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  // гарантируем единственную копию реакта на этапе предсборки
  optimizeDeps: {
    // Подсказать предсборщику: эти пакеты собрать единообразно
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-router",
      "react-router-dom",
      "react-table",
      "@tanstack/react-table",
    ],
    // на всякий: не исключаем реакт из предсборки
    exclude: [],
  },
}))

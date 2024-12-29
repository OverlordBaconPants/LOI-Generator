import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Add base URL configuration for deployment
  base: '/',
  build: {
    // Generate sourcemaps for better debugging
    sourcemap: true,
    // Optimize build
    minify: 'terser',
    // Configure output directory
    outDir: 'dist',
  }
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/geoserver': {
        target: 'https://192.168.2.72',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/geoserver/, '/geoserver')
      }
    }
  },
  build: {
    outDir: '../backend/wwwroot',
    emptyOutDir: true
  }
})

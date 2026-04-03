import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api/auth': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/user': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/portfolio': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/transactions': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/watchlist': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/alerts': { target: 'http://localhost:5001', changeOrigin: true },
      '/api': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
})

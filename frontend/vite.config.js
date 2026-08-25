import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
      '/api/auth':          { target: 'http://localhost:5001', changeOrigin: true },
      '/api/user':          { target: 'http://localhost:5001', changeOrigin: true },
      '/api/portfolio':     { target: 'http://localhost:5001', changeOrigin: true },
      '/api/transactions':  { target: 'http://localhost:5001', changeOrigin: true },
      '/api/watchlist':     { target: 'http://localhost:5001', changeOrigin: true },
      '/api/alerts':        { target: 'http://localhost:5001', changeOrigin: true },
      '/api/tax':           { target: 'http://localhost:5001', changeOrigin: true },
      '/api/goals':         { target: 'http://localhost:5001', changeOrigin: true },
      '/api/bills':         { target: 'http://localhost:5001', changeOrigin: true },
      '/api/notifications':     { target: 'http://localhost:5001', changeOrigin: true },
      '/api/planned-payments':  { target: 'http://localhost:5001', changeOrigin: true },
      '/api/shopping-lists':    { target: 'http://localhost:5001', changeOrigin: true },
      '/api/warranties':        { target: 'http://localhost:5001', changeOrigin: true },
      '/api/loyalty-cards':     { target: 'http://localhost:5001', changeOrigin: true },
      '/api/debts':             { target: 'http://localhost:5001', changeOrigin: true },
      '/api/accounts':          { target: 'http://localhost:5001', changeOrigin: true },
      '/api':                   { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  server: {
    proxy: {
      '/firestore': {
        target: 'https://firestore.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/firestore/, '')
      }
    }
  }
})
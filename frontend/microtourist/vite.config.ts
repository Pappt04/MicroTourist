import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/stakeholders': {
        target: 'http://localhost:8080',
        rewrite: path => path.replace(/^\/api\/stakeholders/, ''),
      },
      '/api/blog': {
        target: 'http://localhost:8081',
        rewrite: path => path.replace(/^\/api\/blog/, ''),
      },
      '/api/followers': {
        target: 'http://localhost:8083',
        rewrite: path => path.replace(/^\/api\/followers/, ''),
      },
      '/api/purchase': {
        target: 'http://localhost:8082',
        rewrite: path => path.replace(/^\/api\/purchase/, ''),
      },
      '/api/tours': {
        target: 'http://localhost:8084',
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
})

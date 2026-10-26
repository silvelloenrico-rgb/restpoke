import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In sviluppo le chiamate /api vanno al Worker locale (npm run dev:api).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8787' } },
})

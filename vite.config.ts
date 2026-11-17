import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// base relativa: funciona no GitHub Pages em qualquer subcaminho (/<repo>/)
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})

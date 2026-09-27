import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rutas relativas: funciona en GitHub Pages (/PhotoSwipe/) y en la app nativa
  base: './',
})

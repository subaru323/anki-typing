import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,   // 0.0.0.0 にバインド → LAN 内の他端末からアクセス可
    port: 5173,
  },
})

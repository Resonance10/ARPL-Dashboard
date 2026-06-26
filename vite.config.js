import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    host: '0.0.0.0', // Exposes Vite to your local network
    port: 5174,
    https: {
      cert: fs.readFileSync(path.join(__dirname, 'ssl', '192.168.7.65+3.pem')),
      key: fs.readFileSync(path.join(__dirname, 'ssl', '192.168.7.65+3-key.pem')),
    },
    proxy: {
      // Proxies all /api requests to your Express backend
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})


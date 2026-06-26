import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `--mode http` disables HTTPS (used for the local Claude preview, whose
  // browser doesn't trust the mkcert CA). Normal `npm run dev` stays on HTTPS.
  const useHttps = mode !== 'http'

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    server: {
      host: '0.0.0.0', // Exposes Vite to your local network
      port: 5174,
      ...(useHttps && {
        https: {
          cert: fs.readFileSync(path.join(__dirname, 'ssl', '192.168.7.65+3.pem')),
          key: fs.readFileSync(path.join(__dirname, 'ssl', '192.168.7.65+3-key.pem')),
        },
      }),
      proxy: {
        // Proxies all /api requests to your Express backend
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
  }
})


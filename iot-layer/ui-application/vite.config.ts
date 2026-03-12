import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const host = env.VITE_DEV_HOST || '0.0.0.0'
  const port = Number(env.VITE_DEV_PORT || 5173)
  const proxyTarget = env.VITE_PROXY_TARGET || `http://127.0.0.1:${env.PORT || 5174}`

  return {
    plugins: [react()],
    server: {
      host,
      port,
      proxy: {
        '/api': proxyTarget,
      },
    },
  }
})

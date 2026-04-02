import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.VITE_BACKEND_PORT ?? '3000'
  const backendUrl = `http://localhost:${backendPort}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/users': backendUrl,
        '/conversations': backendUrl,
      },
    },
  }
})

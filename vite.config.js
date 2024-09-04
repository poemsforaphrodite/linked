import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    define: {
      'process.env': env
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://linked-api.vercel.app/',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
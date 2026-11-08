import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Pick My Teacher',
        short_name: 'Pick My Teacher',
        description: 'Find and choose the right English teacher.',
        theme_color: '#182334',
        background_color: '#182334',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pick-my-teacher-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
})

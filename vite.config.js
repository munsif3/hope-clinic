import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.png', 'logo-192.png', 'logo-512.png'],
      manifest: {
        name: 'Hope Clinic',
        short_name: 'Hope Clinic',
        description: 'Simple and reliable Unani Clinic Management System',
        theme_color: '#0ea5e9',
        background_color: '#f8fafc',
        icons: [
          {
            src: '/logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Clinical requests are handled by the authenticated Firestore SDK.
        // The service worker caches the application shell only.
        runtimeCaching: [],
        importScripts: ['/sw-cleanup.js'],
      },
      devOptions: {
        enabled: false
      }
    })
  ],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Pousse — journal de symptômes',
        short_name: 'Pousse',
        description: 'Notez vos épisodes jour après jour, suivez vos tendances et préparez vos rendez-vous médicaux.',
        theme_color: '#4F7757',
        background_color: '#D9E3DA',
        display: 'standalone',
        lang: 'fr',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // L'API (sauvegarde en ligne) n'est jamais servie depuis le cache
        navigateFallbackDenylist: [/^\/api\//],
        // Rappel du soir : réception des notifications push et ouverture de l'app
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-weather',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  // Développement avec la sauvegarde en ligne : VITE_API_URL=/api npm run dev
  // (API lancée à part : cd server && npm run dev)
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})

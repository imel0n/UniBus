import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Lets the service worker be tested with `npm run dev`, not just after a build.
      devOptions: { enabled: true },
      manifest: {
        name: 'UniBus',
        short_name: 'UniBus',
        description: 'Bus arrival times for nearby and favourite stops.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          // Padded copy so Android's circle/squircle mask can't clip the bus.
          {
            src: '/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Serve index.html for any navigation so client-side routes work offline.
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    // Required for the Cloudflare tunnel (npm run dev:tunnel) to reach the dev server.
    allowedHosts: ['unibusdev.hejieming.com'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

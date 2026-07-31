import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix so non-VITE_ vars (which must stay server-side) are readable here.
  const env = loadEnv(mode, process.cwd(), '')

  if (!env.LTA_DATAMALL_KEY) {
    console.warn('[vite] LTA_DATAMALL_KEY is missing from .env.local — /api/lta requests will fail.')
  }

  return {
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
          // ...except API paths, which must always reach the proxy.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Map tiles are immutable, so areas already visited stay usable offline.
              urlPattern: /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'carto-tiles',
                expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
                // Tiles come back opaque (status 0) because they're cross-origin.
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    server: {
      // Required for the Cloudflare tunnel (npm run dev:tunnel) to reach the dev server.
      allowedHosts: ['unibusdev.hejieming.com'],
      proxy: {
        // DataMall sends no CORS headers and the key must never reach the browser,
        // so all LTA calls go through here with the header injected server-side.
        '/api/lta': {
          target: 'https://datamall2.mytransport.sg',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/lta/, '/ltaodataservice'),
          headers: { AccountKey: env.LTA_DATAMALL_KEY },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})

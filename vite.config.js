import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      manifest: {
        name: 'AGENDA IRACAMBI',
        short_name: 'IRACAMBI',
        description: 'Agenda de atividades do Colegiado IRACAMBI',
        theme_color: '#1a3b2e',
        icons: [
          { src: '/logo.webp', sizes: '192x192', type: 'image/webp' },
          { src: '/logo.webp', sizes: '512x512', type: 'image/webp' },
        ],
      },
    }),
  ],
});
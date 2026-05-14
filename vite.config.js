import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.webp'],
      manifest: {
        name: 'AGENDA IRACAMBI',
        short_name: 'IRACAMBI',
        description: 'Agenda de atividades do Colegiado IRACAMBI',
        theme_color: '#1a3b2e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/logo.webp',
            sizes: '192x192',
            type: 'image/webp',
          },
          {
            src: '/logo.webp',
            sizes: '512x512',
            type: 'image/webp',
          },
        ],
      },
    }),
  ],
});
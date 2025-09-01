import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  server: {
    port: 4321,
    host: true
  },
  vite: {
    server: {
      proxy: {
        '/api': 'http://localhost:3000'
      }
    },
    define: {
      global: 'globalThis'
    }
  },
  security: {
    checkOrigin: false
  }
});
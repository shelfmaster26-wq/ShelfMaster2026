import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const replitDomain = process.env.REPLIT_DEV_DOMAIN;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: replitDomain
      ? { protocol: 'wss', host: replitDomain, clientPort: 443 }
      : true,
  },
});

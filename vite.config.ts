import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    /** If 5173 is busy, use the next free port (see terminal for the real URL). */
    strictPort: false,
    /** Explicit IPv4 avoids some Windows setups where `localhost` resolves oddly. */
    host: '127.0.0.1',
    open: '/#/',
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Optional: Use Node.js API in the Renderer process
      renderer: {},
    }),
    renderer(),
  ],
  build: {
    rollupOptions: {
      external: ['electron']
    }
  }
});

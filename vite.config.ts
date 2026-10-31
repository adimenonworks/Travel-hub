import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works at any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Country flags stay separate files, fetched only when shown, instead of all ~400 being baked into the app.
    assetsInlineLimit: (file) => (file.includes('/assets/flags/') ? false : undefined),
  },
});

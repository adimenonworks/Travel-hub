import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// Relative base so the build works at any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  // The web build's version, shown at the bottom of You (the iPhone app shows its own version and build)
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    // Country flags stay separate files, fetched only when shown, instead of all ~400 being baked into the app.
    assetsInlineLimit: (file) => (file.includes('/assets/flags/') ? false : undefined),
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works at any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
});

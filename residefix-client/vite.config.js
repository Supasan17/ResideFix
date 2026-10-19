import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // './' makes asset paths relative so the build works from the GitHub Pages
  // sub-path (/ResideFix/) as well as from the Docker nginx root.
  base: './',
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});

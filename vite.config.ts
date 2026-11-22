import { defineConfig } from 'vite';

// Relative base so the build works both locally and on GitHub Pages (/the-last-ward/).
export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
  build: {
    rollupOptions: {
      input: { main: 'index.html', styles: 'styles.html' },
    },
  },
  test: { environment: 'node' },
} as never);

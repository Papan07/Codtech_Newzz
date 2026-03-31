import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/gnews-api': {
        target: 'https://gnews.io/api/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gnews-api/, '')
      }
    }
  }
});

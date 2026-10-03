import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: { target: 'es2022', rollupOptions: { output: { onlyExplicitManualChunks: true, manualChunks(id) {
    if (id.replace(/\\/g, '/').includes('/node_modules/svelte/')) return 'svelte';
    if (id.replace(/\\/g, '/').includes('/src/lib/effects/')) return 'effects';
  } } } },
});

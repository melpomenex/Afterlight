import { defineConfig } from 'vite';

// Standalone Downhill Mayhem dev/build entry. The hosted Afterlight build
// imports the game modules from the root project (root owns the shared
// `three`), so this config only governs the standalone shell.
export default defineConfig({
  server: { port: 5174, strictPort: true, host: true },
  build: { target: 'es2022', sourcemap: true },
});

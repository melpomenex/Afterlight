import { defineConfig } from 'vite';

export default defineConfig({
  // decode.worker.js dynamically imports the WASM core; ES modules allow that split.
  worker: {
    format: 'es',
  },
});

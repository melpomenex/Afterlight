import { defineConfig } from 'vite';

export default defineConfig({
  // decode.worker.js dynamically imports the WASM core; ES modules allow that split.
  worker: {
    format: 'es',
  },
  build: {
    // games/kart-royale (lazily imported activity code) builds against
    // es2022 in its own package; keep the root build on the same target.
    target: 'es2022',
  },
});

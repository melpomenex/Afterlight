/**
 * Lazy-loadable re-export of the canonical Summit Run course JSON — the
 * Alpine Rush port (integrate-ssxtricky-snowboard 3.2).
 * Vite transforms static JSON imports to JS modules; dynamic `import()`
 * of this file avoids brittle import-attribute handling in dev.
 */
import courseDocument from './course-alpine-rush.json';

export default courseDocument;

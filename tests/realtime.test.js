// Bridge so `npm test` (node --test tests/*.test.js) also runs the realtime
// suites without modifying the root test script. See
// openspec/changes/add-realtime-binary-protocol and
// add-realtime-worker-pipeline tasks.
import './realtime/protocol.test.js';
import './realtime/pipeline.test.js';
import './realtime/fuzz.test.js';
// wasm-decoder fallback contract (add-realtime-wasm-decoder task 4.2) — the
// suite lives beside the glue it tests in benchmarks/realtime/tests/.
import '../benchmarks/realtime/tests/wasm-fallback.test.js';
import './realtime/gpu-backend.test.js';
import './realtime/live-backend.test.js';
import './realtime/gates.test.js';
import './realtime/gateway-binary-convergence.test.js';
import './realtime/node-binary-flush.test.js';
import './realtime/live-avatar-path.test.js';
import './realtime/wiring.test.js';

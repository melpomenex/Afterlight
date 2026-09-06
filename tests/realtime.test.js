// Bridge so `npm test` (node --test tests/*.test.js) also runs the realtime
// suites without modifying the root test script. See
// openspec/changes/add-realtime-binary-protocol and
// add-realtime-worker-pipeline tasks.
import './realtime/protocol.test.js';
import './realtime/pipeline.test.js';

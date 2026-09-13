/**
 * Theater Environment system entry point: registers every environment
 * builder and re-exports the runtime factory. Importing this module once
 * (from main.js) is what makes the shared manifest's environment ids
 * resolvable — an unregistered id is a named error, never fallback scenery.
 */

import { registerEnvironmentBuilder } from './registry.js';
import { buildCoastal } from './coastal.js';
import { buildRainforest } from './rainforest.js';
import { buildAlpine } from './alpine.js';
import { buildDesert } from './desert.js';
import { buildRedwood } from './redwood.js';
import { buildCloud } from './cloud.js';

registerEnvironmentBuilder('coastal', buildCoastal);
registerEnvironmentBuilder('rainforest', buildRainforest);
registerEnvironmentBuilder('alpine', buildAlpine);
registerEnvironmentBuilder('desert', buildDesert);
registerEnvironmentBuilder('redwood', buildRedwood);
registerEnvironmentBuilder('cloud', buildCloud);

export { createTheaterEnvironmentRuntime } from './runtime.js';
export { getTheaterEnvironment, THEATER_ENVIRONMENTS, THEATER_ENVIRONMENT_IDS } from '../../shared/theaterEnvironments.js';

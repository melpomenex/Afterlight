/**
 * Crafted-mountain course documents (Downhill Mayhem
 * integrate-multiplayer-downhill-mayhem-arcade 4.1). Vite transforms the
 * static JSON imports to JS modules; the Daily document is generated and
 * delivered server-side, never by this module.
 *
 * Import this only behind the activity's lazy boundary so bystanders never
 * download the baked terrain.
 */
import classic from './courses/classic.json';
import timber from './courses/timber.json';
import rock from './courses/rock.json';

export const CRAFTED_COURSE_DOCUMENTS = Object.freeze({ classic, timber, rock });

/** Returns the committed document for a crafted mountain, or null for daily. */
export function craftedCourseDocument(mountain) {
  return CRAFTED_COURSE_DOCUMENTS[mountain] ?? null;
}

export const EMOTES = Object.freeze([
  { id: 'wave', label: 'Hello there', icon: '👋', hint: 'A little warmth goes a long way' },
  { id: 'dance', label: 'Rust shuffle', icon: '♫', hint: 'Still got some rhythm in these gears' },
  { id: 'cheer', label: 'We did it!', icon: '✦', hint: 'Small repairs. Big celebrations.' },
  { id: 'heart', label: 'Much love', icon: '♡', hint: 'For your favorite fellow wanderer' },
  { id: 'bow', label: 'After you', icon: '❧', hint: 'A gracious little thank-you' },
  { id: 'shrug', label: 'Who knows?', icon: '¯\\_(ツ)_/¯', hint: 'Some mysteries can wait' },
]);
export const isEmote = id => EMOTES.some(e => e.id === id);
export const EMOTE_DURATION = 3.2;
// Clockwise, with the first choice at twelve o’clock. Center cancels.
export function emoteSector(x, y, deadZone = 44) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < deadZone) return -1;
  return Math.floor(((Math.atan2(y, x) + Math.PI / 2 + Math.PI / 6 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 3));
}

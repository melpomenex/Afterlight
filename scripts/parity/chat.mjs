/**
 * Parity fixtures for server/chat.js (cleanText, raw 600 / sanitized 400 caps,
 * /me, /msg, /help, unknown command parsing, error strings).
 */

import { cleanText, parseChat, CHAT_HARD_LIMIT, CHAT_MAX_CHARS } from '../../server/chat.js';
import { recordCall } from './harness.mjs';

function build() {
  const cases = [];

  // --- cleanText: control characters, whitespace-run collapse, trim ---
  cases.push(recordCall({ id: 'clean-text/empty', fn: cleanText, args: [''] }));
  cases.push(recordCall({ id: 'clean-text/null', fn: cleanText, args: [null] }));
  cases.push(recordCall({ id: 'clean-text/undefined', fn: cleanText, args: [undefined] }));
  cases.push(recordCall({ id: 'clean-text/number', fn: cleanText, args: [123] }));
  cases.push(recordCall({ id: 'clean-text/control-null', fn: cleanText, args: ['a\u0000b'] }));
  cases.push(recordCall({ id: 'clean-text/control-bell', fn: cleanText, args: ['alert\u0007!'] }));
  cases.push(recordCall({ id: 'clean-text/control-vertical-tab', fn: cleanText, args: ['a\u000Bb'] }));
  cases.push(recordCall({ id: 'clean-text/control-del', fn: cleanText, args: ['a\u007Fb'] }));
  cases.push(recordCall({ id: 'clean-text/control-range', fn: cleanText, args: ['a\u0001\u0002\u0003\u0004\u0005\u0006\u0008\u000E\u001Fz'] }));
  cases.push(recordCall({ id: 'clean-text/whitespace-newlines', fn: cleanText, args: ['a\r\nb\nc'] }));
  cases.push(recordCall({ id: 'clean-text/whitespace-tabs-spaces', fn: cleanText, args: ['a\t\t  b\t  c'] }));
  cases.push(recordCall({ id: 'clean-text/whitespace-trim', fn: cleanText, args: ['   hello world   \n\t  '] }));
  cases.push(recordCall({ id: 'clean-text/whitespace-cr-only', fn: cleanText, args: ['a\rb\rc'] }));
  cases.push(recordCall({ id: 'clean-text/multibyte-preserved', fn: cleanText, args: ['Hello 🌱  moss & stone! 🌧️'] }));

  // --- parseChat: caps and validation ---
  cases.push(recordCall({ id: 'chat/error-empty', fn: parseChat, args: [''] }));
  cases.push(recordCall({ id: 'chat/error-whitespace', fn: parseChat, args: ['   \t\n  '] }));
  cases.push(recordCall({ id: 'chat/error-control-only', fn: parseChat, args: ['\u0000\u0001\u0002'] }));
  cases.push(recordCall({ id: 'chat/raw-cap-exact-600', fn: parseChat, args: ['a'.repeat(600)] }));
  cases.push(recordCall({ id: 'chat/raw-cap-over-601', fn: parseChat, args: ['a'.repeat(601)] }));
  cases.push(recordCall({ id: 'chat/raw-cap-multibyte-600', fn: parseChat, args: ['é'.repeat(600)] }));
  cases.push(recordCall({ id: 'chat/raw-cap-multibyte-601', fn: parseChat, args: ['é'.repeat(601)] }));
  cases.push(recordCall({ id: 'chat/sanitize-cap-exact-400', fn: parseChat, args: ['x'.repeat(400)] }));
  cases.push(recordCall({ id: 'chat/sanitize-cap-slice-500', fn: parseChat, args: ['y'.repeat(500)] }));
  cases.push(recordCall({ id: 'chat/multibyte-boundary-2byte', fn: parseChat, args: ['a'.repeat(399) + 'é'] }));
  cases.push(recordCall({ id: 'chat/multibyte-boundary-3byte', fn: parseChat, args: ['a'.repeat(399) + '中'] }));
  cases.push(recordCall({ id: 'chat/multibyte-boundary-astral-exact', fn: parseChat, args: ['a'.repeat(398) + '🌟'] }));
  cases.push(recordCall({ id: 'chat/multibyte-boundary-astral-surplus', fn: parseChat, args: ['a'.repeat(398) + '🌟🌟'] }));

  // --- parseChat: commands (/me, /msg, /help, unknown) ---
  const defaultRoster = { sender: 'Wren', players: ['Mossy'], ircNicks: ['IrcRelay'] };

  cases.push(recordCall({ id: 'chat/cmd-me-valid', fn: parseChat, args: ['/me smiles warmly', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-me-bare', fn: parseChat, args: ['/me', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-me-empty-arg', fn: parseChat, args: ['/me    ', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-valid-player', fn: parseChat, args: ['/msg Mossy hello there', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-case-insensitive', fn: parseChat, args: ['/msg mossy hello', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-query-synonym', fn: parseChat, args: ['/query Mossy secret message', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-valid-irc', fn: parseChat, args: ['/msg IrcRelay hello IRC', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-bare', fn: parseChat, args: ['/msg', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-missing-body', fn: parseChat, args: ['/msg Mossy', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-self', fn: parseChat, args: ['/msg Wren hello self', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-self-case', fn: parseChat, args: ['/msg WREN hello self', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-msg-absent-target', fn: parseChat, args: ['/msg Ghost boo', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-help', fn: parseChat, args: ['/help', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-unknown', fn: parseChat, args: ['/dance', defaultRoster] }));
  cases.push(recordCall({ id: 'chat/cmd-unknown-with-args', fn: parseChat, args: ['/shout hello', defaultRoster] }));

  // --- parseChat: normal messages ---
  cases.push(recordCall({ id: 'chat/msg-regular', fn: parseChat, args: ['Hello from the courtyard!'] }));
  cases.push(recordCall({ id: 'chat/msg-regular-whitespace', fn: parseChat, args: ['  Hello   from   the   courtyard!  '] }));

  return cases;
}

export const chatCases = build();
export const chatHazards = {
  'control-chars': ['clean-text/control-*'],
  'whitespace-collapse': ['clean-text/whitespace-*'],
  'caps-truncation': ['chat/raw-cap-*', 'chat/sanitize-cap-*', 'chat/multibyte-*'],
  'command-parsing': ['chat/cmd-*'],
  'error-strings': ['chat/error-*'],
};

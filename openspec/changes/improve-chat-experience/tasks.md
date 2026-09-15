## 1. Emoji System & Dataset

- [x] 1.1 Create curated Unicode emoji catalog `src/ui/chat/emojiData.js` with categories, shortcodes, keywords, search index, and verify with tests in `tests/chat-emoji.test.js`
- [x] 1.2 Implement accessible native Unicode Emoji Picker `src/ui/chat/emojiPicker.js` with category tabs, search input, recent emoji row, keyboard grid navigation, and verify with tests in `tests/chat-emoji.test.js`

## 2. Contextual Autocomplete

- [x] 2.1 Implement contextual autocomplete popover `src/ui/chat/autocomplete.js` for `:emoji` and `@mention` suggestions with arrow-key navigation and cursor insertion, and verify with tests in `tests/chat-autocomplete.test.js`

## 3. Personalization & Theming

- [x] 3.1 Implement chat preferences model and token applicator `src/ui/chat/chatPreferences.js` with 6 presets, layout/density/font/background dimensions, world theme integration, and verify with tests in `tests/chat-personalization.test.js`
- [x] 3.2 Implement Appearance Settings modal `src/ui/chat/appearanceModal.js` with interactive Live Preview, reset to defaults, and persistent localStorage sync, and verify with unit tests

## 4. Chat Panel Overhaul

- [x] 4.1 Overhaul `src/ui/chatPanel.js` with message grouping, layouts (Comfortable, Compact, Bubble), avatar badges, reply quotation, and mention highlighting
- [x] 4.2 Implement scroll anchoring and unread jump pill (`↓ N new messages`) in `src/ui/chatPanel.js`
- [x] 4.3 Integrate emoji picker button, autocomplete, appearance settings button, and draft preservation in `src/ui/chatPanel.js` and `index.html`

## 5. Visual Systems & CSS Tokens

- [x] 5.1 Add semantic `--chat-*` design tokens, layout modes, emoji picker styles, autocomplete popover styles, and world-matching theme overrides in `src/style.css`

## 6. Verification & Quality Assurance

- [x] 6.1 Update and expand `tests/chat-panel.test.js` covering grouped messages, layouts, scroll anchoring, replies, mentions, and focus safety
- [x] 6.2 Run full test suite `npm test` and build check `npm run build` to verify all tests pass with zero regressions
